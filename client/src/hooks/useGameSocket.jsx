import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { useGame } from '../context/GameContext.jsx';

export function useGameSocket() {
  const { socket, on, off, emit, gameId } = useSocket();
  const {
    setPlayers,
    setSquares,
    setTurn,
    setDie1,
    setDie2,
    setDiceRolled,
    addAlert,
    setLanded,
    setDoublecount,
    setPcount,
    setStatus,
    players,
    squares,
  } = useGame();

  useEffect(() => {
    if (!socket) return;

    const handleDiceRolled = ({ die1, die2, playerIndex }) => {
      setDie1(die1);
      setDie2(die2);
      setDiceRolled(true);
      addAlert(`Player ${playerIndex} rolled ${die1 + die2}.`);
    };

    const handlePlayerMoved = ({ playerIndex, position }) => {
      setPlayers((prev) => {
        const updated = [...prev];
        if (updated[playerIndex]) {
          updated[playerIndex] = { ...updated[playerIndex], position };
        }
        return updated;
      });
    };

    const handlePropertyBought = ({ playerIndex, squareIndex }) => {
      setSquares((prev) => {
        const updated = [...prev];
        if (updated[squareIndex]) {
          updated[squareIndex] = {
            ...updated[squareIndex],
            owner: playerIndex,
          };
        }
        return updated;
      });
    };

    const handleRentPaid = ({ payerIndex, ownerIndex, amount }) => {
      setPlayers((prev) => {
        const updated = [...prev];
        if (updated[payerIndex]) {
          updated[payerIndex] = {
            ...updated[payerIndex],
            money: updated[payerIndex].money - amount,
          };
        }
        if (updated[ownerIndex]) {
          updated[ownerIndex] = {
            ...updated[ownerIndex],
            money: updated[ownerIndex].money + amount,
          };
        }
        return updated;
      });
    };

    const handleHouseChanged = ({ squareIndex, houses, hotel }) => {
      setSquares((prev) => {
        const updated = [...prev];
        if (updated[squareIndex]) {
          updated[squareIndex] = {
            ...updated[squareIndex],
            house: houses,
            hotel,
          };
        }
        return updated;
      });
    };

    const handleMortgageChanged = ({ squareIndex, mortgaged }) => {
      setSquares((prev) => {
        const updated = [...prev];
        if (updated[squareIndex]) {
          updated[squareIndex] = {
            ...updated[squareIndex],
            mortgage: mortgaged,
          };
        }
        return updated;
      });
    };

    const handleTurnEnded = ({ nextTurn }) => {
      setTurn(nextTurn);
      setDiceRolled(false);
      setLanded('');
    };

    const handlePlayerJailed = ({ playerIndex }) => {
      setPlayers((prev) => {
        const updated = [...prev];
        if (updated[playerIndex]) {
          updated[playerIndex] = { ...updated[playerIndex], jail: true };
        }
        return updated;
      });
    };

    const handlePlayerFreed = ({ playerIndex }) => {
      setPlayers((prev) => {
        const updated = [...prev];
        if (updated[playerIndex]) {
          updated[playerIndex] = {
            ...updated[playerIndex],
            jail: false,
            jailroll: 0,
          };
        }
        return updated;
      });
    };

    const handlePlayerBankrupt = ({ playerIndex }) => {
      addAlert(`Player ${playerIndex} is bankrupt!`);
    };

    const handleGameOver = ({ winnerIndex }) => {
      setStatus('finished');
      addAlert(`Player ${winnerIndex} wins the game!`);
    };

    const handleAlert = ({ text }) => {
      addAlert(text);
    };

    const handlePlayerJoined = ({ socketId }) => {
      addAlert('A player has joined the game.');
    };

    const handlePlayerLeft = ({ socketId }) => {
      addAlert('A player has left the game.');
    };

    const handleGameStateUpdated = (gameState) => {
      if (gameState.players) setPlayers(gameState.players);
      if (gameState.squares) setSquares(gameState.squares);
      if (gameState.turn !== undefined) setTurn(gameState.turn);
      if (gameState.status) setStatus(gameState.status);
    };

    on('dice-rolled', handleDiceRolled);
    on('player-moved', handlePlayerMoved);
    on('property-bought', handlePropertyBought);
    on('rent-paid', handleRentPaid);
    on('house-changed', handleHouseChanged);
    on('mortgage-changed', handleMortgageChanged);
    on('turn-ended', handleTurnEnded);
    on('player-jailed', handlePlayerJailed);
    on('player-freed', handlePlayerFreed);
    on('player-bankrupt', handlePlayerBankrupt);
    on('game-over', handleGameOver);
    on('alert', handleAlert);
    on('player-joined', handlePlayerJoined);
    on('player-left', handlePlayerLeft);
    on('game-state-updated', handleGameStateUpdated);

    return () => {
      off('dice-rolled', handleDiceRolled);
      off('player-moved', handlePlayerMoved);
      off('property-bought', handlePropertyBought);
      off('rent-paid', handleRentPaid);
      off('house-changed', handleHouseChanged);
      off('mortgage-changed', handleMortgageChanged);
      off('turn-ended', handleTurnEnded);
      off('player-jailed', handlePlayerJailed);
      off('player-freed', handlePlayerFreed);
      off('player-bankrupt', handlePlayerBankrupt);
      off('game-over', handleGameOver);
      off('alert', handleAlert);
      off('player-joined', handlePlayerJoined);
      off('player-left', handlePlayerLeft);
      off('game-state-updated', handleGameStateUpdated);
    };
  }, [socket]);

  // Emit helpers for game actions
  const emitDiceRolled = (die1, die2, playerIndex) => {
    emit('dice-rolled', { die1, die2, playerIndex });
  };

  const emitPlayerMoved = (playerIndex, position) => {
    emit('player-moved', { playerIndex, position });
  };

  const emitPropertyBought = (playerIndex, squareIndex) => {
    emit('property-bought', { playerIndex, squareIndex });
  };

  const emitRentPaid = (payerIndex, ownerIndex, amount) => {
    emit('rent-paid', { payerIndex, ownerIndex, amount });
  };

  const emitHouseChanged = (squareIndex, houses, hotel) => {
    emit('house-changed', { squareIndex, houses, hotel });
  };

  const emitMortgageChanged = (squareIndex, mortgaged) => {
    emit('mortgage-changed', { squareIndex, mortgaged });
  };

  const emitTurnEnded = (nextTurn) => {
    emit('turn-ended', { nextTurn });
  };

  const emitPlayerJailed = (playerIndex) => {
    emit('player-jailed', { playerIndex });
  };

  const emitPlayerFreed = (playerIndex, method) => {
    emit('player-freed', { playerIndex, method });
  };

  const emitCardDrawn = (cardType, cardIndex) => {
    emit('card-drawn', { cardType, cardIndex });
  };

  const emitPlayerBankrupt = (playerIndex) => {
    emit('player-bankrupt', { playerIndex });
  };

  const emitGameOver = (winnerIndex) => {
    emit('game-over', { winnerIndex });
  };

  const emitAlert = (text) => {
    emit('alert', { text });
  };

  const emitTradeProposed = (trade) => {
    emit('trade-proposed', { trade });
  };

  const emitTradeAccepted = (trade) => {
    emit('trade-accepted', { trade });
  };

  const emitTradeRejected = () => {
    emit('trade-rejected', {});
  };

  const emitAuctionBid = (playerIndex, amount) => {
    emit('auction-bid', { playerIndex, amount });
  };

  const emitAuctionPass = (playerIndex) => {
    emit('auction-pass', { playerIndex });
  };

  const emitAuctionEnd = (winnerIndex, squareIndex, amount) => {
    emit('auction-end', { winnerIndex, squareIndex, amount });
  };

  const emitUpdateGameState = (gameState) => {
    emit('update-game-state', { gameState });
  };

  const emitChatMessage = (playerName, message) => {
    emit('chat-message', { playerName, message });
  };

  return {
    emitDiceRolled,
    emitPlayerMoved,
    emitPropertyBought,
    emitRentPaid,
    emitHouseChanged,
    emitMortgageChanged,
    emitTurnEnded,
    emitPlayerJailed,
    emitPlayerFreed,
    emitCardDrawn,
    emitPlayerBankrupt,
    emitGameOver,
    emitAlert,
    emitTradeProposed,
    emitTradeAccepted,
    emitTradeRejected,
    emitAuctionBid,
    emitAuctionPass,
    emitAuctionEnd,
    emitUpdateGameState,
    emitChatMessage,
  };
}
