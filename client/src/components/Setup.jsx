import React, { useState, useContext, useEffect } from 'react';
import Button from './Button.jsx';
import GameContext from '../context/GameContext.jsx';
import SocketContext from '../context/SocketContext.jsx';
import { createGameEngine } from '../game/monopoly.jsx';
import { Player } from '../game/models.jsx';
import { STARTING_CASH_OPTIONS } from '../game/constants.jsx';

const DEFAULT_COLORS = [
  'Yellow',
  'Blue',
  'Red',
  'Lime',
  'Green',
  'Aqua',
  'Orange',
  'Purple',
];

function Setup() {
  const {
    status,
    setStatus,
    setShowBoard,
    setShowControl,
    setShowMoneyBar,
    setPlayers,
    setSquares,
    setPcount,
    setTurn,
    addAlert,
    setCommunityChestCards,
    setChanceCards,
    setEdition,
    gameRef,
  } = useContext(GameContext);

  const {
    gameStarted,
    setGameStarted,
    roomPlayers,
    roomCode,
    socket,
    isHost,
    rejoining,
    startingMoney,
  } = useContext(SocketContext);

  const [playerCount, setPlayerCount] = useState(4);
  const [startingCash, setStartingCash] = useState(1500);
  const [playerInputs, setPlayerInputs] = useState(
    Array.from({ length: 8 }, (_, i) => ({
      name: `Player ${i + 1}`,
      color: DEFAULT_COLORS[i],
      ai: '0',
    })),
  );

  // Auto-start when multiplayer game starts
  useEffect(() => {
    if (
      gameStarted &&
      (status === 'setup' || status === 'lobby') &&
      roomPlayers.length >= 2
    ) {
      startGameWithPlayers(roomPlayers);
    }
  }, [gameStarted]);

  // Listen for full state sync from host (for non-host players)
  useEffect(() => {
    if (!socket) return;

    const handleStateSync = ({ gameState }) => {
      if (status !== 'playing' && gameState) {
        // Non-host receives full state
        if (gameState.players) setPlayers(gameState.players);
        if (gameState.squares) setSquares(gameState.squares);
        if (gameState.pcount) setPcount(gameState.pcount);
        if (gameState.turn) setTurn(gameState.turn);
        setEdition('classic');
        setStatus('playing');
        setShowBoard(true);
        setShowControl(true);
        setShowMoneyBar(true);
      }
    };

    socket.on('state-synced', handleStateSync);
    return () => socket.off('state-synced', handleStateSync);
  }, [socket, status]);

  // A player renamed mid-game: the server does not sync names, so patch them here
  useEffect(() => {
    if (!socket) return;

    const handleRenamed = ({ renamed }) => {
      if (!renamed || status !== 'playing') return;
      const inRef = gameRef.current.players.find(
        (p) => p.index === renamed.index,
      );
      if (inRef) inRef.name = renamed.to;
      setPlayers((prev) =>
        prev.map((p) =>
          p.index === renamed.index ? { ...p, name: renamed.to } : p,
        ),
      );
      addAlert(`${renamed.from} is now called ${renamed.to}.`);
    };

    socket.on('room-updated', handleRenamed);
    return () => socket.off('room-updated', handleRenamed);
  }, [socket, status]);

  // Restore game state on rejoin after disconnect
  useEffect(() => {
    if (!socket) return;

    const handleRejoin = ({ gameState }) => {
      if (!gameState) return;
      console.log('Restoring game state from rejoin');

      if (gameState.players) setPlayers(gameState.players);
      if (gameState.squares) setSquares(gameState.squares);
      if (gameState.pcount) setPcount(gameState.pcount);
      if (gameState.turn !== undefined) setTurn(gameState.turn);
      setEdition('classic');
      setStatus('playing');
      setShowBoard(true);
      setShowControl(true);
      setShowMoneyBar(true);
      addAlert('Reconnected to game!');
    };

    socket.on('rejoin-success', handleRejoin);
    return () => socket.off('rejoin-success', handleRejoin);
  }, [socket]);

  const startGameWithPlayers = (rPlayers) => {
    const engine = createGameEngine('classic');

    const newPlayers = [new Player('the bank', '')];
    for (let i = 0; i < rPlayers.length; i++) {
      const p = new Player(
        rPlayers[i].name,
        rPlayers[i].color,
        startingMoney,
      );
      p.index = i + 1;
      p.human = true;
      newPlayers.push(p);
    }

    gameRef.current.players = newPlayers;
    gameRef.current.squares = engine.square;
    gameRef.current.pcount = rPlayers.length;
    gameRef.current.turn = 1;
    gameRef.current.communityChestCards = engine.communityChestCards;
    gameRef.current.chanceCards = engine.chanceCards;
    gameRef.current.ccIndex = 0;
    gameRef.current.chIndex = 0;

    setPlayers(newPlayers);
    setSquares(engine.square);
    setPcount(rPlayers.length);
    setTurn(1);
    setCommunityChestCards(engine.communityChestCards);
    setChanceCards(engine.chanceCards);
    setEdition('classic');

    addAlert('Game started!');
    addAlert('It is ' + newPlayers[1].name + "'s turn.");

    setStatus('playing');
    setShowBoard(true);
    setShowControl(true);
    setShowMoneyBar(true);

    // If host, broadcast initial state to all players
    if (socket && isHost) {
      setTimeout(() => {
        socket.emit('sync-state', {
          gameState: {
            players: newPlayers,
            squares: engine.square,
            pcount: rPlayers.length,
            turn: 1,
          },
        });
      }, 500);
    }
  };

  if (status !== 'setup') return null;
  // Hide Setup when in multiplayer room (Lobby/WaitingRoom handles it)
  if (roomCode) return null;

  const handlePlayerChange = (index, field, value) => {
    setPlayerInputs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleStart = () => {
    // Initialize game engine (squares, cards)
    const engine = createGameEngine('classic');

    // Create player objects (index 0 = bank, 1..N = players)
    const newPlayers = [new Player('the bank', '')];
    for (let i = 0; i < playerCount; i++) {
      const p = new Player(
        playerInputs[i].name.trim() || `Player ${i + 1}`,
        playerInputs[i].color.toLowerCase(),
        startingCash,
      );
      p.index = i + 1;
      p.human = playerInputs[i].ai === '0';
      newPlayers.push(p);
    }

    // Store in game ref for closures
    gameRef.current.players = newPlayers;
    gameRef.current.squares = engine.square;
    gameRef.current.pcount = playerCount;
    gameRef.current.turn = 1;
    gameRef.current.communityChestCards = engine.communityChestCards;
    gameRef.current.chanceCards = engine.chanceCards;
    gameRef.current.ccIndex = 0;
    gameRef.current.chIndex = 0;

    // Update React state
    setPlayers(newPlayers);
    setSquares(engine.square);
    setPcount(playerCount);
    setTurn(1);
    setCommunityChestCards(engine.communityChestCards);
    setChanceCards(engine.chanceCards);
    setEdition('classic');

    addAlert('Game started!');
    addAlert('It is ' + newPlayers[1].name + "'s turn.");

    setStatus('playing');
    setShowBoard(true);
    setShowControl(true);
    setShowMoneyBar(true);
  };

  // Keep colours unique across the visible players when the count changes
  const handleCountChange = (n) => {
    setPlayerCount(n);
    setPlayerInputs((prev) => {
      const updated = [...prev];
      const used = [];
      for (let i = 0; i < n; i++) {
        let color = updated[i].color;
        if (used.includes(color)) {
          color = DEFAULT_COLORS.find((c) => !used.includes(c));
          updated[i] = { ...updated[i], color };
        }
        used.push(color);
      }
      return updated;
    });
  };

  return (
    <div className='flex w-full flex-col items-center p-3 sm:p-5'>
      <div className='flex w-full max-w-md flex-col gap-4'>
        <div className='flex items-center justify-between gap-3'>
          <h1 className='font-display text-(--t-2xl) font-bold leading-tight text-paper'>
            Local game
          </h1>
          <Button onClick={() => setStatus('lobby')}>Back</Button>
        </div>

        <div className='card flex flex-col gap-3 p-4'>
          <div
            role='group'
            aria-labelledby='local-count-label'
            className='flex flex-col gap-1'
          >
            <div id='local-count-label' className='text-sm font-semibold'>
              Number of players
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  type='button'
                  aria-pressed={playerCount === n}
                  onClick={() => handleCountChange(n)}
                  className={`min-h-11 min-w-11 flex-1 rounded-[10px] border-2 text-base font-semibold text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-info ${
                    playerCount === n
                      ? 'border-ink bg-white'
                      : 'border-line-strong bg-card'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor='local-starting-cash'
              className='mb-1 block text-sm font-semibold'
            >
              Starting cash
            </label>
            <select
              id='local-starting-cash'
              value={startingCash}
              onChange={(e) => setStartingCash(parseInt(e.target.value, 10))}
              className='min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-base text-ink'
            >
              {STARTING_CASH_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  ${n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {Array.from({ length: playerCount }, (_, i) => (
          <div key={i} className='card flex flex-col gap-3 p-4'>
            <h2 className='text-base font-semibold'>Player {i + 1}</h2>

            <div>
              <label
                htmlFor={`local-name-${i}`}
                className='mb-1 block text-sm font-semibold'
              >
                Name
              </label>
              <input
                id={`local-name-${i}`}
                type='text'
                maxLength={16}
                value={playerInputs[i].name}
                autoComplete='off'
                onChange={(e) => handlePlayerChange(i, 'name', e.target.value)}
                className='min-h-11 w-full rounded-[10px] border border-line-strong bg-card px-3 text-base text-ink placeholder:text-[#6b6258]'
              />
            </div>

            <fieldset>
              <legend className='mb-1 text-sm font-semibold'>
                Token colour
              </legend>
              <div className='grid grid-cols-4 gap-2'>
                {DEFAULT_COLORS.map((c) => {
                  const taken = playerInputs.some(
                    (p, j) => j < playerCount && j !== i && p.color === c,
                  );
                  return (
                    <div key={c} className='relative'>
                      <input
                        type='radio'
                        name={`local-color-${i}`}
                        id={`local-color-${i}-${c}`}
                        className='peer sr-only'
                        checked={playerInputs[i].color === c}
                        disabled={taken}
                        onChange={() => handlePlayerChange(i, 'color', c)}
                      />
                      <label
                        htmlFor={`local-color-${i}-${c}`}
                        className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border-2 p-1 text-xs font-semibold text-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-info ${
                          taken
                            ? 'cursor-not-allowed border-[#cfc3ab] bg-[#e7dfd0] text-ink-muted'
                            : playerInputs[i].color === c
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
                      {playerInputs[i].color === c && !taken && (
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

            <div
              role='group'
              aria-labelledby={`local-type-${i}`}
              className='flex flex-col gap-1'
            >
              <div id={`local-type-${i}`} className='text-sm font-semibold'>
                Controlled by
              </div>
              <div className='flex gap-1.5'>
                {[
                  ['0', 'Human'],
                  ['1', 'Computer (test)'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type='button'
                    aria-pressed={playerInputs[i].ai === value}
                    onClick={() => handlePlayerChange(i, 'ai', value)}
                    className={`min-h-11 flex-1 rounded-[10px] border-2 px-3 text-base font-semibold text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-info ${
                      playerInputs[i].ai === value
                        ? 'border-ink bg-white'
                        : 'border-line-strong bg-card'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div
          role='note'
          className='rounded-[10px] border border-(--gold-edge) bg-[#fff4d6] p-3 text-sm font-semibold text-ink'
        >
          Refreshing this page or navigating away may end your game without
          warning.
        </div>

        <Button variant='primary' size='lg' full onClick={handleStart}>
          Start game
        </Button>
      </div>
    </div>
  );
}

export default Setup;
