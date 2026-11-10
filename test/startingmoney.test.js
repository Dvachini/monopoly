const test = require('node:test');
const assert = require('node:assert');
const { startServer, once, never } = require('./helpers');

async function makeRoom(srv, name = 'Host', color = 'red') {
  const host = await srv.connect();
  const p = once(host, 'room-created');
  host.emit('create-room', { playerName: name, playerColor: color });
  return { host, created: await p };
}

async function joinRoom(srv, roomCode, name, color) {
  const s = await srv.connect();
  const p = once(s, 'room-joined');
  s.emit('join-room', { roomCode, playerName: name, playerColor: color });
  return { socket: s, joined: await p };
}

test('default starting money is 1500 in room-created and room-joined', async () => {
  const srv = await startServer();
  const { created } = await makeRoom(srv);
  assert.strictEqual(created.startingMoney, 1500);
  const { joined } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  assert.strictEqual(joined.startingMoney, 1500);
  await srv.close();
});

test('host sets starting money, room and game-started carry it', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv);
  const { socket: guest } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  const seen = once(guest, 'room-updated');
  host.emit('set-starting-money', { amount: 5000 });
  const u = await seen;
  assert.strictEqual(u.startingMoney, 5000);
  assert.ok(Array.isArray(u.players));

  const a = once(host, 'game-started');
  const b = once(guest, 'game-started');
  host.emit('start-game');
  assert.strictEqual((await a).startingMoney, 5000);
  assert.strictEqual((await b).startingMoney, 5000);
  await srv.close();
});

test('every allowlisted amount is accepted', async () => {
  const srv = await startServer({ moneyThrottleMs: 0 });
  const { host } = await makeRoom(srv);
  for (const amount of [500, 1000, 1500, 2000, 5000, 10000]) {
    const seen = once(host, 'room-updated');
    host.emit('set-starting-money', { amount });
    assert.strictEqual((await seen).startingMoney, amount);
  }
  await srv.close();
});

test('non-host cannot set starting money', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv);
  const { socket: guest } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  guest.emit('set-starting-money', { amount: 500 });
  await never(host, 'room-updated');
  const a = once(host, 'game-started');
  host.emit('start-game');
  assert.strictEqual((await a).startingMoney, 1500);
  await srv.close();
});

test('invalid amounts are rejected', async () => {
  const srv = await startServer({ moneyThrottleMs: 0 });
  const { host } = await makeRoom(srv);
  for (const amount of ['1000', 750, -500, 1500.5, null, 0, 1e9]) {
    const err = once(host, 'money-error');
    host.emit('set-starting-money', { amount });
    assert.ok((await err).message);
  }
  await srv.close();
});

test('cannot change starting money after the game started', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv);
  await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  host.emit('start-game');
  await once(host, 'game-started');
  host.emit('set-starting-money', { amount: 500 });
  await never(host, 'room-updated');
  await srv.close();
});

test('starting money is throttled to one change per second', async () => {
  const srv = await startServer();
  const { host } = await makeRoom(srv);
  const ok = once(host, 'room-updated');
  host.emit('set-starting-money', { amount: 500 });
  await ok;
  const err = once(host, 'money-error');
  host.emit('set-starting-money', { amount: 1000 });
  assert.match((await err).message, /slow/i);
  await srv.close();
});

test('rejoin-success carries starting money', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv);
  const { socket: guest, joined } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  const ok = once(guest, 'room-updated');
  host.emit('set-starting-money', { amount: 2000 });
  await ok;
  guest.close();
  await once(host, 'player-disconnected');
  const back = await srv.connect();
  const rj = once(back, 'rejoin-success');
  back.emit('rejoin-room', {
    roomCode: created.roomCode,
    playerIndex: 2,
    token: joined.token,
  });
  assert.strictEqual((await rj).startingMoney, 2000);
  await srv.close();
});
