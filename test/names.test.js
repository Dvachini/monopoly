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

// Drop a socket and come back on a new one with the same seat token
async function rejoin(srv, host, guest, roomCode, playerIndex, token) {
  guest.close();
  await once(host, 'player-disconnected');
  const back = await srv.connect();
  const rj = once(back, 'rejoin-success');
  back.emit('rejoin-room', { roomCode, playerIndex, token });
  await rj;
  return back;
}

test('join with a taken name is rejected case-insensitively', async () => {
  const srv = await startServer();
  const { created } = await makeRoom(srv, 'Alice', 'red');
  const s = await srv.connect();
  const err = once(s, 'join-error');
  s.emit('join-room', { roomCode: created.roomCode, playerName: 'aLiCe', playerColor: 'blue' });
  assert.strictEqual((await err).message, 'That name is already taken.');
  await srv.close();
});

test('join with a fullwidth homoglyph of a taken name is rejected (NFKC)', async () => {
  const srv = await startServer();
  const { created } = await makeRoom(srv, 'Alice', 'red');
  const s = await srv.connect();
  const err = once(s, 'join-error');
  s.emit('join-room', { roomCode: created.roomCode, playerName: 'Ａlice', playerColor: 'blue' });
  assert.strictEqual((await err).message, 'That name is already taken.');
  await srv.close();
});

test('rejected join leaves the room unchanged', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv, 'Alice', 'red');
  const s = await srv.connect();
  s.emit('join-room', { roomCode: created.roomCode, playerName: 'ALICE', playerColor: 'blue' });
  await never(host, 'room-updated');
  await srv.close();
});

test('rename uses the folded key (fullwidth homoglyph is a duplicate)', async () => {
  const srv = await startServer();
  const { created } = await makeRoom(srv, 'Alice', 'red');
  const { socket: guest } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  const err = once(guest, 'rename-error');
  guest.emit('rename', { name: 'Ａlice' });
  assert.match((await err).message, /taken|already/i);
  await srv.close();
});

test('reserved names are refused on create, join and rename', async () => {
  const srv = await startServer();
  for (const name of ['System', 'bank', 'SERVER', 'Ｓystem']) {
    const s = await srv.connect();
    const err = once(s, 'join-error');
    s.emit('create-room', { playerName: name, playerColor: 'red' });
    assert.match((await err).message, /not allowed/i);
  }
  const { created } = await makeRoom(srv, 'Alice', 'red');
  const j = await srv.connect();
  const jerr = once(j, 'join-error');
  j.emit('join-room', { roomCode: created.roomCode, playerName: 'Bank', playerColor: 'blue' });
  assert.match((await jerr).message, /not allowed/i);

  const { socket: guest } = await joinRoom(srv, created.roomCode, 'Bob', 'green');
  const rerr = once(guest, 'rename-error');
  guest.emit('rename', { name: 'server' });
  assert.match((await rerr).message, /not allowed/i);
  await srv.close();
});

test('default Player N name does not collide with a chosen name', async () => {
  const srv = await startServer();
  const { created } = await makeRoom(srv, 'Player 2', 'red');
  const s = await srv.connect();
  const p = once(s, 'room-joined');
  s.emit('join-room', { roomCode: created.roomCode, playerName: '<bad>', playerColor: 'blue' });
  const names = (await p).players.map((x) => x.name.toLowerCase());
  assert.strictEqual(new Set(names).size, names.length);
  await srv.close();
});

test('rename throttle survives a rejoin', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv, 'Alice', 'red');
  const { socket: guest, joined } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  const ok = once(guest, 'room-updated');
  guest.emit('rename', { name: 'Bobby' });
  await ok;
  const back = await rejoin(srv, host, guest, created.roomCode, 2, joined.token);
  const err = once(back, 'rename-error');
  back.emit('rename', { name: 'Robert' });
  assert.match((await err).message, /slow/i);
  await srv.close();
});

test('money throttle follows the room when the host seat changes socket', async () => {
  const srv = await startServer();
  const { host, created } = await makeRoom(srv, 'Alice', 'red');
  const { socket: guest } = await joinRoom(srv, created.roomCode, 'Bob', 'blue');
  const ok = once(host, 'room-updated');
  host.emit('set-starting-money', { amount: 500 });
  await ok;
  await once(guest, 'room-updated');
  const left = once(guest, 'player-disconnected');
  host.close();
  await left;
  const err = once(guest, 'money-error');
  guest.emit('set-starting-money', { amount: 1000 });
  assert.match((await err).message, /slow/i);
  await srv.close();
});

test('a rejected rename still uses up the throttle window', async () => {
  const srv = await startServer();
  const { host } = await makeRoom(srv, 'Alice', 'red');
  const bad = once(host, 'rename-error');
  host.emit('rename', { name: '<b>' });
  assert.match((await bad).message, /1-20/);
  const err = once(host, 'rename-error');
  host.emit('rename', { name: 'Alicia' });
  assert.match((await err).message, /slow/i);
  await srv.close();
});

test('throttle windows are injectable', async () => {
  const srv = await startServer({ renameThrottleMs: 0, moneyThrottleMs: 0 });
  const { host } = await makeRoom(srv, 'Alice', 'red');
  for (const name of ['Alicia', 'Alina']) {
    const ok = once(host, 'room-updated');
    host.emit('rename', { name });
    assert.strictEqual((await ok).renamed.to, name);
  }
  for (const amount of [500, 1000]) {
    const ok = once(host, 'room-updated');
    host.emit('set-starting-money', { amount });
    assert.strictEqual((await ok).startingMoney, amount);
  }
  await srv.close();
});
