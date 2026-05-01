import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

// Save/load session for reconnection
const saveSession = (data) => {
  try {
    sessionStorage.setItem('monopoly-session', JSON.stringify(data));
  } catch (e) {}
};
const loadSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('monopoly-session'));
  } catch (e) {
    return null;
  }
};
const clearSession = () => {
  try {
    sessionStorage.removeItem('monopoly-session');
  } catch (e) {}
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [lobbyError, setLobbyError] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [rejoining, setRejoining] = useState(false);
  const rejoinAttempted = useRef(false);

  useEffect(() => {
    // Connect to server using same hostname (works for LAN)
    const serverUrl = `http://${window.location.hostname}:5000`;
    const newSocket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);

      // Attempt rejoin on reconnect
      const session = loadSession();
      if (
        session &&
        session.roomCode &&
        session.gameStarted &&
        !rejoinAttempted.current
      ) {
        rejoinAttempted.current = true;
        setRejoining(true);
        console.log('Attempting to rejoin room', session.roomCode);
        newSocket.emit('rejoin-room', {
          roomCode: session.roomCode,
          playerName: session.playerName,
          playerIndex: session.playerIndex,
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
      // Allow rejoin attempt on next connect
      rejoinAttempted.current = false;
    });

    newSocket.on('connect_error', (err) => {
      console.log('Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Room/lobby event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('room-created', ({ roomCode: code, players, isHost: host }) => {
      setRoomCode(code);
      setRoomPlayers(players);
      setIsHost(host);
      setMyPlayerIndex(1);
      setLobbyError('');
      // Save session for potential reconnection — playerName filled on create
      const name = players[0]?.name || '';
      saveSession({
        roomCode: code,
        playerName: name,
        playerIndex: 1,
        gameStarted: false,
      });
    });

    socket.on(
      'room-joined',
      ({ roomCode: code, players, playerIndex, isHost: host }) => {
        setRoomCode(code);
        setRoomPlayers(players);
        setIsHost(host);
        setMyPlayerIndex(playerIndex);
        setLobbyError('');
        const me = players.find((p) => p.index === playerIndex);
        saveSession({
          roomCode: code,
          playerName: me?.name || '',
          playerIndex,
          gameStarted: false,
        });
      },
    );

    socket.on('room-updated', ({ players }) => {
      setRoomPlayers(players);
    });

    socket.on('join-error', ({ message }) => {
      setLobbyError(message);
    });

    socket.on('start-error', ({ message }) => {
      setLobbyError(message);
    });

    socket.on('game-started', ({ players }) => {
      setRoomPlayers(players);
      setGameStarted(true);
      // Mark session as in-game so reconnect works
      const session = loadSession();
      if (session) {
        saveSession({ ...session, gameStarted: true });
      }
    });

    socket.on('player-disconnected', ({ socketId }) => {
      // handled by room-updated
    });

    // Rejoin handlers
    socket.on(
      'rejoin-success',
      ({ roomCode: code, players, playerIndex, isHost: host, gameState }) => {
        console.log('Rejoin successful, restoring game state');
        setRoomCode(code);
        setRoomPlayers(players);
        setIsHost(host);
        setMyPlayerIndex(playerIndex);
        setGameStarted(true);
        setRejoining(false);
        // Save updated session
        const me = players.find((p) => p.index === playerIndex);
        saveSession({
          roomCode: code,
          playerName: me?.name || '',
          playerIndex,
          gameStarted: true,
        });
      },
    );

    socket.on('rejoin-error', ({ message }) => {
      console.log('Rejoin failed:', message);
      setRejoining(false);
      clearSession();
    });

    socket.on('player-reconnected', ({ playerName }) => {
      console.log(`${playerName} reconnected`);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-updated');
      socket.off('join-error');
      socket.off('start-error');
      socket.off('game-started');
      socket.off('player-disconnected');
      socket.off('rejoin-success');
      socket.off('rejoin-error');
      socket.off('player-reconnected');
    };
  }, [socket]);

  const createRoom = (playerName, playerColor) => {
    if (socket) {
      socket.emit('create-room', { playerName, playerColor });
    }
  };

  const joinRoom = (code, playerName, playerColor) => {
    if (socket) {
      setLobbyError('');
      socket.emit('join-room', { roomCode: code, playerName, playerColor });
    }
  };

  const startGame = () => {
    if (socket) {
      socket.emit('start-game');
    }
  };

  const joinGame = (id) => {
    if (socket) {
      setGameId(id);
      socket.emit('join-game', id);
    }
  };

  const leaveGame = () => {
    if (socket && gameId) {
      socket.emit('leave-game', gameId);
      setGameId(null);
    }
  };

  const emit = (event, data) => {
    if (socket) {
      socket.emit(event, { gameId, ...data });
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    connected,
    gameId,
    roomCode,
    roomPlayers,
    isHost,
    myPlayerIndex,
    lobbyError,
    gameStarted,
    setGameStarted,
    rejoining,
    clearSession,
    createRoom,
    joinRoom,
    startGame,
    joinGame,
    leaveGame,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export default SocketContext;
