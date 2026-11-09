import React, { useContext, useEffect, useRef, useState } from 'react';
import Button from './Button.jsx';
import GameContext from '../context/GameContext.jsx';
import useDialogFocus from './useDialogFocus.jsx';

function Trade() {
  const {
    showTrade,
    setShowTrade,
    players,
    setPlayers,
    squares,
    setSquares,
    pcount,
    turn,
    addAlert,
    popup,
    popupData,
  } = useContext(GameContext);
  const dialogRef = useRef(null);
  const [rightPlayer, setRightPlayer] = useState(() => {
    for (let i = 1; i <= 8; i++) {
      if (i !== turn) return i;
    }
    return 1;
  });
  const [leftMoney, setLeftMoney] = useState(0);
  const [rightMoney, setRightMoney] = useState(0);
  const [leftProperties, setLeftProperties] = useState([]);
  const [rightProperties, setRightProperties] = useState([]);
  const [leftJailCard, setLeftJailCard] = useState(false);
  const [rightJailCard, setRightJailCard] = useState(false);

  useDialogFocus(showTrade, dialogRef);

  // Escape cancels the trade (unless the accept/decline popup is on top)
  useEffect(() => {
    if (!showTrade || popupData) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowTrade(false);
        setLeftMoney(0);
        setRightMoney(0);
        setLeftProperties([]);
        setRightProperties([]);
        setLeftJailCard(false);
        setRightJailCard(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showTrade, popupData]);

  if (!showTrade) return null;

  const currentPlayer = players[turn];
  const otherPlayer = players[rightPlayer];

  const leftOwned = squares.filter(
    (sq) => sq && sq.owner === turn && sq.groupNumber > 0 && sq.house === 0,
  );
  const rightOwned = squares.filter(
    (sq) =>
      sq && sq.owner === rightPlayer && sq.groupNumber > 0 && sq.house === 0,
  );

  const toggleLeftProp = (idx) => {
    setLeftProperties((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  const toggleRightProp = (idx) => {
    setRightProperties((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  const handlePropose = () => {
    const lm = parseInt(leftMoney, 10) || 0;
    const rm = parseInt(rightMoney, 10) || 0;

    if (
      lm === 0 &&
      rm === 0 &&
      leftProperties.length === 0 &&
      rightProperties.length === 0 &&
      !leftJailCard &&
      !rightJailCard
    ) {
      addAlert('Nothing selected to trade.');
      return;
    }

    if (lm > currentPlayer.money) {
      addAlert(`${currentPlayer.name} doesn't have $${lm}.`);
      return;
    }
    if (rm > otherPlayer.money) {
      addAlert(`${otherPlayer.name} doesn't have $${rm}.`);
      return;
    }

    const tradeDesc = [];
    if (lm > 0) tradeDesc.push(`${currentPlayer.name} gives $${lm}`);
    if (rm > 0) tradeDesc.push(`${otherPlayer.name} gives $${rm}`);
    leftProperties.forEach((idx) =>
      tradeDesc.push(`${currentPlayer.name} gives ${squares[idx].name}`),
    );
    rightProperties.forEach((idx) =>
      tradeDesc.push(`${otherPlayer.name} gives ${squares[idx].name}`),
    );

    popup(
      [`${otherPlayer.name}, do you accept this trade?`, tradeDesc],
      () => {
        // Execute trade
        const newPlayers = [...players];
        const newSquares = [...squares];

        // Money exchange
        newPlayers[turn] = {
          ...newPlayers[turn],
          money: newPlayers[turn].money - lm + rm,
        };
        newPlayers[rightPlayer] = {
          ...newPlayers[rightPlayer],
          money: newPlayers[rightPlayer].money - rm + lm,
        };

        // Property exchange
        leftProperties.forEach((idx) => {
          newSquares[idx] = { ...newSquares[idx], owner: rightPlayer };
        });
        rightProperties.forEach((idx) => {
          newSquares[idx] = { ...newSquares[idx], owner: turn };
        });

        // Jail card exchange
        if (leftJailCard) {
          if (newPlayers[turn].communityChestJailCard) {
            newPlayers[turn] = {
              ...newPlayers[turn],
              communityChestJailCard: false,
            };
            newPlayers[rightPlayer] = {
              ...newPlayers[rightPlayer],
              communityChestJailCard: true,
            };
          } else if (newPlayers[turn].chanceJailCard) {
            newPlayers[turn] = { ...newPlayers[turn], chanceJailCard: false };
            newPlayers[rightPlayer] = {
              ...newPlayers[rightPlayer],
              chanceJailCard: true,
            };
          }
        }
        if (rightJailCard) {
          if (newPlayers[rightPlayer].communityChestJailCard) {
            newPlayers[rightPlayer] = {
              ...newPlayers[rightPlayer],
              communityChestJailCard: false,
            };
            newPlayers[turn] = {
              ...newPlayers[turn],
              communityChestJailCard: true,
            };
          } else if (newPlayers[rightPlayer].chanceJailCard) {
            newPlayers[rightPlayer] = {
              ...newPlayers[rightPlayer],
              chanceJailCard: false,
            };
            newPlayers[turn] = { ...newPlayers[turn], chanceJailCard: true };
          }
        }

        setPlayers(newPlayers);
        setSquares(newSquares);
        addAlert('Trade completed!');
        setShowTrade(false);
        resetTrade();
      },
      'yes/no',
    );
  };

  const resetTrade = () => {
    setLeftMoney(0);
    setRightMoney(0);
    setLeftProperties([]);
    setRightProperties([]);
    setLeftJailCard(false);
    setRightJailCard(false);
  };

  return (
    <div className='fixed inset-0 z-14 flex items-start justify-center pt-4 pb-4'>
      <div
        className='modal-overlay fixed inset-0 bg-black/55'
        onClick={() => {
          setShowTrade(false);
          resetTrade();
        }}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-label='Trade'
        className='modal relative w-[92%] max-w-xl p-4 max-h-[90dvh] overflow-y-auto'
      >
        <table className='w-full' style={{ borderSpacing: '3px' }}>
          <tbody>
            <tr>
              <td className='trade-cell w-1/2'>
                <div className='text-[13px] font-bold'>
                  {currentPlayer ? currentPlayer.name : 'Player'}
                </div>
              </td>
              <td className='trade-cell w-1/2'>
                <div className='text-[13px] font-bold'>
                  <select
                    aria-label='Trade partner'
                    className='min-h-11 lg:min-h-0'
                    value={rightPlayer}
                    onChange={(e) => {
                      setRightPlayer(parseInt(e.target.value, 10));
                      setRightProperties([]);
                      setRightJailCard(false);
                    }}
                  >
                    {Array.from({ length: pcount }, (_, i) => i + 1)
                      .filter(
                        (i) =>
                          i !== turn && players[i] && players[i].position >= 0,
                      )
                      .map((i) => (
                        <option key={i} value={i}>
                          {players[i] ? players[i].name : `Player ${i}`}
                        </option>
                      ))}
                  </select>
                </div>
              </td>
            </tr>
            <tr>
              <td className='trade-cell'>
                $&nbsp;
                <input
                  type='number'
                  min='0'
                  value={leftMoney}
                  onChange={(e) => setLeftMoney(e.target.value)}
                  aria-label='Money you give'
                  title='Enter amount to give to the other player.'
                  className='w-20 min-h-11 lg:min-h-0'
                />
              </td>
              <td className='trade-cell'>
                $&nbsp;
                <input
                  type='number'
                  min='0'
                  value={rightMoney}
                  onChange={(e) => setRightMoney(e.target.value)}
                  aria-label='Money you receive'
                  title='Enter amount to receive from the other player.'
                  className='w-20 min-h-11 lg:min-h-0'
                />
              </td>
            </tr>
            <tr>
              <td className='trade-cell align-top'>
                {leftOwned.length === 0 ? (
                  <div className='text-ink-muted text-xs'>
                    No tradeable properties
                  </div>
                ) : (
                  leftOwned.map((sq) => (
                    <label
                      key={sq.index}
                      className='block cursor-pointer py-0.5'
                    >
                      <input
                        type='checkbox'
                        checked={leftProperties.includes(sq.index)}
                        onChange={() => toggleLeftProp(sq.index)}
                      />
                      <span
                        className='pl-1 ml-1'
                        style={{ borderLeft: `3px solid ${sq.color}` }}
                      >
                        {sq.name}
                        {sq.mortgage ? ' [M]' : ''}
                      </span>
                    </label>
                  ))
                )}
                {currentPlayer &&
                  (currentPlayer.communityChestJailCard ||
                    currentPlayer.chanceJailCard) && (
                    <label className='block cursor-pointer py-0.5 mt-1.5'>
                      <input
                        type='checkbox'
                        checked={leftJailCard}
                        onChange={() => setLeftJailCard(!leftJailCard)}
                      />
                      <span className='pl-1 ml-1'>Get Out of Jail Free</span>
                    </label>
                  )}
              </td>
              <td className='trade-cell align-top'>
                {rightOwned.length === 0 ? (
                  <div className='text-ink-muted text-xs'>
                    No tradeable properties
                  </div>
                ) : (
                  rightOwned.map((sq) => (
                    <label
                      key={sq.index}
                      className='block cursor-pointer py-0.5'
                    >
                      <input
                        type='checkbox'
                        checked={rightProperties.includes(sq.index)}
                        onChange={() => toggleRightProp(sq.index)}
                      />
                      <span
                        className='pl-1 ml-1'
                        style={{ borderLeft: `3px solid ${sq.color}` }}
                      >
                        {sq.name}
                        {sq.mortgage ? ' [M]' : ''}
                      </span>
                    </label>
                  ))
                )}
                {otherPlayer &&
                  (otherPlayer.communityChestJailCard ||
                    otherPlayer.chanceJailCard) && (
                    <label className='block cursor-pointer py-0.5 mt-1.5'>
                      <input
                        type='checkbox'
                        checked={rightJailCard}
                        onChange={() => setRightJailCard(!rightJailCard)}
                      />
                      <span className='pl-1 ml-1'>Get Out of Jail Free</span>
                    </label>
                  )}
              </td>
            </tr>
            <tr>
              <td colSpan='2' className='trade-cell'>
                <Button
                  variant='primary'
                  id='proposetradebutton'
                  onClick={handlePropose}
                  title='Exchange the money and properties that are checked above.'
                >
                  Propose Trade
                </Button>{' '}
                <Button
                  id='canceltradebutton'
                  onClick={() => {
                    setShowTrade(false);
                    resetTrade();
                  }}
                  title='Cancel the trade.'
                >
                  Cancel Trade
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Trade;
