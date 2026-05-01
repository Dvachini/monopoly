import React, { useState, useContext, useEffect } from 'react';
import GameContext from '../context/GameContext.jsx';
import SocketContext from '../context/SocketContext.jsx';
import { createGameEngine } from '../game/monopoly.jsx';
import { Player } from '../game/models.jsx';

const COLORS = [
  'Aqua',
  'Black',
  'Blue',
  'Fuchsia',
  'Gray',
  'Green',
  'Lime',
  'Maroon',
  'Navy',
  'Olive',
  'Orange',
  'Purple',
  'Red',
  'Silver',
  'Teal',
  'Yellow',
];
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
    myPlayerIndex,
    rejoining,
  } = useContext(SocketContext);

  const [playerCount, setPlayerCount] = useState(4);
  const [playerInputs, setPlayerInputs] = useState(
    Array.from({ length: 8 }, (_, i) => ({
      name: `Player ${i + 1}`,
      color: DEFAULT_COLORS[i],
      ai: '0',
    })),
  );

  // Auto-start when multiplayer game starts
  useEffect(() => {
    if (gameStarted && status === 'setup' && roomPlayers.length >= 2) {
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
      const p = new Player(rPlayers[i].name, rPlayers[i].color);
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
    if (socket && myPlayerIndex === 1) {
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
        playerInputs[i].name,
        playerInputs[i].color.toLowerCase(),
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

  return (
    <div className='block m-4'>
      <div className='mb-5'>
        Select number of players.
        <select
          id='playernumber'
          title='Select the number of players for the game.'
          value={playerCount}
          onChange={(e) => setPlayerCount(parseInt(e.target.value, 10))}
        >
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {Array.from({ length: playerCount }, (_, i) => (
        <div key={i} className='player-input mb-1.5'>
          Player {i + 1}:{' '}
          <input
            type='text'
            title='Player name'
            maxLength={16}
            value={playerInputs[i].name}
            disabled={playerInputs[i].ai !== '0'}
            onChange={(e) => handlePlayerChange(i, 'name', e.target.value)}
          />{' '}
          <select
            title='Player color'
            value={playerInputs[i].color}
            onChange={(e) => handlePlayerChange(i, 'color', e.target.value)}
          >
            {COLORS.map((c) => (
              <option key={c} style={{ color: c.toLowerCase() }}>
                {c}
              </option>
            ))}
          </select>{' '}
          <select
            title='Choose whether this player is controlled by a human or by the computer.'
            value={playerInputs[i].ai}
            onChange={(e) => handlePlayerChange(i, 'ai', e.target.value)}
          >
            <option value='0'>Human</option>
            <option value='1'>AI (Test)</option>
          </select>
        </div>
      ))}

      <div className='my-5'>
        <input
          type='button'
          value='Start Game'
          onClick={handleStart}
          title='Begin playing.'
        />
      </div>

      <div>
        Note: Refreshing this page or navigating away from it may end your game
        without warning.
      </div>
    </div>
  );
}

export default Setup;
