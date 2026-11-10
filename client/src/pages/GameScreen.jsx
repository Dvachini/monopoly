import React, { useContext, useEffect, useRef, useState } from 'react';
import Lobby from '../components/Lobby.jsx';
import Setup from '../components/Setup.jsx';
import Board from '../components/Board.jsx';
import Popup from '../components/Popup.jsx';
import Stats from '../components/Stats.jsx';
import Deed from '../components/Deed.jsx';
import Trade from '../components/Trade.jsx';
import Auction from '../components/Auction.jsx';
import Button from '../components/Button.jsx';
import Pawn from '../components/Pawn.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import GameContext from '../context/GameContext.jsx';

function GameScreen() {
  const { status, players, setShowMoneyBar } = useContext(GameContext);
  const { clearSession, connected, roomCode, gameStarted } = useSocket();

  const [wasOffline, setWasOffline] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [longOffline, setLongOffline] = useState(false);
  const gameOverRef = useRef(null);

  // After a refresh (rejoin) Setup never runs, so nothing turns the Players
  // card on: show it as soon as the game has players
  useEffect(() => {
    if (gameStarted && players && players.length > 0) setShowMoneyBar(true);
  }, [gameStarted, players]);

  // Game over: forget the saved seat so a refresh does not try to rejoin
  useEffect(() => {
    if (status === 'finished') {
      clearSession();
      if (gameOverRef.current) gameOverRef.current.focus();
    }
  }, [status]);

  // Connection banner (multiplayer only): lost, still trying, back online
  useEffect(() => {
    if (!roomCode) {
      setWasOffline(false);
      setLongOffline(false);
      return undefined;
    }
    if (!connected) {
      setWasOffline(true);
      const t = setTimeout(() => setLongOffline(true), 20000);
      return () => clearTimeout(t);
    }
    setLongOffline(false);
    if (wasOffline) {
      setWasOffline(false);
      setShowBack(true);
      const t = setTimeout(() => setShowBack(false), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [connected, roomCode]);

  if (status === 'finished') {
    // Winner = the only player still in the game (index 0 is the bank).
    // The game only ends by resignation, so anything else shows no name.
    const remaining = players.filter((p, i) => i > 0 && p.position >= 0);
    const winner = remaining.length === 1 ? remaining[0] : null;
    return (
      <div className='flex w-full justify-center p-3 sm:p-5'>
        <div className='card card-gold flex w-full max-w-md flex-col items-center gap-4 p-6 text-center sm:p-8'>
          <svg
            viewBox='0 0 64 64'
            className='h-16 w-16'
            aria-hidden='true'
            fill='none'
          >
            <path
              d='M18 8h28v14a14 14 0 0 1-28 0z'
              fill='#e8b931'
              stroke='#1c1917'
              strokeWidth='3'
              strokeLinejoin='round'
            />
            <path
              d='M18 12H8c0 10 4 16 12 17M46 12h10c0 10-4 16-12 17'
              stroke='#1c1917'
              strokeWidth='3'
              strokeLinecap='round'
            />
            <path
              d='M32 36v10M22 56h20M25 46h14v10H25z'
              fill='#e8b931'
              stroke='#1c1917'
              strokeWidth='3'
              strokeLinejoin='round'
            />
          </svg>
          <h1
            ref={gameOverRef}
            tabIndex={-1}
            className='plate text-(--t-3xl) outline-none'
          >
            Game over
          </h1>
          {winner ? (
            <div className='flex items-center gap-3 font-display text-(--t-2xl) font-bold'>
              <Pawn color={winner.color} n={winner.index} size={48} />
              {winner.name} wins the game!
            </div>
          ) : (
            <p className='text-lg'>The game has ended.</p>
          )}
          <Button
            variant='primary'
            size='lg'
            onClick={() => window.location.reload()}
          >
            Play again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div role='status' aria-live='polite' className='sr-only'>
        {roomCode && !connected
          ? 'Connection lost. Reconnecting. Your seat is saved.'
          : roomCode && showBack
            ? 'Back online'
            : ''}
      </div>
      {roomCode && (!connected || showBack) && (
        <div
          aria-hidden='true'
          className={`sticky inset-x-0 top-0 z-(--z-banner) flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm ${connected ? 'bg-success text-white' : 'bg-[#7f1d1d] text-paper'}`}
        >
          {connected ? (
            'Back online'
          ) : (
            <>
              <svg
                className='h-4 w-4 animate-spin'
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
              <span>Connection lost. Reconnecting... your seat is saved.</span>
              {longOffline && (
                <>
                  <span>Still trying. Check your internet.</span>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => window.location.reload()}
                  >
                    Reload
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      )}
      <Popup />
      <Auction />
      <Stats />
      <Deed />
      <Lobby />
      <Setup />
      <Board />
      <Trade />
    </>
  );
}

export default GameScreen;
