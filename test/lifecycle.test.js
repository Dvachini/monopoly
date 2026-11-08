const test = require('node:test');
const assert = require('node:assert');
const { startServer, once } = require('./helpers');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fast = { graceMs: 300, sweepMs: 50 };

// Room with a host and one guest; started when `start` is true
async function pair(srv, start) {
  const host = await srv.connect();
  let p = once(host, 'room-created');
  host.emit('create-room', { playerName: 'Host', playerColor: 'red' });
  const created = await p;
  const guest = await srv.connect();
  p = once(guest, 'room-joined');
  guest.emit('join-room', {
    roomCode: created.roomCode,
    playerName: 'Bob',
    playerColor: 'blue',
  });
  const joined = await p;
  if (start) {
    host.emit('start-game');
    await once(guest, 'game-started');
    const synced = once(guest, 'state-synced');
    host.emit('sync-state', { gameState: { turn: 1, marker: 'a' } });
    await synced;
  }
  return { host, guest, created, joined };
}

async function rejoin(srv, roomCode, playerIndex, token) {
  const s = await srv.connect();
  const result = Promise.race([
    once(s, 'rejoin-success'),
    once(s, 'rejoin-error').then((e) => ({ error: e })),
  ]);
  s.emit('rejoin-room', { roomCode, playerIndex, token });
  return { socket: s, result: await result };
}

test('room survives everyone leaving, rejoin inside grace works', async () => {
  const srv = await startServer({ graceMs: 5000, sweepMs: 50 });
  const { host, guest, created, joined } = await pair(srv, true);
  host.close();
  guest.close();
  await wait(200);
  const r = await rejoin(srv, created.roomCode, 2, joined.token);
  assert.strictEqual(r.result.gameState.marker, 'a');
  assert.strictEqual(r.result.playerIndex, 2);
  await srv.close();
});

test('room is gone after the grace sweep', async () => {
  const srv = await startServer(fast);
  const { host, guest, created, joined } = await pair(srv, true);
  host.close();
  guest.close();
  await wait(700);
  const r = await rejoin(srv, created.roomCode, 2, joined.token);
  assert.ok(r.result.error);
  await srv.close();
});

test('idle rooms are deleted after the TTL', async () => {
  const srv = await startServer({ ttlMs: 300, sweepMs: 50 });
  const { created } = await pair(srv, false);
  await wait(700);
  const late = await srv.connect();
  const err = once(late, 'join-error');
  late.emit('join-room', {
    roomCode: created.roomCode,
    playerName: 'L',
    playerColor: 'teal',
  });
  assert.match((await err).message, /not found/i);
  await srv.close();
});

test('lobby refresh with the token keeps the seat', async () => {
  const srv = await startServer({ graceMs: 5000, sweepMs: 50 });
  const { host, guest, created, joined } = await pair(srv, false);
  const gone = once(host, 'player-disconnected');
  guest.close();
  const left = await gone;
  assert.strictEqual(left.playerIndex, 2);

  // a new joiner cannot take the held seat
  const other = await srv.connect();
  const p = once(other, 'room-joined');
  other.emit('join-room', {
    roomCode: created.roomCode,
    playerName: 'Cat',
    playerColor: 'lime',
  });
  assert.strictEqual((await p).playerIndex, 3);

  const r = await rejoin(srv, created.roomCode, 2, joined.token);
  assert.strictEqual(r.result.playerIndex, 2);
  assert.strictEqual(r.result.gameState, null);
  assert.strictEqual(
    r.result.players.find((x) => x.index === 2).disconnected,
    false,
  );
  await srv.close();
});

test('a lobby seat is released after the grace', async () => {
  const srv = await startServer(fast);
  const { host, guest, created } = await pair(srv, false);
  const updates = [];
  host.on('room-updated', (u) => updates.push(u));
  guest.close();
  await wait(700);
  assert.strictEqual(updates[updates.length - 1].players.length, 1);

  const again = await srv.connect();
  const p = once(again, 'room-joined');
  again.emit('join-room', {
    roomCode: created.roomCode,
    playerName: 'Bob',
    playerColor: 'blue',
  });
  assert.strictEqual((await p).playerIndex, 2);
  await srv.close();
});

