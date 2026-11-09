import React, { useState, useContext, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import SocketContext from '../context/SocketContext.jsx';
import GameContext from '../context/GameContext.jsx';
import Button from './Button.jsx';

const COLORS = [
  'Yellow',
  'Blue',
  'Red',
  'Lime',
  'Green',
  'Aqua',
  'Orange',
  'Purple',
];

function Lobby() {
  const {
    connected,
    roomCode,
    roomPlayers,
    lobbyError,
    gameStarted,
    createRoom,
    joinRoom,
    rejoining,
  } = useContext(SocketContext);

  const { status, setStatus } = useContext(GameContext);

  const [mode, setMode] = useState(null); // null | 'create' | 'join'
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
  if (rejoining) return <Rejoining />;
  // If we're in a room, show the waiting room
  if (roomCode) return <WaitingRoom />;

  return (
    <div className='flex min-h-[calc(100dvh-2rem)] w-full flex-col max-sm:min-h-[calc(100dvh-1rem)] items-center justify-center p-3 pb-[8dvh] sm:p-5'>
      <div aria-hidden='true' className='mb-3 flex items-end gap-3'>
        <div className='die die-five -rotate-8' />
        <div className='die die-two rotate-10' />
      </div>
      <h1 className='wordmark mb-3'>Monopoly</h1>
      <p role='status' className='conn-pill mb-6'>
        <span
          aria-hidden='true'
          className={`conn-dot ${connected ? '' : 'conn-dot-off motion-safe:animate-pulse'}`}
        />
        {connected ? 'Connected to server' : 'Connecting to server...'}
      </p>

      {!mode && (
        <div className='flex w-full max-w-xs flex-col items-stretch gap-3'>
          <Button
            variant='primary'
            size='lg'
            full
            onClick={() => setMode('create')}
            disabled={!connected}
          >
            Create Game
          </Button>
          <Button
            size='lg'
            full
            onClick={() => setMode('join')}
            disabled={!connected}
          >
            Join Game
          </Button>
          <Button
            variant='outline'
            full
            onClick={() => setStatus('setup')}
          >
            Play locally (same device)
          </Button>
          {!connected && (
            <p className='text-center text-sm text-paper'>
              Waiting for the server... You can still play locally.
            </p>
          )}
        </div>
      )}

      {mode && (
        <div className='card flex w-full max-w-sm flex-col gap-3 p-4 sm:p-6'>
          <h2 className='font-display text-(--t-2xl) font-bold leading-tight'>
            {mode === 'create' ? 'Create Game' : 'Join Game'}
          </h2>

          {mode === 'join' && (
            <div>
              <label
                htmlFor='lobby-room-code'
                className='mb-1 block text-sm font-semibold'
              >
                Room code
              </label>
              <input
                id='lobby-room-code'
                type='text'
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder='ABCDEF'
                inputMode='text'
                autoCapitalize='characters'
                autoComplete='off'
                autoCorrect='off'
                className='min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-center font-mono text-2xl uppercase tracking-[.3em] text-ink placeholder:text-[#6b6258]'
              />
            </div>
          )}

          <div>
            <label
              htmlFor='lobby-player-name'
              className='mb-1 block text-sm font-semibold'
            >
              Your name
            </label>
            <input
              id='lobby-player-name'
              type='text'
              maxLength={20}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder='Enter your name'
              autoComplete='nickname'
              aria-describedby='lobby-name-help'
              className='min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-base text-ink placeholder:text-[#6b6258]'
            />
            <p id='lobby-name-help' className='mt-1 text-xs text-ink-muted'>
              Up to 20 characters
            </p>
          </div>

          <fieldset>
            <legend className='mb-1 text-sm font-semibold'>Token colour</legend>
            <div className='grid grid-cols-4 gap-2'>
              {COLORS.map((c) => {
                const taken = roomPlayers.some(
                  (p) => p.color === c.toLowerCase(),
                );
                return (
                  <div key={c} className='relative'>
                    <input
                      type='radio'
                      name='lobby-color'
                      id={`lobby-color-${c}`}
                      className='peer sr-only'
                      checked={playerColor === c}
                      disabled={taken}
                      onChange={() => setPlayerColor(c)}
                    />
                    <label
                      htmlFor={`lobby-color-${c}`}
                      className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border-2 p-1 text-xs font-semibold text-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-info ${
                        taken
                          ? 'cursor-not-allowed border-[#cfc3ab] bg-[#e7dfd0] text-ink-muted'
                          : playerColor === c
                            ? 'border-ink bg-white'
                            : 'border-line-strong bg-card'
                      }`}
                    >
                      <span
                        className='disc h-7 w-7'
                        style={{ backgroundColor: c.toLowerCase() }}
                      >
                        {taken && (
                          <svg
                            viewBox='0 0 28 28'
                            className='h-7 w-7'
                            aria-hidden='true'
                          >
                            <path
                              d='M4 24 24 4'
                              stroke='#1c1917'
                              strokeWidth='3'
                            />
                          </svg>
                        )}
                      </span>
                      {taken ? 'Taken' : c}
                    </label>
                    {playerColor === c && !taken && (
                      <svg
                        viewBox='0 0 16 16'
                        className='pointer-events-none absolute right-1 top-1 h-4 w-4 rounded-full bg-ink p-0.5'
                        aria-hidden='true'
                      >
                        <path
                          d='M3 8.5 6.5 12 13 4.5'
                          fill='none'
                          stroke='#fff'
                          strokeWidth='2.2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div role='alert' aria-live='assertive' className='min-h-5 text-sm'>
            {lobbyError && (
              <span className='inline-flex items-start gap-1.5 font-semibold text-danger'>
                <svg
                  viewBox='0 0 16 16'
                  className='mt-0.5 h-4 w-4 flex-none'
                  aria-hidden='true'
                >
                  <circle cx='8' cy='8' r='7' fill='currentColor' />
                  <path
                    d='M8 4v5M8 11v1.5'
                    stroke='#fff'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                  />
                </svg>
                {lobbyError}
              </span>
            )}
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              variant='primary'
              onClick={() =>
                mode === 'create'
                  ? createRoom(
                      playerName.trim() || 'Player 1',
                      playerColor.toLowerCase(),
                    )
                  : joinRoom(
                      joinCode,
                      playerName.trim() || 'Player',
                      playerColor.toLowerCase(),
                    )
              }
              disabled={
                !connected || (mode === 'join' && joinCode.length < 4)
              }
            >
              {mode === 'create' ? 'Create Room' : 'Join Room'}
            </Button>
            <Button onClick={() => setMode(null)}>Back</Button>
          </div>
          {!connected && (
            <p className='text-sm text-ink-muted'>Waiting for the server...</p>
          )}
        </div>
      )}
    </div>
  );
}

function Rejoining() {
  const { clearSession } = useContext(SocketContext);
  const [showEscape, setShowEscape] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowEscape(true), 4000);
    return () => clearTimeout(t);
  }, []);

  let savedCode = '';
  try {
    savedCode = JSON.parse(sessionStorage.getItem('monopoly-session')).roomCode;
  } catch (e) {}

  return (
    <div className='flex min-h-[calc(100dvh-2rem)] w-full flex-col max-sm:min-h-[calc(100dvh-1rem)] items-center justify-center p-3 pb-[8dvh] sm:p-5'>
      <div
        role='status'
        className='card flex w-full max-w-sm flex-col items-center gap-3 p-6 text-center'
      >
        <svg
          className='h-8 w-8 animate-spin text-info'
          viewBox='0 0 24 24'
          fill='none'
          aria-hidden='true'
        >
          <circle
            cx='12'
            cy='12'
            r='9'
            stroke='currentColor'
            strokeWidth='3'
            opacity='0.3'
          />
          <path
            d='M21 12a9 9 0 0 0-9-9'
            stroke='currentColor'
            strokeWidth='3'
            strokeLinecap='round'
          />
        </svg>
        <h1 className='font-display text-(--t-2xl) font-bold leading-tight'>
          Reconnecting to your game...
        </h1>
        {savedCode && (
          <p className='font-mono text-2xl tracking-[.3em]'>{savedCode}</p>
        )}
        <p className='text-sm text-ink-muted'>
          Hang tight, this takes a few seconds.
        </p>
        {showEscape && (
          <Button
            onClick={() => {
              clearSession();
              window.location.assign('/');
            }}
          >
            Leave and start over
          </Button>
        )}
      </div>
    </div>
  );
}

function WaitingRoom() {
  const {
    roomCode,
    roomPlayers,
    hostIndex,
    isHost,
    lobbyError,
    startGame,
    myPlayerIndex,
  } = useContext(SocketContext);

  const [copied, setCopied] = useState(''); // '' | 'code' | 'link'
  const [shareError, setShareError] = useState('');

  const joinUrl = `${window.location.origin}/?room=${roomCode}`;
  const canShare = typeof navigator.share === 'function';

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(''), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyText = async (text, which) => {
    setShareError('');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch (e) {
      setShareError('Could not copy. Please copy it by hand.');
    }
  };

  const handleShare = async () => {
    setShareError('');
    try {
      await navigator.share({
        title: 'Monopoly',
        text: `Join my Monopoly game. Room code: ${roomCode}`,
        url: joinUrl,
      });
    } catch (e) {
      // The user closing the share sheet is not an error
      if (e && e.name === 'AbortError') return;
      copyText(joinUrl, 'link');
    }
  };

  return (
    <div className='flex w-full flex-col items-center p-3 sm:p-5'>
      <div className='card flex w-full max-w-md flex-col items-center gap-4 p-4 sm:p-6'>
        <h1 className='font-display text-(--t-2xl) font-bold leading-tight'>
          Waiting Room
        </h1>

        <div className='w-full rounded-[10px] border-2 border-line bg-card p-4 text-center'>
          <div className='mb-1 text-xs font-semibold text-ink-muted'>
            Room code
          </div>
          <div
            aria-label={`Room code ${roomCode.split('').join(' ')}`}
            className='font-mono text-(--t-code) font-bold tracking-[.2em] text-ink'
          >
            {roomCode}
          </div>
        </div>

        <div className='flex flex-wrap justify-center gap-2'>
          <Button onClick={() => copyText(roomCode, 'code')}>
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </Button>
          {canShare ? (
            <Button variant='primary' onClick={handleShare}>
              Share
            </Button>
          ) : (
            <Button variant='ghost' onClick={() => copyText(joinUrl, 'link')}>
              {copied === 'link' ? 'Copied' : 'Copy link'}
            </Button>
          )}
        </div>
        <div role='status' aria-live='polite' className='min-h-5 text-sm'>
          {copied && <span className='text-success'>Copied to clipboard.</span>}
          {shareError && (
            <span className='font-semibold text-danger'>{shareError}</span>
          )}
        </div>

        <div className='flex flex-col items-center'>
          <QRCodeSVG
            value={joinUrl}
            size={176}
            level='M'
            marginSize={4}
            bgColor='#ffffff'
            aria-label='QR code to join the room'
            className='rounded-lg'
          />
          <details className='mt-2 text-center'>
            <summary className='cursor-pointer text-xs font-semibold text-ink-muted'>
              Show link
            </summary>
            <div className='mt-1 max-w-64 break-all text-xs text-ink-muted'>
              {joinUrl}
            </div>
          </details>
        </div>

        <div className='w-full'>
          <h2 className='mb-2 text-base font-semibold'>
            Players ({roomPlayers.length}/8)
          </h2>
          <ul>
            {roomPlayers.map((p) => (
              <li
                key={p.index}
                className={`mb-1 flex min-h-13 items-center gap-2.5 rounded-md border border-line px-3 py-2 ${p.index === myPlayerIndex ? 'bg-white' : 'bg-card'}`}
                style={{ borderLeft: `5px solid ${p.color}` }}
              >
                <span
                  className='disc h-6 w-6 text-xs'
                  style={{ backgroundColor: p.color }}
                >
                  <span className='disc-num'>{p.index}</span>
                </span>
                <span className='font-bold'>{p.name}</span>
                <span className='ml-auto flex gap-1.5'>
                  {p.index === hostIndex && (
                    <span className='rounded-full border border-line-strong px-2 text-xs font-semibold text-ink-2'>
                      Host
                    </span>
                  )}
                  {p.index === myPlayerIndex && (
                    <span className='rounded-full bg-ink px-2 text-xs font-semibold text-white'>
                      You
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {isHost && (
          <div className='flex w-full flex-col items-center gap-1'>
            <Button
              variant='primary'
              size='lg'
              full
              onClick={startGame}
              disabled={roomPlayers.length < 2}
              aria-describedby='start-reason'
            >
              Start game
              <span className='rounded-full bg-black/10 px-2 text-sm'>
                {roomPlayers.length}/8
              </span>
            </Button>
            <p id='start-reason' className='text-center text-sm text-ink-muted'>
              {roomPlayers.length < 2
                ? 'Need at least 2 players. Share the code to invite friends.'
                : 'Everyone in? Start when ready.'}
            </p>
          </div>
        )}

        {!isHost && (
          <p className='text-sm text-ink-muted'>
            Waiting for the host to start
            <span className='animate-pulse'>...</span>
          </p>
        )}

        <div role='alert' aria-live='assertive' className='min-h-5 text-sm'>
          {lobbyError && (
            <span className='font-semibold text-danger'>{lobbyError}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
