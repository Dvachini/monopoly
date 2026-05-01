import React, { useContext, useState, useEffect } from 'react';
import GameContext from '../context/GameContext.jsx';
import SocketContext from '../context/SocketContext.jsx';

function Auction() {
  const {
    auctionProperty,
    setAuctionProperty,
    auctionBid,
    setAuctionBid,
    auctionBidder,
    setAuctionBidder,
    auctionTurn,
    setAuctionTurn,
    auctionActive,
    setAuctionActive,
    auctionPlayers,
    setAuctionPlayers,
    squares,
    setSquares,
    players,
    setPlayers,
    pcount,
    turn,
    setTurn,
    setDiceRolled,
    setLanded,
    setDoublecount,
    addAlert,
    auctionEndTurnPending,
    setAuctionEndTurnPending,
  } = useContext(GameContext);

  const { socket, myPlayerIndex, roomCode } = useContext(SocketContext);

  const [bidAmount, setBidAmount] = useState('');
  // Track consecutive passes — auction ends when passCount reaches auctionPlayers.length
  const [passCount, setPassCount] = useState(0);

  // Broadcast auction state to other players
  const broadcastAuction = (data) => {
    if (socket && roomCode) {
      socket.emit('sync-state', {
        gameState: {
          auction: {
            auctionActive:
              data.active !== undefined ? data.active : auctionActive,
            auctionProperty:
              data.property !== undefined ? data.property : auctionProperty,
            auctionBid: data.bid !== undefined ? data.bid : auctionBid,
            auctionBidder:
              data.bidder !== undefined ? data.bidder : auctionBidder,
            auctionTurn: data.turn !== undefined ? data.turn : auctionTurn,
            auctionPlayers:
              data.players !== undefined ? data.players : auctionPlayers,
            passCount:
              data.passCount !== undefined ? data.passCount : passCount,
          },
          players: data.newPlayers || players,
          squares: data.newSquares || squares,
          turn: data.gameTurn !== undefined ? data.gameTurn : turn,
        },
      });
    }
  };

  // Listen for auction state from other players
  useEffect(() => {
    if (!socket) return;
    const handleSync = ({ gameState }) => {
      if (!gameState || !gameState.auction) return;
      const a = gameState.auction;
      if (a.auctionActive !== undefined) setAuctionActive(a.auctionActive);
      if (a.auctionProperty !== undefined)
        setAuctionProperty(a.auctionProperty);
      if (a.auctionBid !== undefined) setAuctionBid(a.auctionBid);
      if (a.auctionBidder !== undefined) setAuctionBidder(a.auctionBidder);
      if (a.auctionTurn !== undefined) setAuctionTurn(a.auctionTurn);
      if (a.auctionPlayers !== undefined) setAuctionPlayers(a.auctionPlayers);
      if (a.passCount !== undefined) setPassCount(a.passCount);
      // Also sync players/squares from auction broadcasts
      if (gameState.players) setPlayers(gameState.players);
      if (gameState.squares) setSquares(gameState.squares);
      if (gameState.turn !== undefined && !a.auctionActive) {
        setTurn(gameState.turn);
      }
    };
    socket.on('state-synced', handleSync);
    return () => socket.off('state-synced', handleSync);
  }, [socket]);

  if (!auctionActive || auctionProperty === null) return null;

  const sq = squares[auctionProperty];
  if (!sq) return null;

  const currentBidderIndex =
    auctionPlayers[auctionTurn % auctionPlayers.length];
  const currentBidderPlayer = players[currentBidderIndex];

  // In multiplayer, only the current auction bidder can act
  const isMyAuctionTurn = !roomCode || myPlayerIndex === currentBidderIndex;

  const handleBid = () => {
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || amount <= auctionBid) {
      addAlert(`Bid must be higher than $${auctionBid}.`);
      return;
    }
    if (currentBidderPlayer && amount > currentBidderPlayer.money) {
      addAlert(`${currentBidderPlayer.name} doesn't have enough money.`);
      return;
    }

    setAuctionBid(amount);
    setAuctionBidder(currentBidderIndex);
    setPassCount(0); // Reset pass count on new bid
    addAlert(`${currentBidderPlayer.name} bids $${amount} for ${sq.name}.`);
    setBidAmount('');

    // Move to next player
    const nextTurn = (auctionTurn + 1) % auctionPlayers.length;
    setAuctionTurn(nextTurn);
    broadcastAuction({
      bid: amount,
      bidder: currentBidderIndex,
      turn: nextTurn,
      passCount: 0,
    });
  };

  const handlePass = () => {
    addAlert(`${currentBidderPlayer.name} passes.`);

    const newPassCount = passCount + 1;

    // If there's a bid and all other players passed, highest bidder auto-wins
    if (auctionBid > 0 && newPassCount >= auctionPlayers.length - 1) {
      finishAuction();
      return;
    }

    // If everyone passed with no bid, property unsold
    if (newPassCount >= auctionPlayers.length) {
      finishAuction();
      return;
    }

    setPassCount(newPassCount);

    // Move to next player (keep all players in the rotation)
    const nextTurn = (auctionTurn + 1) % auctionPlayers.length;
    setAuctionTurn(nextTurn);
    broadcastAuction({ turn: nextTurn, passCount: newPassCount });
  };

  const finishAuction = () => {
    if (auctionBid > 0 && auctionBidder > 0) {
      const winner = players[auctionBidder];
      addAlert(
        `${winner.name} wins the auction for ${sq.name} at $${auctionBid}!`,
      );

      const newPlayers = [...players];
      newPlayers[auctionBidder] = {
        ...newPlayers[auctionBidder],
        money: newPlayers[auctionBidder].money - auctionBid,
      };
      setPlayers(newPlayers);

      const newSquares = [...squares];
      newSquares[auctionProperty] = {
        ...newSquares[auctionProperty],
        owner: auctionBidder,
      };
      setSquares(newSquares);

      endAuction(newPlayers, newSquares);
    } else {
      addAlert(`No one bid on ${sq.name}. Property remains unowned.`);
      endAuction();
    }
  };

  const endAuction = (newPlayers, newSquares) => {
    const shouldAdvanceTurn = auctionEndTurnPending;
    setAuctionActive(false);
    setAuctionProperty(null);
    setAuctionBid(0);
    setAuctionBidder(0);
    setAuctionTurn(0);
    setAuctionPlayers([]);
    setBidAmount('');
    setAuctionEndTurnPending(false);

    if (shouldAdvanceTurn) {
      let nextTurn = turn;
      const ps = newPlayers || players;
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
      if (ps[nextTurn]) {
        addAlert(`It is ${ps[nextTurn].name}'s turn.`);
      }
      broadcastAuction({
        active: false,
        property: null,
        bid: 0,
        bidder: 0,
        turn: 0,
        players: [],
        newPlayers: ps,
        newSquares: newSquares || squares,
        gameTurn: nextTurn,
      });
    } else {
      broadcastAuction({
        active: false,
        property: null,
        bid: 0,
        bidder: 0,
        turn: 0,
        players: [],
        newPlayers: newPlayers || players,
        newSquares: newSquares || squares,
      });
    }
  };

  return (
    <>
      <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-900' />
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-2xl p-6 z-901 min-w-80 text-center shadow-2xl max-sm:w-[90%] max-sm:min-w-0 max-sm:max-w-87.5 max-sm:p-4'>
        <h3 className='m-0 mb-2.5 text-lg font-semibold'>Auction</h3>
        <div
          className='p-2.5 mb-2.5 bg-gray-50 rounded'
          style={{
            borderTop:
              sq.color !== '#FFFFFF' ? `6px solid ${sq.color}` : 'none',
          }}
        >
          <div className='font-bold text-base'>{sq.name}</div>
          <div className='text-gray-500'>List price: {sq.pricetext}</div>
        </div>

        <div className='mb-2.5'>
          <div className='text-sm'>
            Current bid: <strong>${auctionBid}</strong>
            {auctionBidder > 0 && (
              <span>
                {' '}
                by{' '}
                <span style={{ color: players[auctionBidder]?.color }}>
                  {players[auctionBidder]?.name}
                </span>
              </span>
            )}
          </div>
        </div>

        <div
          className='p-2.5 mb-2.5 bg-indigo-50 rounded'
          style={{
            borderLeft: `4px solid ${currentBidderPlayer?.color || 'gray'}`,
          }}
        >
          <div
            className='font-bold'
            style={{ color: currentBidderPlayer?.color }}
          >
            {currentBidderPlayer?.name}'s turn to bid
          </div>
          <div className='text-[13px] text-gray-500'>
            Money: ${currentBidderPlayer?.money}
          </div>
        </div>

        <div className='mb-2.5'>
          <span>$</span>
          <input
            type='number'
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder={`Min $${auctionBid + 1}`}
            className='w-20 mr-2 p-1 border border-gray-300 rounded'
            min={auctionBid + 1}
            disabled={!isMyAuctionTurn}
          />
          <input
            type='button'
            value='Bid'
            onClick={handleBid}
            className='mr-1.5'
            disabled={!isMyAuctionTurn}
          />
          <input
            type='button'
            value='Pass'
            onClick={handlePass}
            disabled={!isMyAuctionTurn}
          />
        </div>

        {roomCode && !isMyAuctionTurn && (
          <div className='text-gray-400 italic text-[13px] mb-2'>
            Waiting for {currentBidderPlayer?.name} to bid...
          </div>
        )}

        <div className='text-xs text-gray-400'>
          {auctionPlayers.length} player{auctionPlayers.length !== 1 ? 's' : ''}{' '}
          in auction
          {auctionBid > 0 && passCount > 0 && (
            <span>
              {' '}
              &middot; {passCount} pass{passCount !== 1 ? 'es' : ''} (ends at{' '}
              {auctionPlayers.length - 1})
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default Auction;
