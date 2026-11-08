const test = require('node:test');
const assert = require('node:assert');
const { startServer, once, never } = require('./helpers');

// Started room with 3 players; host sent turn 1 state
async function startedRoom(srv) {
  const host = await srv.connect();
  let p = once(host, 'room-created');
  host.emit('create-room', { playerName: 'Host', playerColor: 'red' });
  const created = await p;

  const seats = [];
  for (const [name, color] of [
    ['Bob', 'blue'],
    ['Cat', 'lime'],
  ]) {
    const s = await srv.connect();
    p = once(s, 'room-joined');
    s.emit('join-room', {
      roomCode: created.roomCode,
      playerName: name,
      playerColor: color,
    });
    seats.push({ socket: s, joined: await p });
  }
  const [b, c] = seats;

  host.emit('start-game');
  await once(c.socket, 'game-started');

  const synced = once(b.socket, 'state-synced');
  host.emit('sync-state', { gameState: { turn: 1, pcount: 3, marker: 'a' } });
  await synced;
  return { host, created, b, c };
}

test('sync-state is ignored before the game starts', async () => {
  const srv = await startServer();
  const host = await srv.connect();
  const p = once(host, 'room-created');
  host.emit('create-room', { playerName: 'H', playerColor: 'red' });
  const created = await p;
  const g = await srv.connect();
  g.emit('join-room', {
    roomCode: created.roomCode,
    playerName: 'G',
    playerColor: 'blue',
  });
  await once(g, 'room-joined');
  host.emit('sync-state', { gameState: { turn: 1 } });
  await never(g, 'state-synced');
  await srv.close();
});

test('host and current-turn player can sync; others cannot', async () => {
  const srv = await startServer();
  const { host, b, c } = await startedRoom(srv);

  // turn is 1 (host). Player 3 is not host and not on turn: rejected.
  c.socket.emit('sync-state', { gameState: { turn: 1, marker: 'evil' } });
  await never(host, 'state-synced');
  await never(b.socket, 'state-synced');

  // host moves the turn to player 2
  const toB = once(b.socket, 'state-synced');
  host.emit('sync-state', { gameState: { turn: 2, marker: 'b' } });
  assert.strictEqual((await toB).gameState.marker, 'b');

  // player 2 is now on turn: accepted, relayed to the others
  const toHost = once(host, 'state-synced');
  b.socket.emit('sync-state', { gameState: { turn: 3, marker: 'c' } });
  assert.strictEqual((await toHost).gameState.marker, 'c');

  // player 2 is no longer on turn and not host: rejected
  b.socket.emit('sync-state', { gameState: { turn: 2, marker: 'late' } });
  await never(host, 'state-synced');
  await srv.close();
});

// Host starts an auction: bidders are seats 3 then 2, nobody has bid yet
const auctionOpen = {
  auctionActive: true,
  auctionProperty: 1,
  auctionBid: 0,
  auctionBidder: 0,
  auctionTurn: 0,
  auctionPlayers: [3, 2],
  passCount: 0,
};
const auctionShut = {
  auctionActive: false,
  auctionProperty: null,
  auctionBid: 0,
  auctionBidder: 0,
  auctionTurn: 0,
  auctionPlayers: [],
};
const gamePlayers = () => [
  { name: 'bank', money: 0, position: 0 },
  { name: 'Host', money: 1500, position: 1 },
  { name: 'Bob', money: 1500, position: 5 },
  { name: 'Cat', money: 1500, position: 5 },
];
const gameSquares = () =>
  Array.from({ length: 40 }, (_, i) => ({ index: i, owner: 0 }));

async function auctionRoom(srv) {
  const room = await startedRoom(srv);
  const seen = once(room.c.socket, 'state-synced');
  room.host.emit('sync-state', {
    gameState: {
      auction: auctionOpen,
      players: gamePlayers(),
      squares: gameSquares(),
      turn: 1,
      pcount: 3,
    },
  });
  await seen;
  return room;
}

