const test = require('node:test');
const assert = require('node:assert');
const { startServer, once, never } = require('./helpers');

// Host creates a room, returns { host, created }
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

test('create + join + start happy path', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv);
  assert.match(created.roomCode, /^[A-Z2-9]{6}$/);
  assert.strictEqual(created.playerIndex, 1);
  assert.strictEqual(created.hostIndex, 1);
  assert.strictEqual(created.isHost, true);
  assert.match(created.token, /^[0-9a-f]{32}$/);

  const updated = once(host, 'room-updated');
  const { socket: guest, joined } = await joinRoom(
    srv,
    created.roomCode,
    'Bob',
    'blue',
  );
  assert.strictEqual(joined.playerIndex, 2);
  assert.strictEqual(joined.hostIndex, 1);
  assert.strictEqual(joined.isHost, false);
  assert.match(joined.token, /^[0-9a-f]{32}$/);
  assert.notStrictEqual(joined.token, created.token);
  assert.strictEqual((await updated).players.length, 2);

  const startedA = once(host, 'game-started');
  const startedB = once(guest, 'game-started');
  host.emit('start-game');
  assert.strictEqual((await startedA).players.length, 2);
  assert.strictEqual((await startedB).players.length, 2);
  await srv.close();
});

test('broadcast players have no token or socketId, and a hostIndex', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv);
  const updated = once(host, 'room-updated');
  const { joined } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  const u = await updated;
  assert.strictEqual(u.hostIndex, 1);
  [created.players, joined.players, u.players].forEach((list) => {
    list.forEach((p) => {
      assert.deepStrictEqual(Object.keys(p).sort(), [
        'color',
        'disconnected',
        'index',
        'name',
      ]);
    });
  });
  await srv.close();
});

test('join errors: unknown, full, started, duplicate colour', async () => {
  const srv = await startServer();
  const stranger = await srv.connect();
  let err = once(stranger, 'join-error');
  stranger.emit('join-room', {
    roomCode: 'ZZZZZZ',
    playerName: 'X',
    playerColor: 'red',
  });
  assert.match((await err).message, /not found/i);

  const { host, created } = await makeRoom(srv, 'Host', 'yellow');
  const colors = ['blue', 'red', 'lime', 'green', 'aqua', 'orange', 'purple'];
  for (const c of colors) {
    await joinRoom(srv, created.roomCode, `P${c}`, c);
  }

  const late = await srv.connect();
  err = once(late, 'join-error');
  late.emit('join-room', {
    roomCode: created.roomCode,
    playerName: 'Late',
    playerColor: 'teal',
  });
  assert.match((await err).message, /full/i);

  const r2 = await makeRoom(srv, 'H2', 'yellow');
  const dup = await srv.connect();
  err = once(dup, 'join-error');
  dup.emit('join-room', {
    roomCode: r2.created.roomCode,
    playerName: 'Dup',
    playerColor: 'Yellow',
  });
  assert.match((await err).message, /colou?r/i);

  await joinRoom(srv, r2.created.roomCode, 'Ok', 'blue');
  r2.host.emit('start-game');
  await once(r2.host, 'game-started');
  const after = await srv.connect();
  err = once(after, 'join-error');
  after.emit('join-room', {
    roomCode: r2.created.roomCode,
    playerName: 'After',
    playerColor: 'teal',
  });
  assert.match((await err).message, /started/i);
  assert.ok(host.connected);
  await srv.close();
});

test('malformed payloads do not crash the server', async () => {
  const srv = await startServer();
  const s = await srv.connect();
  s.emit('create-room');
  s.emit('create-room', 42);
  s.emit('create-room', [1, 2]);
  s.emit('create-room', { playerName: 'x'.repeat(50000), playerColor: {} });
  s.emit('join-room');
  s.emit('join-room', { roomCode: 12345 });
  s.emit('join-room', { roomCode: { a: 1 } });
  s.emit('sync-state', 'nope');
  s.emit('game-action', null);
  s.emit('chat-message', 7);
  s.emit('rejoin-room', []);
  // later connections still work
  const { created } = await makeRoom(srv, 'Fine', 'red');
  assert.ok(created.roomCode);
  await srv.close();
});

test('hostile names are replaced by the default name', async () => {
  const srv = await startServer();
  const { created } = await makeRoom(srv, '<img src=x onerror=alert(1)>', 'red');
  assert.strictEqual(created.players[0].name, 'Player 1');
  const { joined } = await joinRoom(srv, created.roomCode, '  Bob  ', 'blue');
  assert.strictEqual(joined.players[1].name, 'Bob');
  await srv.close();
});

test('one room per socket: second create/join is ignored', async () => {
  const srv = await startServer();
  const { host } = await makeRoom(srv);
  const second = once(host, 'room-created', 200);
  host.emit('create-room', { playerName: 'Again', playerColor: 'blue' });
  await assert.rejects(second, /timeout/);
  await srv.close();
});

test('room cap: max rooms reached gives join-error on create', async () => {
  const srv = await startServer({ maxRooms: 2 });
  await makeRoom(srv, 'A', 'red');
  await makeRoom(srv, 'B', 'red');
  const s = await srv.connect();
  const err = once(s, 'join-error');
  s.emit('create-room', { playerName: 'C', playerColor: 'red' });
  assert.match((await err).message, /busy|full|many/i);
  await srv.close();
});

test('player indexes stay unique after a leave and a join', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv, 'A', 'red');
  const b = await joinRoom(srv, created.roomCode, 'B', 'blue');
  await joinRoom(srv, created.roomCode, 'C', 'lime');
  const gone = once(host, 'room-updated');
  b.socket.close();
  await gone;
  const d = await joinRoom(srv, created.roomCode, 'D', 'aqua');
  const indexes = d.joined.players.map((p) => p.index);
  assert.strictEqual(new Set(indexes).size, indexes.length);
  indexes.forEach((i) => assert.ok(i >= 1 && i <= 8));
  await srv.close();
});

test('non-host start-game is ignored', async () => {
  const srv = await startServer();
  const { created } = await makeRoom(srv);
  const g = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  g.socket.emit('start-game');
  await never(g.socket, 'game-started');
  await srv.close();
});
