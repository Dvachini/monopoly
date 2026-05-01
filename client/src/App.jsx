import React from 'react';
import { GameProvider } from './context/GameContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import GameScreen from './pages/GameScreen.jsx';

function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <div className='flex justify-center p-4 max-sm:p-2'>
          <GameScreen />
        </div>
      </GameProvider>
    </SocketProvider>
  );
}

export default App;
