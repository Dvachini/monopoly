// In-memory room store
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = function (io) {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Create a new game room
    socket.on('create-room', ({ playerName, playerColor }) => {
      let roomCode = generateRoomCode();
      while (rooms.has(roomCode)) {
        roomCode = generateRoomCode();
      }

      const room = {
        code: roomCode,
        host: socket.id,
        players: [
          {
            socketId: socket.id,
            name: playerName || 'Player 1',
            color: playerColor || 'yellow',
            index: 1,
            ready: true,
          },
        ],
        started: false,
        gameState: null,
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.playerIndex = 1;

      console.log(`Room ${roomCode} created by ${playerName}`);
      socket.emit('room-created', {
        roomCode,
        players: room.players,
        isHost: true,
      });
    });

    // Join an existing room
    socket.on('join-room', ({ roomCode, playerName, playerColor }) => {
      const code = (roomCode || '').toUpperCase().trim();
      const room = rooms.get(code);

      if (!room) {
        socket.emit('join-error', { message: 'Room not found.' });
        return;
      }
      if (room.started) {
        socket.emit('join-error', { message: 'Game already started.' });
        return;
      }
      if (room.players.length >= 8) {
        socket.emit('join-error', { message: 'Room is full (max 8 players).' });
        return;
      }

      const playerIndex = room.players.length + 1;
      room.players.push({
        socketId: socket.id,
        name: playerName || `Player ${playerIndex}`,
        color: playerColor || 'blue',
        index: playerIndex,
        ready: true,
      });

      socket.join(code);
      socket.roomCode = code;
      socket.playerIndex = playerIndex;

      console.log(`${playerName} joined room ${code}`);

      // Notify everyone in the room
      io.to(code).emit('room-updated', {
        players: room.players,
        isHost: false,
      });

      // Tell the joiner their info
      socket.emit('room-joined', {
        roomCode: code,
        players: room.players,
        playerIndex,
        isHost: false,
      });
    });

    // Host starts the game
    socket.on('start-game', () => {
      const code = socket.roomCode;
      const room = rooms.get(code);
      if (!room) return;
      if (room.host !== socket.id) return;
      if (room.players.length < 2) {
        socket.emit('start-error', { message: 'Need at least 2 players.' });
        return;
      }

      room.started = true;
      console.log(`Game started in room ${code}`);
      io.to(code).emit('game-started', {
        players: room.players,
      });
    });

    // Rejoin a room after disconnect (tab close/refresh)
    socket.on('rejoin-room', ({ roomCode, playerName, playerIndex }) => {
      const code = (roomCode || '').toUpperCase().trim();
      const room = rooms.get(code);

      if (!room || !room.started) {
        socket.emit('rejoin-error', {
          message: 'Room not found or game not started.',
        });
        return;
      }

      // Find the disconnected player by name and index
      const player = room.players.find(
        (p) =>
          p.index === playerIndex && p.name === playerName && p.disconnected,
      );

      if (!player) {
        socket.emit('rejoin-error', {
          message: 'Could not find your seat. You may have been removed.',
        });
        return;
      }

      // Restore the player
      player.socketId = socket.id;
      player.disconnected = false;

      socket.join(code);
      socket.roomCode = code;
      socket.playerIndex = playerIndex;

      // If no host is connected, make this player the host
      const currentHost = room.players.find(
        (p) => p.socketId === room.host && !p.disconnected,
      );
      if (!currentHost) {
        room.host = socket.id;
      }

      console.log(`${playerName} rejoined room ${code}`);

      // Send the rejoiner the latest game state
      socket.emit('rejoin-success', {
        roomCode: code,
        players: room.players,
        playerIndex,
        isHost: room.host === socket.id,
        gameState: room.gameState,
      });

      // Notify others
      io.to(code).emit('room-updated', {
        players: room.players,
      });
      io.to(code).emit('player-reconnected', {
        playerName,
        playerIndex,
      });
    });

    // Full game state sync (host broadcasts entire state)
    socket.on('sync-state', ({ gameState }) => {
      const code = socket.roomCode;
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;

      room.gameState = gameState;
      socket.to(code).emit('state-synced', { gameState });
    });

    // Game action broadcast — single event for all game actions
    socket.on('game-action', ({ action, data }) => {
      const code = socket.roomCode;
      if (!code) return;
      socket
        .to(code)
        .emit('game-action', { action, data, from: socket.playerIndex });
    });

    // Chat message
    socket.on('chat-message', ({ playerName, message }) => {
      const code = socket.roomCode;
      if (!code) return;
      io.to(code).emit('chat-message', { playerName, message });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      const code = socket.roomCode;
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;

      if (room.started) {
        // Mark player as disconnected instead of removing
        const player = room.players.find((p) => p.socketId === socket.id);
        if (player) {
          player.disconnected = true;
          player.socketId = null;
          console.log(
            `${player.name} disconnected from room ${code} (game in progress)`,
          );
        }

        // If host left, assign new host to first connected player
        if (room.host === socket.id) {
          const connectedPlayer = room.players.find((p) => !p.disconnected);
          if (connectedPlayer) {
            room.host = connectedPlayer.socketId;
          }
        }

        io.to(code).emit('room-updated', {
          players: room.players,
        });
        io.to(code).emit('player-disconnected', {
          socketId: socket.id,
          playerName: player ? player.name : '',
        });

        // Delete room if ALL players disconnected
        const allDisconnected = room.players.every((p) => p.disconnected);
        if (allDisconnected) {
          rooms.delete(code);
          console.log(`Room ${code} deleted (all players disconnected)`);
        }
      } else {
        // Lobby phase — remove player entirely
        room.players = room.players.filter((p) => p.socketId !== socket.id);

        if (room.players.length === 0) {
          rooms.delete(code);
          console.log(`Room ${code} deleted (empty)`);
        } else {
          if (room.host === socket.id) {
            room.host = room.players[0].socketId;
          }
          io.to(code).emit('room-updated', {
            players: room.players,
            hostLeft: room.host === socket.id,
          });
          io.to(code).emit('player-disconnected', {
            socketId: socket.id,
            playerName: socket.playerName,
          });
        }
      }
    });
  });
};
