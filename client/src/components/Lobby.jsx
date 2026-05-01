import React, { useState, useContext, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import SocketContext from '../context/SocketContext.jsx';
import GameContext from '../context/GameContext.jsx';

const COLORS = [
  'Yellow',
  'Blue',
  'Red',
  'Lime',
  'Green',
  'Aqua',
  'Orange',
  'Purple',
  'Fuchsia',
  'Maroon',
  'Navy',
  'Olive',
  'Silver',
  'Teal',
];

function Lobby() {
  const {
    connected,
    roomCode,
    roomPlayers,
    isHost,
    lobbyError,
    gameStarted,
    createRoom,
    joinRoom,
    startGame,
    myPlayerIndex,
    rejoining,
  } = useContext(SocketContext);

  const { status, setStatus } = useContext(GameContext);

  const [mode, setMode] = useState(null); // null | 'create' | 'join' | 'local'
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('Yellow');
  const [joinCode, setJoinCode] = useState('');

  // Auto-join if URL has ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !roomCode && connected) {
      setJoinCode(roomParam.toUpperCase());
      setMode('join');
    }
  }, [connected]);

  // Don't show lobby if game is playing, finished, or local setup
  if (status === 'playing' || status === 'finished' || gameStarted) return null;
  if (status === 'setup') return null;
  // Show reconnecting screen while rejoining
  if (rejoining) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[80vh] p-5'>
        <h1 className='mb-2.5 text-3xl font-bold'>Monopoly</h1>
        <p className='text-lg text-blue-600 animate-pulse'>
          Reconnecting to game...
        </p>
      </div>
    );
  }
  // If we're in a room, show the waiting room
  if (roomCode) return <WaitingRoom />;

  const joinUrl = `http://${window.location.hostname}:${window.location.port}?room=${roomCode || ''}`;

  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh] p-5'>
      <h1 className='mb-2.5 text-3xl font-bold'>Monopoly</h1>
      <p
        className={`mb-5 text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}
      >
        {connected ? '● Connected to server' : '○ Connecting...'}
      </p>

      {!mode && (
        <div className='flex flex-col gap-3 items-center'>
          <div className='flex gap-4'>
            <button
              onClick={() => setMode('create')}
              disabled={!connected}
              className='px-7 py-3 text-base font-bold border-none rounded-lg cursor-pointer text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Create Game
            </button>
            <button
              onClick={() => setMode('join')}
              disabled={!connected}
              className='px-7 py-3 text-base font-bold border-none rounded-lg cursor-pointer text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Join Game
            </button>
          </div>
          <button
            onClick={() => {
              setMode('local');
              setStatus('setup');
            }}
            className='px-5 py-2 text-sm font-bold border-none rounded-lg cursor-pointer text-white bg-orange-500 hover:bg-orange-600'
          >
            Play Locally (Same Device)
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className='flex flex-col gap-2 p-5 max-w-xs w-full'>
          <h3 className='text-lg font-semibold'>Create Game</h3>
          <label className='text-sm font-medium'>Your Name:</label>
          <input
            type='text'
            maxLength={16}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder='Enter your name'
            className='p-2.5 text-[15px] rounded-md border border-gray-300 outline-none focus:border-blue-500'
          />
          <label className='text-sm font-medium'>Color:</label>
          <select
            value={playerColor}
            onChange={(e) => setPlayerColor(e.target.value)}
            className='p-2.5 text-[15px] rounded-md border border-gray-300 outline-none'
          >
            {COLORS.map((c) => (
              <option key={c} value={c} style={{ color: c.toLowerCase() }}>
                {c}
              </option>
            ))}
          </select>
          <div className='flex gap-2.5 mt-2.5'>
            <button
              onClick={() => {
                createRoom(playerName || 'Player 1', playerColor.toLowerCase());
              }}
              disabled={!connected}
              className='px-7 py-3 text-base font-bold border-none rounded-lg cursor-pointer text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Create Room
            </button>
            <button
              onClick={() => setMode(null)}
              className='px-7 py-3 text-base font-bold border-none rounded-lg cursor-pointer text-white bg-gray-500 hover:bg-gray-600'
            >
              Back
            </button>
          </div>
          {lobbyError && <div className='text-red-600 mt-2'>{lobbyError}</div>}
        </div>
      )}

      {mode === 'join' && (
        <div className='flex flex-col gap-2 p-5 max-w-xs w-full'>
          <h3 className='text-lg font-semibold'>Join Game</h3>
          <label className='text-sm font-medium'>Room Code:</label>
          <input
            type='text'
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder='Enter 6-letter code'
            className='p-2.5 text-xl rounded-md border border-gray-300 outline-none uppercase tracking-[3px] text-center focus:border-blue-500'
          />
          <label className='text-sm font-medium'>Your Name:</label>
          <input
            type='text'
            maxLength={16}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder='Enter your name'
            className='p-2.5 text-[15px] rounded-md border border-gray-300 outline-none focus:border-blue-500'
          />
          <label className='text-sm font-medium'>Color:</label>
          <select
            value={playerColor}
            onChange={(e) => setPlayerColor(e.target.value)}
            className='p-2.5 text-[15px] rounded-md border border-gray-300 outline-none'
          >
            {COLORS.map((c) => (
              <option key={c} value={c} style={{ color: c.toLowerCase() }}>
                {c}
              </option>
            ))}
          </select>
          <div className='flex gap-2.5 mt-2.5'>
            <button
              onClick={() => {
                joinRoom(
                  joinCode,
                  playerName || 'Player',
                  playerColor.toLowerCase(),
                );
              }}
              disabled={!connected || joinCode.length < 4}
              className='px-7 py-3 text-base font-bold border-none rounded-lg cursor-pointer text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Join Room
            </button>
            <button
              onClick={() => setMode(null)}
              className='px-7 py-3 text-base font-bold border-none rounded-lg cursor-pointer text-white bg-gray-500 hover:bg-gray-600'
            >
              Back
            </button>
          </div>
          {lobbyError && <div className='text-red-600 mt-2'>{lobbyError}</div>}
        </div>
      )}
    </div>
  );
}

function WaitingRoom() {
  const {
    roomCode,
    roomPlayers,
    isHost,
    lobbyError,
    startGame,
    myPlayerIndex,
  } = useContext(SocketContext);

  const joinUrl = `http://${window.location.hostname}:${window.location.port}?room=${roomCode}`;

  return (
    <div className='flex flex-col items-center p-5 min-h-[80vh]'>
      <h2 className='mb-1.5 text-2xl font-bold'>Waiting Room</h2>

      <div className='bg-gray-100 rounded-xl p-5 text-center mb-5 border-2 border-gray-200'>
        <div className='text-[13px] text-gray-500 mb-1.5'>Room Code</div>
        <div className='text-4xl font-bold tracking-[8px] font-mono text-gray-800'>
          {roomCode}
        </div>
      </div>

      <div className='mb-5'>
        <QRCodeSVG
          value={joinUrl}
          size={180}
          level='M'
          className='border-8 border-white rounded-lg'
        />
        <div className='text-[11px] text-gray-400 mt-1.5 text-center max-w-50 break-all'>
          {joinUrl}
        </div>
      </div>

      <div className='mb-5 w-full max-w-87.5'>
        <h4 className='mb-2 text-base font-semibold'>
          Players ({roomPlayers.length}/8)
        </h4>
        {roomPlayers.map((p, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 px-3 py-2 mb-1 border border-gray-200 rounded-md ${p.index === myPlayerIndex ? 'bg-green-50' : 'bg-white'}`}
            style={{ borderLeft: `5px solid ${p.color}` }}
          >
            <span
              className='w-5 h-5 rounded-full inline-block'
              style={{ backgroundColor: p.color }}
            />
            <span className='font-bold'>{p.name}</span>
            {i === 0 && (
              <span className='text-[11px] text-gray-400 ml-auto'>Host</span>
            )}
            {p.index === myPlayerIndex && (
              <span
                className={`text-[11px] text-green-600 ${i === 0 ? 'ml-1.5' : 'ml-auto'}`}
              >
                You
              </span>
            )}
          </div>
        ))}
      </div>

      {isHost && (
        <button
          onClick={startGame}
          disabled={roomPlayers.length < 2}
          className={`px-7 py-3 text-base font-bold border-none rounded-lg cursor-pointer text-white ${roomPlayers.length >= 2 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          Start Game ({roomPlayers.length} players)
        </button>
      )}

      {!isHost && (
        <div className='text-gray-500 text-sm'>
          Waiting for host to start the game...
        </div>
      )}

      {lobbyError && <div className='text-red-600 mt-2'>{lobbyError}</div>}
    </div>
  );
}

export default Lobby;