test('the current bidder can move the auction, only the auction is kept', async () => {
  const srv = await startServer();
  const { host, b, c } = await auctionRoom(srv);

  // seat 3 is first to bid; players/squares in a bid update are dropped
  const bad = gamePlayers();
  bad[3].money = 999999;
  const toHost = once(host, 'state-synced');
  c.socket.emit('sync-state', {
    gameState: {
      auction: { ...auctionOpen, auctionBid: 100, auctionBidder: 3, auctionTurn: 1 },
      players: bad,
      squares: gameSquares(),
      turn: 1,
    },
  });
  const got = (await toHost).gameState;
  assert.strictEqual(got.auction.auctionBid, 100);
  assert.strictEqual(got.players, undefined);
  assert.strictEqual(got.squares, undefined);

  // seat 3 is no longer current (seat 2 is): rejected
  c.socket.emit('sync-state', {
    gameState: { auction: { ...auctionOpen, auctionBid: 500, auctionBidder: 3 } },
  });
  await never(host, 'state-synced');

  // unknown keys, a bid above the bidder money and a moved property: rejected
  for (const gameState of [
    { auction: { ...auctionOpen, auctionBid: 200, auctionBidder: 2, auctionTurn: 0 }, marker: 'evil' },
    { auction: { ...auctionOpen, auctionBid: 5000, auctionBidder: 2, auctionTurn: 0 } },
    { auction: { ...auctionOpen, auctionProperty: 5, auctionBid: 200, auctionBidder: 2, auctionTurn: 0 } },
    { auction: { ...auctionOpen, auctionBid: 200, auctionBidder: 2, auctionTurn: 0, extra: 1 } },
  ]) {
    b.socket.emit('sync-state', { gameState });
  }
  await never(host, 'state-synced');
  await srv.close();
});

test('a bidder cannot sync without an open auction or touch the turn', async () => {
  const srv = await startServer();
  const { host, b, c } = await startedRoom(srv);
  // no auction stored yet
  c.socket.emit('sync-state', { gameState: { auction: auctionOpen, turn: 1 } });
  await never(host, 'state-synced');

  const openB = once(b.socket, 'state-synced');
  const openC = once(c.socket, 'state-synced');
  host.emit('sync-state', {
    gameState: { auction: auctionOpen, players: gamePlayers(), squares: gameSquares(), turn: 1 },
  });
  await openB;
  await openC;
  c.socket.emit('sync-state', {
    gameState: { players: gamePlayers(), squares: gameSquares(), turn: 3 },
  });
  await never(host, 'state-synced');
  await never(b.socket, 'state-synced');

  // an auction update that also carries a turn: the turn is dropped
  const kept = once(host, 'state-synced');
  c.socket.emit('sync-state', {
    gameState: {
      auction: { ...auctionOpen, auctionBid: 50, auctionBidder: 3, auctionTurn: 1 },
      turn: 3,
    },
  });
  assert.strictEqual((await kept).gameState.turn, undefined);
  await srv.close();
});

test('closing an auction: the server applies the result, not the bidder', async () => {
  const srv = await startServer();
  const { host, b, c } = await auctionRoom(srv);

  const bid = once(host, 'state-synced');
  c.socket.emit('sync-state', {
    gameState: { auction: { ...auctionOpen, auctionBid: 100, auctionBidder: 3, auctionTurn: 1 } },
  });
  await bid;

  // seat 2 passes and closes; the sent money/owner are forged
  const forged = gamePlayers();
  forged[2].money = 999999;
  const forgedSquares = gameSquares();
  forgedSquares[1].owner = 2;
  const closed = once(host, 'state-synced');
  b.socket.emit('sync-state', {
    gameState: { auction: auctionShut, players: forged, squares: forgedSquares, turn: 2 },
  });
  const got = (await closed).gameState;
  assert.strictEqual(got.auction.auctionActive, false);
  assert.strictEqual(got.players[3].money, 1400);
  assert.strictEqual(got.players[2].money, 1500);
  assert.strictEqual(got.squares[1].owner, 3);
  assert.strictEqual(got.turn, 2);

  // the stored state moved on: seat 3 is not current any more
  c.socket.emit('sync-state', { gameState: { auction: auctionShut, turn: 3 } });
  await never(host, 'state-synced');
  await srv.close();
});

test('closing an auction cannot hand the turn to a wrong seat', async () => {
  const srv = await startServer();
  const { host, c } = await auctionRoom(srv);
  c.socket.emit('sync-state', { gameState: { auction: auctionShut, turn: 3 } });
  await never(host, 'state-synced');
  await srv.close();
});

