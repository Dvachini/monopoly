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

test('rename happy path updates room and logs from/to', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv, 'Alice', 'red');
  const { socket: guest } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  const seen = once(host, 'room-updated');
  guest.emit('rename', { name: '  Bobby  ' });
  const u = await seen;
  assert.deepStrictEqual(u.renamed, { index: 2, from: 'Bob', to: 'Bobby' });
  assert.strictEqual(u.players.find((p) => p.index === 2).name, 'Bobby');
  assert.strictEqual(u.hostIndex, 1);
  await srv.close();
});

test('rename duplicate is rejected case-insensitively', async () => {
  const srv = await startServer();
  const { created } = await makeRoom(srv, 'Alice', 'red');
  const { socket: guest } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  const err = once(guest, 'rename-error');
  guest.emit('rename', { name: 'aLiCe' });
  assert.match((await err).message, /taken|already/i);
  await srv.close();
});

test('rename to own name in different case is allowed', async () => {
  const srv = await startServer();
  const { host } = await makeRoom(srv, 'alice', 'red');
  const seen = once(host, 'room-updated');
  host.emit('rename', { name: 'ALICE' });
  assert.strictEqual((await seen).renamed.to, 'ALICE');
  await srv.close();
});

test('rename rejects bad characters, empty and overlength', async () => {
  const srv = await startServer({ renameThrottleMs: 0 });
  const { host } = await makeRoom(srv, 'Alice', 'red');
  const bad = ['<b>x</b>', '', '   ', 'x'.repeat(21), 42, null];
  for (const name of bad) {
    const err = once(host, 'rename-error');
    host.emit('rename', { name });
    assert.ok((await err).message);
  }
  await srv.close();
});

test('rename from a socket without a seat is ignored', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv, 'Alice', 'red');
  const stranger = await srv.connect();
  stranger.emit('rename', { name: 'Hacker' });
  await never(host, 'room-updated');
  const info = once(stranger, 'room-info');
  stranger.emit('room-info', { roomCode: created.roomCode });
  assert.deepStrictEqual((await info).takenColors, ['red']);
  await srv.close();
});

test('rename is throttled to one per 3 seconds per socket', async () => {
  const srv = await startServer();
  const { host } = await makeRoom(srv, 'Alice', 'red');
  const ok = once(host, 'room-updated');
  host.emit('rename', { name: 'Alicia' });
  await ok;
  const err = once(host, 'rename-error');
  host.emit('rename', { name: 'Alina' });
  assert.match((await err).message, /slow/i);
  await srv.close();
});

test('renamed name survives rejoin and shows in chat', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv, 'Alice', 'red');
  const { socket: guest, joined } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  const ok = once(guest, 'room-updated');
  guest.emit('rename', { name: 'Bobby' });
  await ok;

  const chat = once(host, 'chat-message');
  guest.emit('chat-message', { message: 'hi' });
  assert.strictEqual((await chat).playerName, 'Bobby');

  guest.close();
  await once(host, 'player-disconnected');
  const back = await srv.connect();
  const rj = once(back, 'rejoin-success');
  back.emit('rejoin-room', {
    roomCode: created.roomCode,
    playerIndex: 2,
    token: joined.token,
  });
  const r = await rj;
  assert.strictEqual(r.players.find((p) => p.index === 2).name, 'Bobby');
  await srv.close();
});

test('rename mid-game updates gameState and host sync cannot revert it', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv, 'Alice', 'red');
  const { socket: guest, joined } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  host.emit('start-game');
  await once(host, 'game-started');
  const stateOf = (n2) => ({
    turn: 1,
    players: [{ name: 'Bank' }, { name: 'Alice' }, { name: n2 }],
  });
  host.emit('sync-state', { gameState: stateOf('Bob') });
  await once(guest, 'state-synced');

  const ok = once(host, 'room-updated');
  guest.emit('rename', { name: 'Bobby' });
  assert.strictEqual((await ok).renamed.to, 'Bobby');

  // stale host sync carries the old name; server re-stamps before relaying
  const relay = once(guest, 'state-synced');
  host.emit('sync-state', { gameState: stateOf('Bob') });
  assert.strictEqual((await relay).gameState.players[2].name, 'Bobby');

  guest.close();
  await once(host, 'player-disconnected');
  const back = await srv.connect();
  const rj = once(back, 'rejoin-success');
  back.emit('rejoin-room', {
    roomCode: created.roomCode,
    playerIndex: 2,
    token: joined.token,
  });
  assert.strictEqual((await rj).gameState.players[2].name, 'Bobby');
  await srv.close();
});
