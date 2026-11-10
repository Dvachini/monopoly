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
  const [roomCode, setRoomCode] = useState(null);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [hostIndex, setHostIndex] = useState(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [lobbyError, setLobbyError] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [rejoining, setRejoining] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null); // {takenColors, started, full}
  const [startingMoney, setStartingMoneyState] = useState(1500);
  const [renameError, setRenameError] = useState('');
  const rejoinAttempted = useRef(false);
  const rejoinTimer = useRef(null);
  // Another tab took our seat: do not reconnect and fight for it
  const replaced = useRef(false);

  // The host is whoever the server says, so it follows host hand-over
  const isHost = hostIndex !== null && hostIndex === myPlayerIndex;

  useEffect(() => {
    // In production, connect to same origin. In dev, connect to port 5000.
    const serverUrl = import.meta.env.PROD
      ? window.location.origin
      : `http://${window.location.hostname}:5000`;
    const newSocket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      setConnected(true);

      // Attempt rejoin on connect/reconnect, in lobby or in game
      const session = loadSession();
      if (
        session &&
        session.roomCode &&
        session.token &&
        !rejoinAttempted.current
      ) {
        rejoinAttempted.current = true;
        setRejoining(true);
        console.log('Attempting to rejoin room', session.roomCode);
        newSocket.emit('rejoin-room', {
          roomCode: session.roomCode,
          playerIndex: session.playerIndex,
          token: session.token,
        });
        // No answer in time: stop showing the reconnecting screen
        clearTimeout(rejoinTimer.current);
        rejoinTimer.current = setTimeout(() => setRejoining(false), 8000);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected');
      setConnected(false);
      // Allow rejoin attempt on next connect
      rejoinAttempted.current = false;
      // The server dropped us (e.g. throttle): socket.io will not retry by
      // itself, so reconnect and let the rejoin flow run
      if (reason === 'io server disconnect' && !replaced.current) {
        newSocket.connect();
      }
    });

    newSocket.on('replaced', () => {
      replaced.current = true;
    });

    newSocket.on('connect_error', (err) => {
      console.log('Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      clearTimeout(rejoinTimer.current);
      newSocket.close();
    };
  }, []);

  // Room/lobby event listeners
  useEffect(() => {
    if (!socket) return;

    // token is only sent to this socket; keep it in the session, never log it
    socket.on(
      'room-created',
      ({
        roomCode: code,
        players,
        playerIndex,
        token,
        hostIndex: host,
        startingMoney: money,
      }) => {
        setRoomCode(code);
        setRoomPlayers(players);
        setHostIndex(host);
        if (money !== undefined) setStartingMoneyState(money);
        setMyPlayerIndex(playerIndex);
        setLobbyError('');
        saveSession({
          roomCode: code,
          playerIndex,
          token,
          gameStarted: false,
        });
      },
    );

    socket.on(
      'room-joined',
      ({
        roomCode: code,
        players,
        playerIndex,
        token,
        hostIndex: host,
        startingMoney: money,
      }) => {
        setRoomCode(code);
        setRoomPlayers(players);
        setHostIndex(host);
        if (money !== undefined) setStartingMoneyState(money);
        setMyPlayerIndex(playerIndex);
        setLobbyError('');
        saveSession({
          roomCode: code,
          playerIndex,
          token,
          gameStarted: false,
        });
      },
    );

    // renamed is handled where the game state lives (Setup.jsx)
    socket.on('room-updated', ({ players, hostIndex: host, startingMoney: money, renamed }) => {
      if (renamed) setRenameError('');
      setRoomPlayers(players);
      if (host !== undefined) setHostIndex(host);
      if (money !== undefined) setStartingMoneyState(money);
    });

    socket.on('room-info', (info) => {
      setRoomInfo(info);
    });

    socket.on('rename-error', ({ message }) => {
      setRenameError(message);
    });

    socket.on('money-error', ({ message }) => {
      setLobbyError(message);
    });

    socket.on('join-error', ({ message }) => {
      setLobbyError(message);
    });

    socket.on('start-error', ({ message }) => {
      setLobbyError(message);
    });

    // Seats are renumbered 1..N at start: adopt the new numbers
    socket.on(
      'game-started',
      ({ players, hostIndex: host, playerIndex, startingMoney: money }) => {
        setRoomPlayers(players);
        if (host !== undefined) setHostIndex(host);
        if (money !== undefined) setStartingMoneyState(money);
        if (playerIndex !== undefined) setMyPlayerIndex(playerIndex);
        setGameStarted(true);
        setRenameError('');
        // Mark session as in-game so reconnect works
        const session = loadSession();
        if (session) {
          saveSession({
            ...session,
            playerIndex: playerIndex ?? session.playerIndex,
            gameStarted: true,
          });
        }
      },
    );

    socket.on('player-disconnected', ({ socketId }) => {
      // handled by room-updated
    });

    // Rejoin handlers
    socket.on(
      'rejoin-success',
      ({
        roomCode: code,
        players,
        playerIndex,
        hostIndex: host,
        gameState,
        started,
        startingMoney: money,
      }) => {
        console.log('Rejoin successful');
        clearTimeout(rejoinTimer.current);
        setRoomCode(code);
        setRoomPlayers(players);
        if (host !== undefined) setHostIndex(host);
        if (money !== undefined) setStartingMoneyState(money);
        setMyPlayerIndex(playerIndex);
        // In the lobby there is no game state yet: stay in the waiting room
        const inGame = started !== undefined ? started : !!gameState;
        if (inGame) setGameStarted(true);
        setRejoining(false);
        // Keep the stored token (the server does not send it again)
        const session = loadSession();
        saveSession({
          ...session,
          roomCode: code,
          playerIndex,
          gameStarted: inGame,
        });
      },
    );

    socket.on('rejoin-error', ({ message }) => {
      console.log('Rejoin failed:', message);
      clearTimeout(rejoinTimer.current);
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
      socket.off('room-info');
      socket.off('rename-error');
      socket.off('money-error');
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

  // Ask which colours are taken in a room before joining it
  const fetchRoomInfo = (code) => {
    if (socket) {
      socket.emit('room-info', { roomCode: code });
    }
  };

  const renamePlayer = (name) => {
    if (socket) {
      setRenameError('');
      socket.emit('rename', { name });
    }
  };

  const setStartingMoney = (amount) => {
    if (socket) {
      setLobbyError('');
      socket.emit('set-starting-money', { amount });
    }
  };

  const startGame = () => {
    if (socket) {
      socket.emit('start-game');
    }
  };

  const emit = (event, data) => {
    if (socket) {
      socket.emit(event, data);
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
    roomCode,
    roomPlayers,
    hostIndex,
    isHost,
    myPlayerIndex,
    lobbyError,
    setLobbyError,
    gameStarted,
    setGameStarted,
    rejoining,
    clearSession,
    createRoom,
    joinRoom,
    roomInfo,
    setRoomInfo,
    fetchRoomInfo,
    startingMoney,
    setStartingMoney,
    renameError,
    setRenameError,
    renamePlayer,
    startGame,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export default SocketContext;