test('host passes to the next player, rejoining host retakes an empty seat', async () => {
  const srv = await startServer({ graceMs: 5000, sweepMs: 50 });
  const { host, guest, created, joined } = await pair(srv, true);

  const gone = once(guest, 'room-updated');
  host.close();
  assert.strictEqual((await gone).hostIndex, 2);

  // the old host rejoins while player 2 holds the host seat: stays 2
  const hostToken = created.token;
  const back = await rejoin(srv, created.roomCode, 1, hostToken);
  assert.strictEqual(back.result.hostIndex, 2);
  assert.strictEqual(back.result.isHost, false);

  // everyone leaves, the first rejoiner gets the empty host seat
  back.socket.close();
  guest.close();
  await wait(200);
  const r = await rejoin(srv, created.roomCode, 1, hostToken);
  assert.strictEqual(r.result.hostIndex, 1);
  assert.strictEqual(r.result.isHost, true);
  assert.ok(joined.token);
  await srv.close();
});

test('start-game needs two connected players', async () => {
  const srv = await startServer({ graceMs: 5000, sweepMs: 50 });
  const { host, guest } = await pair(srv, false);
  const gone = once(host, 'player-disconnected');
  guest.close();
  await gone;
  const err = once(host, 'start-error');
  host.emit('start-game');
  await err;
  await srv.close();
});

test('flooding is throttled and the server keeps serving', async () => {
  const srv = await startServer();
  const flooder = await srv.connect();
  const throttled = once(flooder, 'throttled');
  for (let i = 0; i < 200; i++) {
    flooder.emit('chat-message', { message: 'spam' });
  }
  await throttled;
  assert.ok(flooder.connected);

  const fine = await srv.connect();
  const p = once(fine, 'room-created');
  fine.emit('create-room', { playerName: 'Ok', playerColor: 'red' });
  await p;
  await srv.close();
});

test('repeated flooding gets the socket disconnected', async () => {
  const srv = await startServer({ throttleNotifyMs: 0 });
  const flooder = await srv.connect();
  const closed = once(flooder, 'disconnect');
  for (let i = 0; i < 200; i++) {
    flooder.emit('chat-message', { message: 'spam' });
  }
  await closed;
  await srv.close();
});

test('start compacts seats to 1..N and tells each socket its index', async () => {
  const srv = await startServer(fast);
  const { host, guest, created } = await pair(srv, false);
  const third = await srv.connect();
  const p = once(third, 'room-joined');
  third.emit('join-room', {
    roomCode: created.roomCode,
    playerName: 'Cat',
    playerColor: 'lime',
  });
  assert.strictEqual((await p).playerIndex, 3);

  // seat 2 leaves and is freed after the grace
  guest.close();
  await wait(700);

  const forHost = once(host, 'game-started');
  const forThird = once(third, 'game-started');
  host.emit('start-game');
  const h = await forHost;
  const t = await forThird;
  assert.deepStrictEqual(
    h.players.map((x) => x.index),
    [1, 2],
  );
  assert.strictEqual(h.players[1].name, 'Cat');
  assert.strictEqual(h.playerIndex, 1);
  assert.strictEqual(h.hostIndex, 1);
  assert.strictEqual(t.playerIndex, 2);

  // the server uses the new index: turn starts at 1, host hands over to 2,
  // then the old seat 3 (now 2) is on turn and can sync
  const seen = once(third, 'state-synced');
  host.emit('sync-state', { gameState: { turn: 2, marker: 'x' } });
  await seen;
  const back = once(host, 'state-synced');
  third.emit('sync-state', { gameState: { turn: 1, marker: 'y' } });
  assert.strictEqual((await back).gameState.marker, 'y');
  await srv.close();
});

test('the game starts on turn 1 even if the host seat moved', async () => {
  const srv = await startServer({ graceMs: 5000, sweepMs: 50 });
  const { host, guest, created } = await pair(srv, false);
  const started = once(guest, 'game-started');
  host.emit('start-game');
  await started;
  // host leaves: seat 2 becomes host; seat 1 comes back as a plain player
  const gone = once(guest, 'room-updated');
  host.close();
  assert.strictEqual((await gone).hostIndex, 2);
  const back = await rejoin(srv, created.roomCode, 1, created.token);
  assert.strictEqual(back.result.isHost, false);

  // turn is still 1, so seat 1 may hand it over
  const seen = once(guest, 'state-synced');
  back.socket.emit('sync-state', { gameState: { turn: 2, marker: 'on-turn' } });
  assert.strictEqual((await seen).gameState.marker, 'on-turn');
  await srv.close();
});

