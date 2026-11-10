const test = require('node:test');
const assert = require('node:assert');
const {
  sanitizeName,
  normalizeColor,
  isPlainObject,
  checkStateShape,
  bidderUpdate,
  bankruptcyLimit,
  isEliminated,
  clientIp,
  makeRoomCode,
  makeToken,
} = require('../sockets/validate');

test('sanitizeName keeps good names and trims', () => {
  assert.strictEqual(sanitizeName('  Bob  ', 'P'), 'Bob');
  assert.strictEqual(sanitizeName('Mary   Jane', 'P'), 'Mary Jane');
  assert.strictEqual(sanitizeName("O'Neil-Ng_1.", 'P'), "O'Neil-Ng_1.");
});

test('sanitizeName falls back on bad input', () => {
  assert.strictEqual(sanitizeName('<script>alert(1)</script>', 'P'), 'P');
  assert.strictEqual(sanitizeName('a'.repeat(21), 'P'), 'P');
  assert.strictEqual(sanitizeName('smile \u{1F600}', 'P'), 'P');
  assert.strictEqual(sanitizeName(42, 'P'), 'P');
  assert.strictEqual(sanitizeName(null, 'P'), 'P');
  assert.strictEqual(sanitizeName({}, 'P'), 'P');
  assert.strictEqual(sanitizeName('   ', 'P'), 'P');
});

test('normalizeColor allows only the lobby colours', () => {
  assert.strictEqual(normalizeColor('Yellow'), 'yellow');
  assert.strictEqual(normalizeColor('  blue '), 'blue');
  assert.strictEqual(normalizeColor('javascript:x'), null);
  assert.strictEqual(normalizeColor('#ff0000'), null);
  assert.strictEqual(normalizeColor(5), null);
  assert.strictEqual(normalizeColor(undefined), null);
});

test('isPlainObject', () => {
  assert.ok(isPlainObject({}));
  assert.ok(!isPlainObject(null));
  assert.ok(!isPlainObject([]));
  assert.ok(!isPlainObject('x'));
  assert.ok(!isPlainObject(7));
});

test('checkStateShape', () => {
  const good = {
    players: new Array(9).fill({ money: 1500 }),
    squares: new Array(40).fill({ owner: 0 }),
    turn: 1,
  };
  assert.ok(checkStateShape(good));
  assert.ok(checkStateShape({ auction: { auctionActive: true } }));
  assert.ok(!checkStateShape(null));
  assert.ok(!checkStateShape([]));
  assert.ok(!checkStateShape({ players: 'x' }));
  assert.ok(!checkStateShape({ players: new Array(30).fill(0) }));
  assert.ok(!checkStateShape({ squares: new Array(500).fill(0) }));
  assert.ok(!checkStateShape({ turn: 'one' }));
  assert.ok(!checkStateShape({ turn: 99 }));
  assert.ok(!checkStateShape({ junk: 'x'.repeat(100000) }));
});

