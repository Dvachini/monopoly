import React, { useContext, useState, useEffect, useRef } from 'react';
import GameContext from '../context/GameContext.jsx';
import SocketContext from '../context/SocketContext.jsx';
import { rollDice, calculateRent } from '../game/monopoly.jsx';

function Control() {
  const {
    showControl,
    activeTab,
    setActiveTab,
    alerts,
    landed,
    setLanded,
    die1,
    die2,
    diceRolled,
    setDie1,
    setDie2,
    setDiceRolled,
    players,
    setPlayers,
    squares,
    setSquares,
    turn,
    setTurn,
    pcount,
    doublecount,
    setDoublecount,
    addAlert,
    gameRef,
    setDeedIndex,
    setShowTrade,
    popup,
    status,
    setStatus,
    setAuctionProperty,
    setAuctionBid,
    setAuctionBidder,
    setAuctionTurn,
    setAuctionActive,
    setAuctionPlayers,
    auctionActive,
    communityChestCards,
    setCommunityChestCards,
    chanceCards,
    setChanceCards,
    showBoard,
    setShowBoard,
    setShowControl,
    setShowMoneyBar,
    auctionEndTurnPending,
    setAuctionEndTurnPending,
  } = useContext(GameContext);

  const { socket, myPlayerIndex, roomCode } = useContext(SocketContext);

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [canRollAgain, setCanRollAgain] = useState(false);

  // Track alerts generated during an action to send to other players
  const pendingAlerts = useRef([]);

  // Wrapped addAlert that also tracks for broadcasting
  const gameAlert = (msg) => {
    addAlert(msg);
    pendingAlerts.current.push(msg);
  };

  // Flush pending alerts into broadcast extras
  const getPendingAlerts = () => {
    const a = [...pendingAlerts.current];
    pendingAlerts.current = [];
    return a.length > 0 ? { newAlerts: a } : {};
  };

  // Whether this client is the active player (for multiplayer turn enforcement)
  const isMyTurn = !roomCode || myPlayerIndex === turn;

  // Broadcast full state to other players after any change
  const broadcastState = (newPlayers, newSquares, newTurn, extras) => {
    if (socket && roomCode) {
      const pendingAlertsData = getPendingAlerts();
      socket.emit('sync-state', {
        gameState: {
          players: newPlayers || players,
          squares: newSquares || squares,
          turn: newTurn !== undefined ? newTurn : turn,
          pcount,
          ...pendingAlertsData,
          ...extras,
        },
      });
    } else {
      // Clear pending alerts if not in multiplayer
      pendingAlerts.current = [];
    }
  };

  // Listen for state syncs from other players
  useEffect(() => {
    if (!socket) return;
    const handleSync = ({ gameState }) => {
      if (!gameState) return;
      // Skip if this sync has auction data (handled by Auction.jsx)
      if (gameState.auction) return;
      if (gameState.players) setPlayers(gameState.players);
      if (gameState.squares) setSquares(gameState.squares);
      if (gameState.turn !== undefined) {
        setTurn(gameState.turn);
        setHasRolled(false);
        setCanRollAgain(false);
      }
      if (gameState.die1 !== undefined) setDie1(gameState.die1);
      if (gameState.die2 !== undefined) setDie2(gameState.die2);
      if (gameState.diceRolled !== undefined)
        setDiceRolled(gameState.diceRolled);
      if (gameState.landed !== undefined) setLanded(gameState.landed);
      if (gameState.newAlerts && gameState.newAlerts.length > 0) {
        gameState.newAlerts.forEach((a) => addAlert(a));
      }
      if (gameState.status === 'finished') {
        setStatus('finished');
      }
    };

    socket.on('state-synced', handleSync);
    return () => socket.off('state-synced', handleSync);
  }, [socket]);

  if (!showControl) return null;

  const currentPlayer = players[turn];

  // ========== CARD DRAWING ==========
  const drawCard = (type, newPlayers) => {
    const cardSet =
      type === 'community'
        ? gameRef.current.communityChestCards
        : gameRef.current.chanceCards;
    if (!cardSet || !cardSet.length) return;

    // Use a deck index stored in gameRef
    const deckKey = type === 'community' ? 'ccIndex' : 'chIndex';
    let idx = gameRef.current[deckKey] || 0;

    const card = cardSet[idx];
    if (!card) return;

    gameAlert(
      `${type === 'community' ? 'Community Chest' : 'Chance'}: ${card.text}`,
    );

    const p = newPlayers[turn];
    const ctx = { players: newPlayers, pcount, turn, squares };

    if (typeof card.action === 'function') {
      card.action(p, ctx);
    }

    // Advance deck index (skip jail card if it was taken)
    idx = (idx + 1) % cardSet.length;
    gameRef.current[deckKey] = idx;

    // Handle _landAgain flag (for advance cards)
    if (p._landAgain) {
      delete p._landAgain;
      const increasedRent = !!p._increasedRent;
      delete p._increasedRent;
      newPlayers[turn] = p;
      setPlayers([...newPlayers]);
      handleLanding(p, [...newPlayers], increasedRent);
      return;
    }

    newPlayers[turn] = p;
    setPlayers([...newPlayers]);
    broadcastState([...newPlayers]);
  };

  // ========== LANDING LOGIC ==========
  const handleLanding = (p, newPlayers, increasedRent) => {
    const sq = squares[p.position];
    if (!sq) return;

    setLanded(`You landed on ${sq.name}.`);
    gameAlert(`${p.name} landed on ${sq.name}.`);

    // Collect rent
    if (sq.owner > 0 && sq.owner !== turn && !sq.mortgage) {
      const rent = calculateRent(
        sq,
        squares,
        p.position,
        gameRef.current.die1 || 0,
        gameRef.current.die2 || 0,
        !!increasedRent,
      );

      newPlayers[turn] = {
        ...newPlayers[turn],
        money: newPlayers[turn].money - rent,
      };
      newPlayers[sq.owner] = {
        ...newPlayers[sq.owner],
        money: newPlayers[sq.owner].money + rent,
      };
      setPlayers([...newPlayers]);
      gameAlert(
        `${p.name} paid $${rent} rent to ${newPlayers[sq.owner].name}.`,
      );
      setLanded(
        `You landed on ${sq.name}. ${newPlayers[sq.owner].name} collected $${rent} rent.`,
      );
    }

    // Go to jail
    if (p.position === 30) {
      newPlayers[turn] = { ...newPlayers[turn], jail: true, position: 10 };
      setPlayers([...newPlayers]);
      gameAlert(`${p.name} was sent directly to jail.`);
      setLanded('Go to Jail!');
      setCanRollAgain(false);
      return;
    }

    // Tax
    if (p.position === 4) {
      newPlayers[turn] = {
        ...newPlayers[turn],
        money: newPlayers[turn].money - 200,
      };
      setPlayers([...newPlayers]);
      gameAlert(`${p.name} paid $200 for landing on City Tax.`);
    }
    if (p.position === 38) {
      newPlayers[turn] = {
        ...newPlayers[turn],
        money: newPlayers[turn].money - 100,
      };
      setPlayers([...newPlayers]);
      gameAlert(`${p.name} paid $100 for landing on Luxury Tax.`);
    }

    // Community Chest
    if (p.position === 2 || p.position === 17 || p.position === 33) {
      drawCard('community', [...newPlayers]);
      return;
    }

    // Chance
    if (p.position === 7 || p.position === 22 || p.position === 36) {
      drawCard('chance', [...newPlayers]);
      return;
    }
  };

  // ========== ROLL DICE ==========
  const handleRollDice = () => {
    if (!currentPlayer) return;

    const { die1: d1, die2: d2 } = rollDice();
    setDie1(d1);
    setDie2(d2);
    setDiceRolled(true);
    setHasRolled(true);
    gameRef.current.die1 = d1;
    gameRef.current.die2 = d2;

    const total = d1 + d2;
    const isDoubles = d1 === d2;
    const newDoubleCount = isDoubles ? doublecount + 1 : 0;

    if (isDoubles) {
      gameAlert(`${currentPlayer.name} rolled ${total} - doubles.`);
    } else {
      gameAlert(`${currentPlayer.name} rolled ${total}.`);
    }

    setDoublecount(newDoubleCount);

    const newPlayers = [...players];
    const p = { ...newPlayers[turn] };

    // JAIL HANDLING
    if (p.jail) {
      p.jailroll = (p.jailroll || 0) + 1;
      if (isDoubles) {
        p.jail = false;
        p.jailroll = 0;
        p.position = 10 + total;
        if (p.position >= 40) p.position -= 40;
        gameAlert(`${p.name} rolled doubles to get out of jail.`);
        newPlayers[turn] = p;
        setPlayers(newPlayers);
        setCanRollAgain(false);
        handleLanding(p, newPlayers, false);
      } else if (p.jailroll >= 3) {
        p.jail = false;
        p.jailroll = 0;
        p.money -= 50;
        p.position = 10 + total;
        if (p.position >= 40) p.position -= 40;
        gameAlert(`${p.name} paid the $50 fine to get out of jail.`);
        newPlayers[turn] = p;
        setPlayers(newPlayers);
        setCanRollAgain(false);
        handleLanding(p, newPlayers, false);
      } else {
        gameAlert(`${p.name} is still in jail.`);
        newPlayers[turn] = p;
        setPlayers(newPlayers);
        setCanRollAgain(false);
      }
      return;
    }

    // THREE DOUBLES = JAIL
    if (newDoubleCount >= 3) {
      p.jail = true;
      p.position = 10;
      newPlayers[turn] = p;
      setPlayers(newPlayers);
      setDoublecount(0);
      setCanRollAgain(false);
      gameAlert(`${p.name} rolled doubles three times in a row. Go to jail!`);
      return;
    }

    // MOVE PLAYER
    p.position += total;
    if (p.position >= 40) {
      p.position -= 40;
      p.money += 200;
      gameAlert(`${p.name} collected a $200 salary for passing GO.`);
    }

    newPlayers[turn] = p;
    setPlayers(newPlayers);

    // Set roll-again for doubles
    if (isDoubles) {
      setCanRollAgain(true);
    } else {
      setCanRollAgain(false);
    }

    // Handle landing
    handleLanding(p, newPlayers, false);

    // Broadcast state after roll
    broadcastState(newPlayers, undefined, undefined, {
      die1: d1,
      die2: d2,
      diceRolled: true,
    });
  };

  // ========== END TURN ==========
  const handleEndTurn = (currentPlayers) => {
    const ps = currentPlayers || players;
    const cp = ps[turn];

    // Auto-auction if player is on an unowned property they didn't buy
    if (cp && cp.position >= 0) {
      const sq = squares[cp.position];
      if (sq && sq.price > 0 && sq.owner === 0) {
        // Start auction instead of ending turn
        const bidders = [];
        for (let i = 1; i <= pcount; i++) {
          if (ps[i] && ps[i].money > 0 && ps[i].position >= 0) {
            bidders.push(i);
          }
        }
        if (bidders.length > 0) {
          gameAlert(`${cp.name} did not buy ${sq.name}. It goes to auction!`);
          setAuctionProperty(cp.position);
          setAuctionBid(0);
          setAuctionBidder(0);
          setAuctionTurn(0);
          setAuctionPlayers(bidders);
          setAuctionActive(true);
          setAuctionEndTurnPending(true);

          // Broadcast auction start
          if (socket && roomCode) {
            const pendingAlertsData = getPendingAlerts();
            socket.emit('sync-state', {
              gameState: {
                auction: {
                  auctionActive: true,
                  auctionProperty: cp.position,
                  auctionBid: 0,
                  auctionBidder: 0,
                  auctionTurn: 0,
                  auctionPlayers: bidders,
                },
                players: ps,
                squares,
                turn,
                pcount,
                ...pendingAlertsData,
              },
            });
          }
          return;
        }
      }
    }

    advanceTurn(ps);
  };

  const advanceTurn = (ps) => {
    let nextTurn = turn;
    for (let attempt = 0; attempt < pcount; attempt++) {
      nextTurn++;
      if (nextTurn > pcount) nextTurn = 1;
      if (
        ps[nextTurn] &&
        ps[nextTurn].position >= 0 &&
        ps[nextTurn].money >= -1500
      ) {
        break;
      }
    }
    setTurn(nextTurn);
    setDiceRolled(false);
    setLanded('');
    setDoublecount(0);
    setHasRolled(false);
    setCanRollAgain(false);
    const nextP = ps[nextTurn];
    if (nextP) {
      gameAlert(`It is ${nextP.name}'s turn.`);
    }
    broadcastState(ps, undefined, nextTurn);
  };

  // ========== BUY PROPERTY ==========
  const handleBuyProperty = () => {
    if (!currentPlayer) return;
    const sq = squares[currentPlayer.position];
    if (!sq || sq.price === 0 || sq.owner !== 0) return;
    if (currentPlayer.money < sq.price) {
      gameAlert(
        `${currentPlayer.name} doesn't have enough money to buy ${sq.name}.`,
      );
      return;
    }

    const newPlayers = [...players];
    newPlayers[turn] = {
      ...newPlayers[turn],
      money: newPlayers[turn].money - sq.price,
    };
    setPlayers(newPlayers);

    const newSquares = [...squares];
    newSquares[currentPlayer.position] = {
      ...newSquares[currentPlayer.position],
      owner: turn,
    };
    setSquares(newSquares);

    gameAlert(`${currentPlayer.name} bought ${sq.name} for ${sq.pricetext}.`);
    broadcastState(newPlayers, newSquares);
  };

  // ========== AUCTION ==========
  const handleStartAuction = () => {
    if (!currentPlayer) return;
    const sq = squares[currentPlayer.position];
    if (!sq || sq.price === 0 || sq.owner !== 0) return;

    const bidders = [];
    for (let i = 1; i <= pcount; i++) {
      if (players[i] && players[i].money > 0 && players[i].position >= 0) {
        bidders.push(i);
      }
    }
    if (bidders.length === 0) return;

    gameAlert(`${sq.name} is going up for auction!`);
    setAuctionProperty(currentPlayer.position);
    setAuctionBid(0);
    setAuctionBidder(0);
    setAuctionTurn(0);
    setAuctionPlayers(bidders);
    setAuctionActive(true);

    // Broadcast auction start to other players
    if (socket && roomCode) {
      const pendingAlertsData = getPendingAlerts();
      socket.emit('sync-state', {
        gameState: {
          auction: {
            auctionActive: true,
            auctionProperty: currentPlayer.position,
            auctionBid: 0,
            auctionBidder: 0,
            auctionTurn: 0,
            auctionPlayers: bidders,
          },
          players,
          squares,
          turn,
          pcount,
          ...pendingAlertsData,
        },
      });
    }
  };

  // ========== JAIL OPTIONS ==========
  const handlePayJailFine = () => {
    if (!currentPlayer || !currentPlayer.jail) return;
    if (currentPlayer.money < 50) {
      gameAlert(
        `${currentPlayer.name} doesn't have enough money to pay the fine.`,
      );
      return;
    }
    const newPlayers = [...players];
    newPlayers[turn] = {
      ...newPlayers[turn],
      jail: false,
      jailroll: 0,
      money: newPlayers[turn].money - 50,
    };
    setPlayers(newPlayers);
    gameAlert(`${currentPlayer.name} paid $50 to get out of jail.`);
    broadcastState(newPlayers);
  };

  const handleUseJailCard = () => {
    if (!currentPlayer) return;
    const newPlayers = [...players];
    const p = { ...newPlayers[turn] };

    if (p.communityChestJailCard) {
      p.communityChestJailCard = false;
      p.jail = false;
      p.jailroll = 0;
      gameAlert(`${p.name} used a "Get Out of Jail Free" card.`);
    } else if (p.chanceJailCard) {
      p.chanceJailCard = false;
      p.jail = false;
      p.jailroll = 0;
      gameAlert(`${p.name} used a "Get Out of Jail Free" card.`);
    }

    newPlayers[turn] = p;
    setPlayers(newPlayers);
    broadcastState(newPlayers);
  };

  // ========== MANAGE PROPERTIES ==========
  const ownedProperties = squares.filter(
    (sq) => sq && sq.owner === turn && sq.groupNumber > 0,
  );

  const handleMortgage = () => {
    if (selectedProperty === null) return;
    const sq = squares[selectedProperty];
    if (!sq || sq.owner !== turn) return;

    const newSquares = [...squares];
    if (sq.mortgage) {
      const cost = Math.round(sq.price * 0.55);
      if (currentPlayer.money < cost) {
        gameAlert(`Not enough money to unmortgage ${sq.name}.`);
        return;
      }
      newSquares[selectedProperty] = { ...sq, mortgage: false };
      const newPlayers = [...players];
      newPlayers[turn] = {
        ...newPlayers[turn],
        money: newPlayers[turn].money - cost,
      };
      setPlayers(newPlayers);
      setSquares(newSquares);
      gameAlert(`${currentPlayer.name} unmortgaged ${sq.name} for $${cost}.`);
      broadcastState(newPlayers, newSquares);
    } else {
      if (sq.house > 0) {
        gameAlert('Sell all houses before mortgaging.');
        return;
      }
      const value = Math.round(sq.price * 0.5);
      newSquares[selectedProperty] = { ...sq, mortgage: true };
      const newPlayers = [...players];
      newPlayers[turn] = {
        ...newPlayers[turn],
        money: newPlayers[turn].money + value,
      };
      setPlayers(newPlayers);
      setSquares(newSquares);
      gameAlert(`${currentPlayer.name} mortgaged ${sq.name} for $${value}.`);
      broadcastState(newPlayers, newSquares);
    }
  };

  const handleBuyHouse = () => {
    if (selectedProperty === null) return;
    const sq = squares[selectedProperty];
    if (!sq || sq.owner !== turn || sq.groupNumber < 3 || sq.mortgage) return;
    if (sq.house >= 5) {
      gameAlert('Maximum improvements reached.');
      return;
    }

    const groupOwned =
      sq.group && sq.group.every((gi) => squares[gi].owner === turn);
    if (!groupOwned) {
      gameAlert('You must own all properties in the group first.');
      return;
    }

    if (sq.group) {
      const anyMortgaged = sq.group.some((gi) => squares[gi].mortgage);
      if (anyMortgaged) {
        gameAlert('Unmortgage all properties in this group before building.');
        return;
      }
    }

    if (sq.group) {
      const minHouses = Math.min(...sq.group.map((gi) => squares[gi].house));
      if (sq.house > minHouses) {
        gameAlert('You must build evenly across the group.');
        return;
      }
    }

    if (currentPlayer.money < sq.houseprice) {
      gameAlert(`Not enough money. Houses cost $${sq.houseprice}.`);
      return;
    }

    let houseCount = 0,
      hotelCount = 0;
    for (let i = 0; i < 40; i++) {
      if (squares[i].house === 5) hotelCount++;
      else houseCount += squares[i].house;
    }
    if (sq.house < 4 && houseCount >= 32) {
      gameAlert('No more houses available.');
      return;
    }
    if (sq.house === 4 && hotelCount >= 12) {
      gameAlert('No more hotels available.');
      return;
    }

    const newSquares = [...squares];
    newSquares[selectedProperty] = { ...sq, house: sq.house + 1 };
    const newPlayers = [...players];
    newPlayers[turn] = {
      ...newPlayers[turn],
      money: newPlayers[turn].money - sq.houseprice,
    };
    setPlayers(newPlayers);
    setSquares(newSquares);
    gameAlert(
      `${currentPlayer.name} built a ${sq.house + 1 === 5 ? 'hotel' : 'house'} on ${sq.name} for $${sq.houseprice}.`,
    );
    broadcastState(newPlayers, newSquares);
  };

  const handleSellHouse = () => {
    if (selectedProperty === null) return;
    const sq = squares[selectedProperty];
    if (!sq || sq.owner !== turn || sq.house <= 0) return;

    if (sq.group) {
      const maxHouses = Math.max(...sq.group.map((gi) => squares[gi].house));
      if (sq.house < maxHouses) {
        gameAlert('You must sell evenly across the group.');
        return;
      }
    }

    const value = Math.round(sq.houseprice * 0.5);
    const newSquares = [...squares];
    newSquares[selectedProperty] = { ...sq, house: sq.house - 1 };
    const newPlayers = [...players];
    newPlayers[turn] = {
      ...newPlayers[turn],
      money: newPlayers[turn].money + value,
    };
    setPlayers(newPlayers);
    setSquares(newSquares);
    gameAlert(
      `${currentPlayer.name} sold a ${sq.house === 5 ? 'hotel' : 'house'} on ${sq.name} for $${value}.`,
    );
    broadcastState(newPlayers, newSquares);
  };

  // ========== RESIGN ==========
  const handleResign = () => {
    popup(
      `<p>${currentPlayer.name}, are you sure you want to resign?</p>`,
      () => {
        const newPlayers = [...players];
        const newSquares = [...squares];
        for (let i = 0; i < 40; i++) {
          if (newSquares[i].owner === turn) {
            newSquares[i] = {
              ...newSquares[i],
              owner: 0,
              house: 0,
              mortgage: false,
            };
          }
        }
        newPlayers[turn] = { ...newPlayers[turn], money: 0, position: -1 };
        setPlayers(newPlayers);
        setSquares(newSquares);
        gameAlert(`${currentPlayer.name} has resigned.`);

        const activePlayers = newPlayers.filter(
          (p, i) => i > 0 && p.position >= 0,
        );
        if (activePlayers.length === 1) {
          gameAlert(`${activePlayers[0].name} wins the game!`);
          broadcastState(newPlayers, newSquares, undefined, {
            status: 'finished',
          });
          setStatus('finished');
        } else {
          broadcastState(newPlayers, newSquares);
          handleEndTurn(newPlayers);
        }
      },
      'yes/no',
    );
  };

  // ========== BUTTON LOGIC ==========
  const showRollButton = !hasRolled || canRollAgain;
  const showEndTurnButton = hasRolled && !canRollAgain;
  const playerInJail = currentPlayer && currentPlayer.jail;
  const hasJailCard =
    currentPlayer &&
    (currentPlayer.communityChestJailCard || currentPlayer.chanceJailCard);
  const canBuyProperty =
    currentPlayer &&
    squares[currentPlayer.position] &&
    squares[currentPlayer.position].price > 0 &&
    squares[currentPlayer.position].owner === 0 &&
    hasRolled;

  // ========== RENDER ==========
  return (
    <div className='z-9 rounded-xl p-2 bg-white border border-gray-200 shadow-sm flex-1 min-w-0 overflow-auto'>
      <table className='w-full'>
        <tbody>
          <tr>
            <td className='text-left align-top border-none'>
              <div className='w-full h-8.5'>
                <table
                  className='p-0 text-left font-sans text-white font-bold text-[13px] border-none rounded-t-lg h-8.5 w-full m-0 bg-linear-to-br from-blue-700 to-blue-500 overflow-hidden'
                  cellSpacing='0'
                >
                  <tbody>
                    <tr>
                      <td
                        className='menu-item'
                        onClick={() => setActiveTab('buy')}
                        style={{
                          fontWeight: activeTab === 'buy' ? 'bold' : 'normal',
                        }}
                      >
                        <a
                          href='#'
                          title='View alerts and buy the property you landed on.'
                          onClick={(e) => e.preventDefault()}
                          className='text-white no-underline block h-full w-full pt-2'
                        >
                          Buy
                        </a>
                      </td>
                      <td
                        className='menu-item'
                        onClick={() => setActiveTab('manage')}
                        style={{
                          fontWeight:
                            activeTab === 'manage' ? 'bold' : 'normal',
                        }}
                      >
                        <a
                          href='#'
                          title='View, mortgage, and improve your property.'
                          onClick={(e) => e.preventDefault()}
                          className='text-white no-underline block h-full w-full pt-2'
                        >
                          Manage
                        </a>
                      </td>
                      <td
                        className='menu-item'
                        onClick={() => setShowTrade(true)}
                      >
                        <a
                          href='#'
                          title='Exchange property with other players.'
                          onClick={(e) => e.preventDefault()}
                          className='text-white no-underline block h-full w-full pt-2'
                        >
                          Trade
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {activeTab === 'buy' && (
                <div>
                  <div className='w-full h-20 m-0 px-1.5 py-1 border border-gray-300 rounded-b-md font-mono text-xs bg-gray-50 overflow-y-auto box-border'>
                    {alerts.map((a, i) => (
                      <div key={i}>{a}</div>
                    ))}
                  </div>

                  {/* Jail options */}
                  {playerInJail && !hasRolled && (
                    <div className='block px-2 py-1.5 border border-gray-300 border-t-0 rounded-b-md w-full m-0 text-center bg-white box-border'>
                      <div>You are in jail.</div>
                      <input
                        type='button'
                        value='Pay $50 fine'
                        onClick={handlePayJailFine}
                        title='Pay $50 to get out of jail.'
                      />
                      {hasJailCard && (
                        <input
                          type='button'
                          value='Use Card'
                          onClick={handleUseJailCard}
                          title='Use Get Out of Jail Free card.'
                          className='ml-1.5'
                        />
                      )}
                      {currentPlayer.jailroll === 0 && (
                        <div className='text-xs text-gray-500'>
                          First turn in jail.
                        </div>
                      )}
                      {currentPlayer.jailroll === 1 && (
                        <div className='text-xs text-gray-500'>
                          Second turn in jail.
                        </div>
                      )}
                      {currentPlayer.jailroll === 2 && (
                        <div className='text-xs text-red-700'>
                          Third turn -- if you don't roll doubles, you must pay
                          the fine.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Landed info + buy/auction */}
                  {landed && (
                    <div className='block px-2 py-1.5 border border-gray-300 border-t-0 rounded-b-md w-full m-0 text-center bg-white box-border'>
                      {landed}
                      {canBuyProperty && (
                        <div className='mt-1.5'>
                          <input
                            type='button'
                            onClick={handleBuyProperty}
                            value={`Buy ($${squares[currentPlayer.position].price})`}
                            title={`Buy ${squares[currentPlayer.position].name}`}
                            disabled={auctionActive || !isMyTurn}
                          />
                          <input
                            type='button'
                            onClick={handleStartAuction}
                            value='Auction'
                            title='Put this property up for auction'
                            className='ml-1.5'
                            disabled={auctionActive || !isMyTurn}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'manage' && (
                <div className='block w-full border border-gray-300 rounded-md box-border'>
                  <div className='border-b border-gray-200 bg-white block align-middle p-1.5 text-center min-h-7 gap-1.5'>
                    <input
                      type='button'
                      value={
                        selectedProperty !== null &&
                        squares[selectedProperty] &&
                        squares[selectedProperty].house === 4
                          ? `Buy hotel ($${squares[selectedProperty].houseprice})`
                          : `Buy house${selectedProperty !== null && squares[selectedProperty] ? ` ($${squares[selectedProperty].houseprice})` : ''}`
                      }
                      onClick={handleBuyHouse}
                      disabled={selectedProperty === null}
                    />
                    <input
                      type='button'
                      value={
                        selectedProperty !== null &&
                        squares[selectedProperty] &&
                        squares[selectedProperty].mortgage
                          ? `Unmortgage ($${Math.round(squares[selectedProperty].price * 0.55)})`
                          : `Mortgage${selectedProperty !== null && squares[selectedProperty] ? ` ($${Math.round(squares[selectedProperty].price * 0.5)})` : ''}`
                      }
                      onClick={handleMortgage}
                      disabled={selectedProperty === null}
                    />
                    <input
                      type='button'
                      value={`Sell house${selectedProperty !== null && squares[selectedProperty] ? ` ($${Math.round(squares[selectedProperty].houseprice * 0.5)})` : ''}`}
                      onClick={handleSellHouse}
                      disabled={selectedProperty === null}
                    />
                  </div>
                  <div className='py-1 bg-white text-center max-h-97.5 overflow-y-auto'>
                    {ownedProperties.length === 0 ? (
                      <div className='p-1.5 text-gray-400'>
                        {currentPlayer
                          ? `${currentPlayer.name}, you don't have any properties.`
                          : 'No properties owned.'}
                      </div>
                    ) : (
                      ownedProperties.map((sq) => (
                        <div
                          key={sq.index}
                          className={`px-1.5 py-1 cursor-pointer mb-0.5 ${selectedProperty === sq.index ? 'bg-indigo-100' : 'bg-transparent'}`}
                          style={{ borderLeft: `4px solid ${sq.color}` }}
                          onClick={() => setSelectedProperty(sq.index)}
                          onMouseEnter={() => setDeedIndex(sq.index)}
                          onMouseLeave={() => setDeedIndex(-1)}
                        >
                          {sq.name}
                          {sq.mortgage && ' [M]'}
                          {sq.house > 0 && sq.house < 5 && ` (${sq.house}H)`}
                          {sq.house === 5 && ' (Hotel)'}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </td>
            <td className='align-top border-none'>
              <div
                className='text-[13px] font-bold font-sans border-2 rounded-md m-1.5 px-2.5 py-1.5 min-w-22.5 bg-linear-to-br from-blue-50 to-white max-sm:min-w-17.5 max-sm:text-xs'
                style={{
                  borderColor: currentPlayer ? currentPlayer.color : 'blue',
                }}
              >
                <div>
                  <span className='bg-white'>
                    {currentPlayer ? currentPlayer.name : 'Player'}
                  </span>
                  :
                </div>
                <div>
                  <span>${currentPlayer ? currentPlayer.money : 1500}</span>
                </div>
              </div>
              <div>
                {diceRolled && (
                  <>
                    <div
                      className='block m-1.5 float-left'
                      title={`Die (${die1} spots)`}
                    >
                      <img
                        className='w-9 h-9'
                        src={`/images/Die_${die1}.png`}
                        alt={die1}
                      />
                    </div>
                    <div
                      className='block m-1.5 float-left'
                      title={`Die (${die2} spots)`}
                    >
                      <img
                        className='w-9 h-9'
                        src={`/images/Die_${die2}.png`}
                        alt={die2}
                      />
                    </div>
                  </>
                )}
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan='2' className='border-none'>
              <div className='pt-2'>
                {roomCode && !isMyTurn && (
                  <div className='text-gray-400 italic mb-1.5'>
                    Waiting for{' '}
                    {currentPlayer ? currentPlayer.name : 'opponent'}...
                  </div>
                )}
                {showRollButton && (
                  <input
                    type='button'
                    title={
                      canRollAgain
                        ? 'You threw doubles. Roll again.'
                        : 'Roll the dice and move your token accordingly.'
                    }
                    value={canRollAgain ? 'Roll Again' : 'Roll Dice'}
                    onClick={handleRollDice}
                    disabled={auctionActive || !isMyTurn}
                  />
                )}
                {showEndTurnButton && (
                  <input
                    type='button'
                    title='End turn and advance to the next player.'
                    value='End Turn'
                    onClick={() => handleEndTurn()}
                    disabled={!isMyTurn}
                  />
                )}
                <input
                  type='button'
                  id='resignbutton'
                  title='If you cannot pay your debt then you must resign from the game.'
                  value='Resign'
                  onClick={handleResign}
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default Control;