test('strikes reset after a quiet window', async () => {
  const srv = await startServer({ throttleNotifyMs: 50, strikeResetMs: 300 });
  const flooder = await srv.connect();
  const flood = () => {
    for (let i = 0; i < 200; i++) {
      flooder.emit('chat-message', { message: 'spam' });
    }
  };
  // three throttle notices, each one after the quiet window: no disconnect
  for (let round = 0; round < 3; round++) {
    const throttled = once(flooder, 'throttled');
    flood();
    await throttled;
    await wait(400);
  }
  assert.ok(flooder.connected);
  await srv.close();
});

test('too many sockets from one IP are refused', async () => {
  const srv = await startServer({ maxSocketsPerIp: 2 });
  const a = await srv.connect();
  await srv.connect();
  await assert.rejects(srv.connect());

  // a socket that left frees a slot
  const closed = once(a, 'disconnect');
  a.close();
  await closed;
  await wait(50);
  const again = await srv.connect();
  assert.ok(again.connected);
  await srv.close();
});

test('cf-connecting-ip is what counts as the client IP', async () => {
  const srv = await startServer({ maxSocketsPerIp: 1 });
  await srv.connect({ extraHeaders: { 'cf-connecting-ip': '203.0.113.1' } });
  const other = await srv.connect({
    extraHeaders: { 'cf-connecting-ip': '203.0.113.2' },
  });
  assert.ok(other.connected);
  await assert.rejects(
    srv.connect({ extraHeaders: { 'cf-connecting-ip': '203.0.113.1' } }),
  );
  await srv.close();
});

test('too many live rooms from one IP are refused', async () => {
  const srv = await startServer({ maxRoomsPerIp: 2 });
  for (let i = 0; i < 2; i++) {
    const s = await srv.connect();
    const p = once(s, 'room-created');
    s.emit('create-room', { playerName: 'Ok', playerColor: 'red' });
    await p;
  }
  const extra = await srv.connect();
  const err = once(extra, 'join-error');
  extra.emit('create-room', { playerName: 'Ok', playerColor: 'red' });
  assert.match((await err).message, /too many/i);
  await srv.close();
});

test('only meaningful game events keep a room alive', async () => {
  const srv = await startServer({ ttlMs: 300, sweepMs: 50 });
  const noisy = await pair(srv, true);
  const chatty = await pair(srv, true);

  // 700ms, longer than the TTL: ignored events vs real chat
  for (let i = 0; i < 7; i++) {
    noisy.host.emit('create-room', { playerName: 'x', playerColor: 'red' });
    chatty.host.emit('chat-message', { message: 'hi' });
    await wait(100);
  }

  const late = await srv.connect();
  let err = once(late, 'join-error');
  late.emit('join-room', {
    roomCode: noisy.created.roomCode,
    playerName: 'L',
    playerColor: 'teal',
  });
  assert.match((await err).message, /not found/i);

  // chatty room still exists (started: the answer is not "not found")
  err = once(late, 'join-error');
  late.emit('join-room', {
    roomCode: chatty.created.roomCode,
    playerName: 'L',
    playerColor: 'teal',
  });
  assert.match((await err).message, /already started/i);
  await srv.close();
});

test('a joiner into a room with no connected player keeps it alive', async () => {
  const srv = await startServer(fast);
  const { host, guest, created } = await pair(srv, false);
  host.close();
  guest.close();
  await wait(100);
  const b = await srv.connect();
  const joined = once(b, 'room-joined');
  b.emit('join-room', {
    roomCode: created.roomCode,
    playerName: 'New',
    playerColor: 'lime',
  });
  await joined;
  await wait(700);
  // Past the grace the two old seats are freed, the room is still there
  const c = await srv.connect();
  const ok = once(c, 'room-joined');
  c.emit('join-room', {
    roomCode: created.roomCode,
    playerName: 'Late',
    playerColor: 'teal',
  });
  assert.ok(await ok);
  await srv.close();
});