test('makeRoomCode is 6 chars from the room alphabet', () => {
  for (let i = 0; i < 50; i++) {
    assert.match(makeRoomCode(), /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  }
});

test('makeToken is 32 hex chars and unique', () => {
  const a = makeToken();
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notStrictEqual(a, makeToken());
});

// Stored state: seats 3 then 2 bid on square 1, seat 3 bids first
const open = {
  auctionActive: true,
  auctionProperty: 1,
  auctionBid: 0,
  auctionBidder: 0,
  auctionTurn: 0,
  auctionPlayers: [3, 2],
  passCount: 0,
};
const stored = (auction) => ({
  auction,
  players: [
    { money: 0, position: 0 },
    { money: 1500, position: 1 },
    { money: 1500, position: 5 },
    { money: 1500, position: 5 },
  ],
  squares: Array.from({ length: 40 }, () => ({ owner: 0 })),
});
const shut = {
  auctionActive: false,
  auctionProperty: null,
  auctionBid: 0,
  auctionBidder: 0,
  auctionTurn: 0,
  auctionPlayers: [],
};

test('bidderUpdate bid: own seat, higher, affordable, turn advances', () => {
  const ok = { ...open, auctionBid: 100, auctionBidder: 3, auctionTurn: 1 };
  assert.ok(bidderUpdate(stored(open), { auction: ok }, 3, 1));
  // framing another bidder
  assert.strictEqual(
    bidderUpdate(stored(open), { auction: { ...ok, auctionBidder: 2 } }, 3, 1),
    null,
  );
  // not higher than the stored bid
  const held = { ...open, auctionBid: 100, auctionBidder: 3, auctionTurn: 1 };
  assert.strictEqual(
    bidderUpdate(stored(held), { auction: { ...held, auctionBidder: 2, auctionTurn: 0 } }, 2, 1),
    null,
  );
  // turn rewound or skipped, passCount not reset
  assert.strictEqual(bidderUpdate(stored(open), { auction: { ...ok, auctionTurn: 0 } }, 3, 1), null);
  assert.strictEqual(bidderUpdate(stored(open), { auction: { ...ok, passCount: 1 } }, 3, 1), null);
});

test('bidderUpdate pass: keeps the bid, advances turn, passCount + 1', () => {
  const held = { ...open, auctionBid: 100, auctionBidder: 3, auctionTurn: 1 };
  const three = { ...held, auctionPlayers: [3, 2, 1], auctionBid: 100 };
  const pass = { ...three, auctionTurn: 2, passCount: 1 };
  assert.ok(bidderUpdate(stored(three), { auction: pass }, 2, 1));
  // stealing the high bid through a pass
  assert.strictEqual(
    bidderUpdate(stored(three), { auction: { ...pass, auctionBidder: 2 } }, 2, 1),
    null,
  );
  assert.strictEqual(
    bidderUpdate(stored(three), { auction: { ...pass, auctionBid: 150 } }, 2, 1),
    null,
  );
  // rewinding the turn or jumping passCount
  assert.strictEqual(bidderUpdate(stored(three), { auction: { ...pass, auctionTurn: 0 } }, 2, 1), null);
  assert.strictEqual(bidderUpdate(stored(three), { auction: { ...pass, passCount: 5 } }, 2, 1), null);
});

test('bidderUpdate close only when the pass rules end the auction', () => {
  // no bid yet, one of two passed: too early
  assert.strictEqual(bidderUpdate(stored({ ...open, passCount: 0 }), { auction: shut }, 3, 1), null);
  // bid held, everyone else passed: allowed, winner pays
  const held = { ...open, auctionBid: 100, auctionBidder: 3, auctionTurn: 1 };
  const got = bidderUpdate(stored(held), { auction: shut }, 2, 1);
  assert.strictEqual(got.players[3].money, 1400);
  assert.strictEqual(got.squares[1].owner, 3);
  // three seats, bid held, only one pass so far: too early
  const early = { ...held, auctionPlayers: [3, 2, 1], auctionTurn: 1 };
  assert.strictEqual(bidderUpdate(stored(early), { auction: shut }, 2, 1), null);
  // nobody bid, all passed: closes with no sale
  const allPassed = { ...open, auctionTurn: 1, passCount: 1 };
  assert.ok(bidderUpdate(stored(allPassed), { auction: shut }, 2, 1));
});

test('bankruptcyLimit scales with starting money, default 1500', () => {
  for (const amount of [500, 1000, 1500, 2000, 5000, 10000]) {
    assert.strictEqual(bankruptcyLimit(amount), -amount);
  }
  assert.strictEqual(bankruptcyLimit(), -1500);
});

test('isEliminated: exactly -startingMoney stays in, one below is out', () => {
  for (const amount of [500, 1500, 5000]) {
    assert.strictEqual(isEliminated({ money: -amount }, amount), false);
    assert.strictEqual(isEliminated({ money: -amount - 1 }, amount), true);
  }
  assert.strictEqual(isEliminated({ money: -1500 }), false);
  assert.strictEqual(isEliminated({ money: -1501 }), true);
});

test('bidderUpdate close skips a seat eliminated under the relative limit', () => {
  const held = { ...open, auctionBid: 100, auctionBidder: 3, auctionTurn: 1 };
  // startingMoney 500: seat 1 at -501 is eliminated, so next is 2 and turn 1 is rejected
  const out = stored(held);
  out.players[1].money = -501;
  assert.strictEqual(bidderUpdate(out, { auction: shut, turn: 1 }, 2, 3, 500), null);
  assert.ok(bidderUpdate(out, { auction: shut, turn: 2 }, 2, 3, 500));
  // seat 1 at -400 under 500 is alive: turn 1 accepted
  const alive = stored(held);
  alive.players[1].money = -400;
  assert.ok(bidderUpdate(alive, { auction: shut, turn: 1 }, 2, 3, 500));
  // at -1000 default 1500 is alive, at 500 it is eliminated
  const mid = stored(held);
  mid.players[1].money = -1000;
  assert.ok(bidderUpdate(mid, { auction: shut, turn: 1 }, 2, 3));
  assert.strictEqual(bidderUpdate(mid, { auction: shut, turn: 1 }, 2, 3, 500), null);
  // boundary: exactly -500 under 500 is alive
  const edge = stored(held);
  edge.players[1].money = -500;
  assert.ok(bidderUpdate(edge, { auction: shut, turn: 1 }, 2, 3, 500));
});

test('clientIp trusts proxy headers only from a private peer', () => {
  const sock = (address, headers = {}) => ({ handshake: { address, headers } });
  const h = { 'cf-connecting-ip': '8.8.8.8', 'x-forwarded-for': '1.1.1.1, 9.9.9.9' };
  delete process.env.TRUST_PROXY_HEADERS;
  for (const peer of ['127.0.0.1', '::1', '::ffff:10.1.2.3', '172.17.0.2', '172.31.0.1', '192.168.1.5', 'fd12::1']) {
    assert.strictEqual(clientIp(sock(peer, h)), '8.8.8.8', peer);
  }
  assert.strictEqual(clientIp(sock('172.17.0.2', { 'x-forwarded-for': '1.1.1.1, 9.9.9.9' })), '9.9.9.9');
  // public peer: headers are forged, use the socket address
  for (const peer of ['8.8.4.4', '172.32.0.1', '::ffff:11.0.0.1', '2001:db8::1']) {
    assert.strictEqual(clientIp(sock(peer, h)), peer, peer);
  }
  process.env.TRUST_PROXY_HEADERS = '1';
  assert.strictEqual(clientIp(sock('8.8.4.4', h)), '8.8.8.8');
  delete process.env.TRUST_PROXY_HEADERS;
});
