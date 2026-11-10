const { timingSafeEqual } = require('crypto');
const {
  STARTING_MONEY_OPTIONS,
  isPlainObject,
  sanitizeName,
  normalizeColor,
  checkStateShape,
  bidderUpdate,
  DEFAULT_STARTING_MONEY,
  clientIp,
  makeRoomCode,
  makeToken,
} = require('./validate');

const MAX_PLAYERS = 8;
// Names nobody may take: they read like system messages in chat
const RESERVED_NAMES = ['system', 'bank', 'server'];

// Comparison key for names: fullwidth/compat forms fold to plain, any case
const foldName = (name) => name.normalize('NFKC').toLowerCase();

module.exports = function (io, opts = {}) {
  // In-memory room store (one per app instance)
  const rooms = new Map();
  const maxRooms = opts.maxRooms || 200;
  // A seat/room is kept this long after everyone left; idle rooms die at ttl
  const graceMs = opts.graceMs || Number(process.env.ROOM_GRACE_MS) || 120000;
  const ttlMs = opts.ttlMs || Number(process.env.ROOM_TTL_MS) || 21600000;
  // Per-socket token bucket: 30 events, refilled 30 per 10 s
  const bucketMax = 30;
  const bucketPerMs = 30 / 10000;
  const notifyMs = opts.throttleNotifyMs ?? 1000;
  const maxStrikes = 3;
  // Strikes are forgotten after this long without a throttle notice
  const strikeResetMs =
    opts.strikeResetMs ?? (Number(process.env.STRIKE_RESET_MS) || 30000);
  // Abuse caps per client IP (concurrent sockets, live rooms created)
  const maxSocketsPerIp =
    opts.maxSocketsPerIp || Number(process.env.MAX_SOCKETS_PER_IP) || 20;
  const maxRoomsPerIp =
    opts.maxRoomsPerIp || Number(process.env.MAX_ROOMS_PER_IP) || 5;
  const socketsPerIp = new Map();
  // Per-player rename and per-room starting-cash change windows
  const renameThrottleMs = opts.renameThrottleMs ?? 3000;
  const moneyThrottleMs = opts.moneyThrottleMs ?? 1000;

  // Safe view of the players: no socketId, no token
  const publicPlayers = (room) =>
    room.players.map((p) => ({
      index: p.index,
      name: p.name,
      color: p.color,
      disconnected: !!p.disconnected,
    }));

  // Lowest free seat 1..8
  const freeIndex = (room) => {
    for (let i = 1; i <= MAX_PLAYERS; i++) {
      if (!room.players.some((p) => p.index === i)) return i;
    }
    return 0;
  };

  // Sweep: free lobby seats nobody came back for, empty rooms, idle rooms
  const sweep = setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, code) => {
      if (now - room.lastActive > ttlMs) {
        rooms.delete(code);
        console.log(`Room ${code} deleted (idle)`);
        return;
      }
      if (!room.started) {
        const before = room.players.length;
        room.players = room.players.filter(
          (p) => !p.disconnected || now - p.leftAt <= graceMs,
        );
        if (room.players.length !== before && room.players.length > 0) {
          if (!room.players.some((p) => p.index === room.hostIndex)) {
            const next = room.players.find((p) => !p.disconnected);
            if (next) room.hostIndex = next.index;
          }
          io.to(code).emit('room-updated', {
            players: publicPlayers(room),
            hostIndex: room.hostIndex,
          });
        }
      }
      if (
        room.players.length === 0 ||
        (room.emptySince && now - room.emptySince > graceMs)
      ) {
        rooms.delete(code);
        console.log(`Room ${code} deleted (empty)`);
      }
    });
  }, opts.sweepMs || 10000);
  sweep.unref();

  // Cap concurrent sockets per IP
  io.use((socket, next) => {
    const ip = clientIp(socket);
    const count = socketsPerIp.get(ip) || 0;
    if (count >= maxSocketsPerIp) {
      next(new Error('Too many connections'));
      return;
    }
    socketsPerIp.set(ip, count + 1);
    socket.on('disconnect', () => {
      const left = (socketsPerIp.get(ip) || 1) - 1;
      if (left > 0) socketsPerIp.set(ip, left);
      else socketsPerIp.delete(ip);
    });
    next();
  });

  io.on('connection', (socket) => {
    // Throttle: drop events over the limit, warn, disconnect repeat abusers
    let tokens = bucketMax;
    let last = Date.now();
    let lastNotice = 0;
    let strikes = 0;
    socket.use((packet, next) => {
      const now = Date.now();
      tokens = Math.min(bucketMax, tokens + (now - last) * bucketPerMs);
      last = now;
      if (tokens >= 1) {
        tokens -= 1;
        next();
        return;
      }
      if (now - lastNotice >= notifyMs) {
        if (now - lastNotice >= strikeResetMs) strikes = 0;
        lastNotice = now;
        socket.emit('throttled');
        strikes += 1;
        if (strikes >= maxStrikes) socket.disconnect(true);
      }
    });

    // Every handler: payload must be a plain object, and errors never escape
    const on = (event, handler, needsPayload = true) => {
      socket.on(event, (payload) => {
        if (needsPayload && !isPlainObject(payload)) return;
        try {
          handler(payload);
        } catch (err) {
          console.log(`[${event}] handler error: ${err.message}`);
        }
      });
    };

    // Only real game events keep a room alive (not pings or ignored noise)
    const touch = (room) => {
      room.lastActive = Date.now();
    };

    // Create a new game room
    on('create-room', ({ playerName, playerColor }) => {
      if (socket.roomCode) return;
      if (rooms.size >= maxRooms) {
        socket.emit('join-error', { message: 'Server is busy, try later.' });
        return;
      }

      let ownRooms = 0;
      rooms.forEach((r) => {
        if (r.ip === clientIp(socket)) ownRooms += 1;
      });
      if (ownRooms >= maxRoomsPerIp) {
        socket.emit('join-error', { message: 'Too many rooms from your network.' });
        return;
      }

      const chosen = sanitizeName(playerName, null);
      if (chosen && RESERVED_NAMES.includes(foldName(chosen))) {
        socket.emit('join-error', { message: 'That name is not allowed.' });
        return;
      }

      let roomCode = makeRoomCode();
      while (rooms.has(roomCode)) {
        roomCode = makeRoomCode();
      }

      const player = {
        socketId: socket.id,
        token: makeToken(),
        name: chosen || 'Player 1',
        color: normalizeColor(playerColor) || 'yellow',
        index: 1,
        disconnected: false,
      };
      const room = {
        code: roomCode,
        ip: clientIp(socket),
        hostIndex: 1,
        players: [player],
        started: false,
        gameState: null,
        turn: 0,
        startingMoney: DEFAULT_STARTING_MONEY,
        lastActive: Date.now(),
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.playerIndex = 1;
      socket.playerName = player.name;

      console.log(`Room ${roomCode} created`);
      socket.emit('room-created', {
        roomCode,
        playerIndex: 1,
        token: player.token,
        players: publicPlayers(room),
        hostIndex: room.hostIndex,
        isHost: true,
        startingMoney: room.startingMoney,
      });
    });

    // Join an existing room
    on('join-room', ({ roomCode, playerName, playerColor }) => {
      if (socket.roomCode) return;
      const code =
        typeof roomCode === 'string' ? roomCode.toUpperCase().trim() : '';
      const room = rooms.get(code);

      if (!room) {
        socket.emit('join-error', { message: 'Room not found.' });
        return;
      }
      if (room.started) {
        socket.emit('join-error', { message: 'Game already started.' });
        return;
      }
      if (room.players.length >= MAX_PLAYERS) {
        socket.emit('join-error', { message: 'Room is full (max 8 players).' });
        return;
      }
      const color = normalizeColor(playerColor);
      if (!color || room.players.some((p) => p.color === color)) {
        socket.emit('join-error', { message: 'Colour not available.' });
        return;
      }

      const chosen = sanitizeName(playerName, null);
      if (chosen && RESERVED_NAMES.includes(foldName(chosen))) {
        socket.emit('join-error', { message: 'That name is not allowed.' });
        return;
      }
      if (chosen && room.players.some((p) => foldName(p.name) === foldName(chosen))) {
        socket.emit('join-error', { message: 'That name is already taken.' });
        return;
      }

      const index = freeIndex(room);
      // No usable name sent: default Player N, skipping numbers already used
      let defaultNumber = index;
      while (
        room.players.some((p) => foldName(p.name) === `player ${defaultNumber}`)
      ) {
        defaultNumber += 1;
      }
      const player = {
        socketId: socket.id,
        token: makeToken(),
        name: chosen || `Player ${defaultNumber}`,
        color,
        index,
        disconnected: false,
      };
      room.players.push(player);
      delete room.emptySince;

      socket.join(code);
      socket.roomCode = code;
      socket.playerIndex = index;
      socket.playerName = player.name;

      console.log(`Player ${index} joined room ${code}`);

      // Notify everyone in the room
      io.to(code).emit('room-updated', {
        players: publicPlayers(room),
        hostIndex: room.hostIndex,
      });

      // Tell the joiner their info (token goes only to this socket)
      socket.emit('room-joined', {
        roomCode: code,
        playerIndex: index,
        token: player.token,
        players: publicPlayers(room),
        hostIndex: room.hostIndex,
        isHost: false,
        startingMoney: room.startingMoney,
      });
    });

    // Peek at a room before joining: taken colours and flags, no names/tokens
    on('room-info', ({ roomCode }) => {
      const code =
        typeof roomCode === 'string' ? roomCode.toUpperCase().trim() : '';
      const room = rooms.get(code);
      if (!room) {
        socket.emit('join-error', { message: 'Room not found.' });
        return;
      }
      socket.emit('room-info', {
        takenColors: room.players.map((p) => p.color),
        started: room.started,
        full: room.players.length >= MAX_PLAYERS,
      });
    });

    // Change own name: seat comes from the socket, never from the payload
    on('rename', ({ name }) => {
      const room = rooms.get(socket.roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const now = Date.now();
      if (now - (player.lastRenameAt || 0) < renameThrottleMs) {
        socket.emit('rename-error', { message: 'Slow down, try again in a few seconds.' });
        return;
      }
      // Any attempt that gets past the throttle uses up the window
      player.lastRenameAt = now;
      const clean = sanitizeName(name, null);
      if (!clean) {
        socket.emit('rename-error', {
          message: 'Name must be 1-20 letters, numbers or spaces.',
        });
        return;
      }
      if (clean === player.name) return;
      if (RESERVED_NAMES.includes(foldName(clean))) {
        socket.emit('rename-error', { message: 'That name is not allowed.' });
        return;
      }
      if (
        room.players.some(
          (p) => p !== player && foldName(p.name) === foldName(clean),
        )
      ) {
        socket.emit('rename-error', { message: 'That name is already taken.' });
        return;
      }

      const from = player.name;
      player.name = clean;
      socket.playerName = clean;
      if (room.started && room.gameState && Array.isArray(room.gameState.players)) {
        if (isPlainObject(room.gameState.players[player.index])) {
          room.gameState.players[player.index].name = clean;
        }
      }
      touch(room);
      io.to(room.code).emit('room-updated', {
        players: publicPlayers(room),
        hostIndex: room.hostIndex,
        renamed: { index: player.index, from, to: clean },
      });
    });

    // Host picks the starting cash before the game starts
    on('set-starting-money', ({ amount }) => {
      const room = rooms.get(socket.roomCode);
      if (!room || room.started) return;
      if (room.hostIndex !== socket.playerIndex) return;

      const now = Date.now();
      if (now - (room.lastMoneyAt || 0) < moneyThrottleMs) {
        socket.emit('money-error', { message: 'Slow down.' });
        return;
      }
      if (!STARTING_MONEY_OPTIONS.includes(amount)) {
        socket.emit('money-error', { message: 'Starting cash not allowed.' });
        return;
      }

      room.lastMoneyAt = now;
      room.startingMoney = amount;
      touch(room);
      io.to(room.code).emit('room-updated', {
        players: publicPlayers(room),
        hostIndex: room.hostIndex,
        startingMoney: room.startingMoney,
      });
    });

    // Host starts the game
    on(
      'start-game',
      () => {
        const room = rooms.get(socket.roomCode);
        if (!room || room.started) return;
        if (room.hostIndex !== socket.playerIndex) return;
        if (room.players.filter((p) => !p.disconnected).length < 2) {
          socket.emit('start-error', { message: 'Need at least 2 players.' });
          return;
        }

        // Seats held by someone who left are dropped; the rest are numbered
        // 1..N in order, which is how the client numbers the game players
        room.players = room.players
          .filter((p) => !p.disconnected)
          .sort((a, b) => a.index - b.index);
        const oldHost = room.hostIndex;
        room.players.forEach((p, i) => {
          if (p.index === oldHost) room.hostIndex = i + 1;
          p.index = i + 1;
          const s = io.sockets.sockets.get(p.socketId);
          if (s) s.playerIndex = p.index;
        });

        room.started = true;
        room.turn = 1;
        touch(room);
        console.log(`Game started in room ${room.code}`);
        // Each socket learns its own (possibly new) seat number
        room.players.forEach((p) => {
          io.to(p.socketId).emit('game-started', {
            players: publicPlayers(room),
            hostIndex: room.hostIndex,
            playerIndex: p.index,
            startingMoney: room.startingMoney,
          });
        });
      },
      false,
    );

    // Rejoin a room after disconnect (tab close/refresh), lobby or game
    on('rejoin-room', ({ roomCode, playerIndex, token }) => {
      const code =
        typeof roomCode === 'string' ? roomCode.toUpperCase().trim() : '';
      const room = rooms.get(code);

      if (socket.roomCode || !room) {
        socket.emit('rejoin-error', { message: 'Room not found.' });
        return;
      }

      // Seat must be disconnected and the token must match (constant time)
      const player = room.players.find(
        (p) => p.index === playerIndex,
      );
      const sent = Buffer.from(typeof token === 'string' ? token : '');
      const real = Buffer.from(player ? player.token : '');
      if (
        !player ||
        sent.length !== real.length ||
        !timingSafeEqual(sent, real)
      ) {
        socket.emit('rejoin-error', {
          message: 'Could not find your seat. You may have been removed.',
        });
        return;
      }

      // Same token, seat still tied to an old socket (refresh race): the
      // rejoiner takes over and the stale socket is dropped
      const stale = player.disconnected
        ? null
        : io.sockets.sockets.get(player.socketId);

      // Restore the player
      player.socketId = socket.id;
      player.disconnected = false;
      delete room.emptySince;

      // Host seat was left empty: the authenticated rejoiner takes it
      const hostSeat = room.players.find((p) => p.index === room.hostIndex);
      if (!hostSeat || hostSeat.disconnected) room.hostIndex = playerIndex;

      socket.join(code);
      socket.roomCode = code;
      socket.playerIndex = playerIndex;
      socket.playerName = player.name;

      console.log(`Player ${playerIndex} rejoined room ${code}`);
      if (stale) {
        stale.emit('replaced');
        stale.disconnect(true);
      }

      // Send the rejoiner the latest game state
      socket.emit('rejoin-success', {
        roomCode: code,
        players: publicPlayers(room),
        playerIndex,
        hostIndex: room.hostIndex,
        isHost: room.hostIndex === playerIndex,
        started: room.started,
        startingMoney: room.startingMoney,
        gameState: room.gameState,
      });

      // Notify others
      io.to(code).emit('room-updated', {
        players: publicPlayers(room),
        hostIndex: room.hostIndex,
      });
      io.to(code).emit('player-reconnected', {
        playerName: player.name,
        playerIndex,
      });
    });

    // Full game state sync (host broadcasts entire state)
    // Only after the game started: host or the player whose turn it is.
    // Exception: auction state, because the bidders are not on turn.
    on('sync-state', ({ gameState }) => {
      const room = rooms.get(socket.roomCode);
      if (!room || !room.started) return;
      if (!checkStateShape(gameState)) return;

      const isHost = room.hostIndex === socket.playerIndex;
      const isTurn = room.turn === socket.playerIndex;
      if (!isHost && !isTurn) {
        // Bidder: only the validated auction update is kept and relayed
        const clean = bidderUpdate(
          room.gameState,
          gameState,
          socket.playerIndex,
          room.turn,
          room.startingMoney,
        );
        if (!clean) return;
        room.gameState = { ...room.gameState, ...clean };
        if (clean.turn !== undefined) room.turn = clean.turn;
        touch(room);
        socket.to(room.code).emit('state-synced', { gameState: clean });
        return;
      }

      // Names belong to the seats: a host sync must not revert a rename
      if (Array.isArray(gameState.players)) {
        room.players.forEach((p) => {
          if (isPlainObject(gameState.players[p.index])) {
            gameState.players[p.index].name = p.name;
          }
        });
      }
      room.gameState = gameState;
      if (gameState.turn !== undefined) room.turn = gameState.turn;
      touch(room);
      socket.to(room.code).emit('state-synced', { gameState });
    });

    // Game action broadcast: host or current-turn player, small and named
    on('game-action', ({ action, data }) => {
      const room = rooms.get(socket.roomCode);
      if (!room || !room.started) return;
      const isHost = room.hostIndex === socket.playerIndex;
      if (!isHost && room.turn !== socket.playerIndex) return;
      if (typeof action !== 'string' || !/^[\w-]{1,40}$/.test(action)) return;
      if (data !== undefined && JSON.stringify(data).length > 10000) return;

      touch(room);
      socket
        .to(room.code)
        .emit('game-action', { action, data, from: socket.playerIndex });
    });

    // Chat message: name comes from the seat, never from the client
    on('chat-message', ({ message }) => {
      const room = rooms.get(socket.roomCode);
      if (!room || typeof message !== 'string') return;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      touch(room);
      io.to(room.code).emit('chat-message', {
        playerName: player.name,
        message: message.trim().slice(0, 200),
      });
    });

    // Disconnect
    on(
      'disconnect',
      () => {
        console.log(`Player disconnected: ${socket.id}`);
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player) return;

        // Hold the seat (lobby and game): rejoin with the token, or the
        // sweep frees it after the grace
        player.disconnected = true;
        player.socketId = null;
        player.leftAt = Date.now();
        console.log(
          `Player ${player.index} disconnected from room ${room.code}`,
        );

        // If host left, assign new host to first connected player
        if (room.hostIndex === player.index) {
          const next = room.players.find((p) => !p.disconnected);
          if (next) room.hostIndex = next.index;
        }

        // Nobody connected: the sweep deletes the room after the grace
        if (room.players.every((p) => p.disconnected)) {
          room.emptySince = Date.now();
        }

        io.to(room.code).emit('room-updated', {
          players: publicPlayers(room),
          hostIndex: room.hostIndex,
        });
        io.to(room.code).emit('player-disconnected', {
          playerIndex: player.index,
          playerName: player.name,
        });
      },
      false,
    );
  });

  // Called by createApp().close()
  return () => clearInterval(sweep);
};
