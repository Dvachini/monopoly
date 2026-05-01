import React, { useContext } from 'react';
import Lobby from '../components/Lobby.jsx';
import Setup from '../components/Setup.jsx';
import Board from '../components/Board.jsx';
import Popup from '../components/Popup.jsx';
import Stats from '../components/Stats.jsx';
import Deed from '../components/Deed.jsx';
import Trade from '../components/Trade.jsx';
import Auction from '../components/Auction.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import GameContext from '../context/GameContext.jsx';

function GameScreen() {
  const { status, players } = useContext(GameContext);
  const { clearSession } = useSocket();

  if (status === 'finished') {
    const winner = players.find((p, i) => i > 0 && p.position >= 0);
    clearSession();
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
        <h1 className='text-4xl font-bold mb-4'>🏆 Game Over!</h1>
        <p className='text-2xl mb-6'>
          {winner ? `${winner.name} wins the game!` : 'Game has ended.'}
        </p>
        <button
          className='px-8 py-3 text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer border-none'
          onClick={() => window.location.reload()}
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <>
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
