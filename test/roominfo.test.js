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

test('room-info works before joining and lists taken colours only', async () => {
  const srv = await startServer();
  const { created } = await makeRoom(srv, 'Alice', 'red');
  await joinRoom(srv, created.roomCode, 'Bob', 'blue');

  const peek = await srv.connect();
  const info = once(peek, 'room-info');
  peek.emit('room-info', { roomCode: ` ${created.roomCode.toLowerCase()} ` });
  const r = await info;
  assert.deepStrictEqual(Object.keys(r).sort(), ['full', 'started', 'takenColors']);
  assert.deepStrictEqual(r.takenColors.sort(), ['blue', 'red']);
  assert.strictEqual(r.started, false);
  assert.strictEqual(r.full, false);
  const text = JSON.stringify(r);
  assert.ok(!/Alice|Bob|token/i.test(text));
  await srv.close();
});

test('room-info reply goes to the asker only', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv);
  const peek = await srv.connect();
  const info = once(peek, 'room-info');
  peek.emit('room-info', { roomCode: created.roomCode });
  await info;
  await never(host, 'room-info');
  await srv.close();
});

test('room-info reports started and full', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv, 'H', 'yellow');
  const colors = ['blue', 'red', 'lime', 'green', 'aqua', 'orange', 'purple'];
  for (const c of colors) {
    await joinRoom(srv, created.roomCode, `P${c}`, c);
  }
  const peek = await srv.connect();
  let info = once(peek, 'room-info');
  peek.emit('room-info', { roomCode: created.roomCode });
  let r = await info;
  assert.strictEqual(r.full, true);
  assert.strictEqual(r.takenColors.length, 8);

  host.emit('start-game');
  await once(host, 'game-started');
  info = once(peek, 'room-info');
  peek.emit('room-info', { roomCode: created.roomCode });
  r = await info;
  assert.strictEqual(r.started, true);
  await srv.close();
});

test('room-info unknown room gives join-error like join-room', async () => {
  const srv = await startServer();
  const peek = await srv.connect();
  const err = once(peek, 'join-error');
  peek.emit('room-info', { roomCode: 'ZZZZZZ' });
  assert.match((await err).message, /not found/i);
  await srv.close();
});

test('room-info malformed payloads are ignored', async () => {
  const srv = await startServer();
  const peek = await srv.connect();
  peek.emit('room-info');
  peek.emit('room-info', 5);
  peek.emit('room-info', [1]);
  const err = once(peek, 'join-error');
  peek.emit('room-info', { roomCode: { a: 1 } });
  assert.match((await err).message, /not found/i);
  await srv.close();
});
