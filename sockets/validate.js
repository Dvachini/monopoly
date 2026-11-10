const crypto = require('crypto');

const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const COLORS = [
  'yellow',
  'blue',
  'red',
  'lime',
  'green',
  'aqua',
  'orange',
  'purple',
  'fuchsia',
  'maroon',
  'navy',
  'olive',
  'silver',
  'teal',
];

// Starting cash choices the host may pick before the game starts
const STARTING_MONEY_OPTIONS = [500, 1000, 1500, 2000, 5000, 10000];

// Max size of a gameState once JSON-encoded (socket packet cap is 100KB)
const MAX_STATE_BYTES = 90000;

function isPlainObject(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

// Name must be a string, 1-20 chars, letters/numbers/space/_.'- only
function sanitizeName(x, fallback) {
  if (typeof x !== 'string') return fallback;
  const name = x.trim().replace(/\s+/g, ' ');
  if (name.length === 0 || name.length > 20) return fallback;
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(name)) return fallback;
  return name;
}

function normalizeColor(x) {
  if (typeof x !== 'string') return null;
  const color = x.trim().toLowerCase();
  return COLORS.includes(color) ? color : null;
}

// index 0 is the bank, so 8 players = 9 entries; classic board = 40 squares
function checkStateShape(gameState) {
  if (!isPlainObject(gameState)) return false;
  if (gameState.players !== undefined) {
    if (!Array.isArray(gameState.players) || gameState.players.length > 9) {
      return false;
    }
  }
  if (gameState.squares !== undefined) {
    if (!Array.isArray(gameState.squares) || gameState.squares.length > 60) {
      return false;
    }
  }
  if (gameState.turn !== undefined) {
    if (!Number.isInteger(gameState.turn)) return false;
    if (gameState.turn < 0 || gameState.turn > 8) return false;
  }
  if (gameState.auction !== undefined && !isPlainObject(gameState.auction)) {
    return false;
  }
  return JSON.stringify(gameState).length <= MAX_STATE_BYTES;
}

// Update from a seat that is neither host nor on turn (an auction bidder).
// Returns the sanitized state to store and relay, or null to reject.
// - only keys auction/players/squares/turn, anything else is rejected
// - only the seat whose bid it is may send, and only while an auction is stored
// - bid/pass: only the `auction` object is kept (players/squares/turn dropped)
// - close: the server applies the result itself (winner pays the stored bid,
//   gets the square) and ignores the money/owner the bidder sent; the turn
//   must stay or be the next live seat
function bidderUpdate(stored, state, seat, roomTurn) {
  const keys = ['auction', 'players', 'squares', 'turn'];
  if (!Object.keys(state).every((k) => keys.includes(k))) return null;
  const a = state.auction;
  if (!isPlainObject(a)) return null;

  const old = stored && stored.auction;
  if (!old || old.auctionActive !== true) return null;
  if (!Array.isArray(old.auctionPlayers) || old.auctionPlayers.length === 0) {
    return null;
  }
  if (old.auctionPlayers[old.auctionTurn % old.auctionPlayers.length] !== seat) {
    return null;
  }

  const auctionKeys = [
    'auctionActive',
    'auctionProperty',
    'auctionBid',
    'auctionBidder',
    'auctionTurn',
    'auctionPlayers',
    'passCount',
  ];
  if (!Object.keys(a).every((k) => auctionKeys.includes(k))) return null;
  const isInt = (n) => Number.isInteger(n) && n >= 0 && n <= 100000;

  const len = old.auctionPlayers.length;
  const oldPass = old.passCount || 0;

  // Close: only when the pass rules end the auction (this seat's pass is the
  // last one): a bid held and everyone else passed, or nobody bid, all passed
  if (a.auctionActive === false) {
    const passes = oldPass + 1;
    if (old.auctionBid > 0 ? passes < len - 1 : passes < len) return null;
    const players = JSON.parse(JSON.stringify(stored.players || []));
    const squares = JSON.parse(JSON.stringify(stored.squares || []));
    if (old.auctionBid > 0 && old.auctionBidder > 0) {
      if (!players[old.auctionBidder] || !squares[old.auctionProperty]) {
        return null;
      }
      players[old.auctionBidder].money -= old.auctionBid;
      squares[old.auctionProperty].owner = old.auctionBidder;
    }

    // Turn: unchanged, or the next seat still in the game
    let next = roomTurn;
    for (let i = 1; i < players.length; i++) {
      next = (next % (players.length - 1)) + 1;
      if (players[next].position >= 0 && players[next].money >= -1500) break;
    }
    if (state.turn !== undefined && state.turn !== roomTurn && state.turn !== next) {
      return null;
    }
    return {
      auction: {
        auctionActive: false,
        auctionProperty: null,
        auctionBid: 0,
        auctionBidder: 0,
        auctionTurn: 0,
        auctionPlayers: [],
      },
      players,
      squares,
      turn: state.turn !== undefined ? state.turn : roomTurn,
    };
  }

  // Bid / pass: same auction, turn moves to the next seat in the rotation
  if (a.auctionActive !== true) return null;
  if (a.auctionProperty !== old.auctionProperty) return null;
  if (JSON.stringify(a.auctionPlayers) !== JSON.stringify(old.auctionPlayers)) {
    return null;
  }
  if (!isInt(a.auctionBid) || !isInt(a.auctionBidder)) return null;
  if (a.auctionTurn !== (old.auctionTurn + 1) % len) return null;

  // Bid: this seat, higher than the stored bid, affordable, passCount reset
  if (a.auctionBid > old.auctionBid) {
    const bidder = stored.players && stored.players[seat];
    if (a.auctionBidder !== seat || a.passCount !== 0) return null;
    if (!bidder || a.auctionBid > bidder.money) return null;
    return { auction: a };
  }

  // Pass: bid and bidder stay as stored, passCount goes up by one
  if (a.auctionBid !== old.auctionBid) return null;
  if (a.auctionBidder !== old.auctionBidder) return null;
  if (a.passCount !== oldPass + 1) return null;
  return { auction: a };
}

// Peer is loopback, RFC1918 (incl. docker bridge) or IPv6 ULA/link-local
function isPrivatePeer(address) {
  const ip = String(address || '').replace(/^::ffff:/i, '').toLowerCase();
  if (ip === '::1') return true;
  if (/^(127|10)\.\d+\.\d+\.\d+$/.test(ip)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(ip)) return true;
  return /^(f[cd][0-9a-f]{2}|fe80):/.test(ip);
}

// Client IP: proxy headers (Cloudflare, else the last X-Forwarded-For hop)
// are honoured only when the TCP peer is private or TRUST_PROXY_HEADERS=1;
// otherwise a client could forge them to dodge the per-IP caps
function clientIp(socket) {
  const peer = socket.handshake.address;
  if (process.env.TRUST_PROXY_HEADERS === '1' || isPrivatePeer(peer)) {
    const h = socket.handshake.headers;
    if (typeof h['cf-connecting-ip'] === 'string') {
      return h['cf-connecting-ip'].trim();
    }
    if (typeof h['x-forwarded-for'] === 'string') {
      return h['x-forwarded-for'].split(',').pop().trim();
    }
  }
  return peer;
}

function makeRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CHARS[crypto.randomInt(ROOM_CHARS.length)];
  }
  return code;
}

function makeToken() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = {
  STARTING_MONEY_OPTIONS,
  isPlainObject,
  sanitizeName,
  normalizeColor,
  checkStateShape,
  bidderUpdate,
  clientIp,
  makeRoomCode,
  makeToken,
};