test('oversized or ill-shaped state is rejected', async () => {
  const srv = await startServer();
  const { host, b } = await startedRoom(srv);
  host.emit('sync-state', { gameState: { turn: 1, big: 'x'.repeat(95000) } });
  host.emit('sync-state', { gameState: { players: 'nope' } });
  host.emit('sync-state', { gameState: { turn: 'abc' } });
  host.emit('sync-state', { gameState: [1, 2, 3] });
  host.emit('sync-state', { gameState: null });
  await never(b.socket, 'state-synced');
  await srv.close();
});

test('game-action is gated and the action name is checked', async () => {
  const srv = await startServer();
  const { host, b, c } = await startedRoom(srv);

  const ok = once(b.socket, 'game-action');
  host.emit('game-action', { action: 'dice-rolled', data: { die1: 1 } });
  const got = await ok;
  assert.strictEqual(got.action, 'dice-rolled');
  assert.strictEqual(got.from, 1);

  host.emit('game-action', { action: '<b>x</b>', data: {} });
  host.emit('game-action', { action: 'a'.repeat(200), data: {} });
  host.emit('game-action', { action: 'x', data: 'y'.repeat(20000) });
  c.socket.emit('game-action', { action: 'dice-rolled', data: {} });
  await never(b.socket, 'game-action');
  await srv.close();
});

test('chat name comes from the seat, message is capped', async () => {
  const srv = await startServer();
  const { host, b } = await startedRoom(srv);

  const msg = once(host, 'chat-message');
  b.socket.emit('chat-message', {
    playerName: 'Host',
    message: `  hi ${'y'.repeat(500)}`,
  });
  const m = await msg;
  assert.strictEqual(m.playerName, 'Bob');
  assert.strictEqual(m.message.length, 200);
  assert.ok(m.message.startsWith('hi '));

  b.socket.emit('chat-message', { message: 12345 });
  await never(host, 'chat-message');
  await srv.close();
});

test('rejoin needs the right token', async () => {
  const srv = await startServer();
  const { host, created, b } = await startedRoom(srv);
  const { roomCode } = created;
  const bToken = b.joined.token;

  // seat still has a (stale) socket: wrong token cannot take it over
  const early = await srv.connect();
  let err = once(early, 'rejoin-error');
  early.emit('rejoin-room', { roomCode, playerIndex: 2, token: 'f'.repeat(32) });
  await err;

  // the right token takes the seat over and the stale socket is dropped
  const replaced = once(b.socket, 'replaced');
  const dropped = once(b.socket, 'disconnect');
  const took = once(early, 'rejoin-success');
  early.emit('rejoin-room', { roomCode, playerIndex: 2, token: bToken });
  assert.strictEqual((await took).playerIndex, 2);
  await replaced;
  await dropped;

  // the stale socket is dead, the seat belongs to `early`
  b.socket.emit('chat-message', { message: 'ghost' });
  const gone = once(host, 'player-disconnected');
  early.close();
  await gone;

  const bad = [
    { roomCode, playerIndex: 2 },
    { roomCode, playerIndex: 2, token: 'f'.repeat(32) },
    { roomCode, playerIndex: 2, token: 12345 },
    { roomCode, playerIndex: 2, token: 'short' },
    { roomCode, playerIndex: 2, playerName: 'Bob' },
    { roomCode, playerIndex: 3, token: bToken },
  ];
  for (const payload of bad) {
    const s = await srv.connect();
    err = once(s, 'rejoin-error');
    s.emit('rejoin-room', payload);
    await err;
  }

  const s = await srv.connect();
  const ok = once(s, 'rejoin-success');
  s.emit('rejoin-room', { roomCode, playerIndex: 2, token: bToken });
  const r = await ok;
  assert.strictEqual(r.playerIndex, 2);
  assert.strictEqual(r.hostIndex, 1);
  assert.strictEqual(r.started, true);
  assert.strictEqual(r.gameState.marker, 'a');
  assert.strictEqual(r.players.find((p) => p.index === 2).disconnected, false);
  r.players.forEach((p) => assert.ok(!('token' in p) && !('socketId' in p)));

  // the seat works again: player 2 is not on turn, so sync is rejected
  s.emit('sync-state', { gameState: { turn: 2, marker: 'z' } });
  await never(host, 'state-synced');
  await srv.close();
});
