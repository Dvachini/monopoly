import React, { useContext } from 'react';
import GameContext from '../context/GameContext.jsx';
import Button from './Button.jsx';

function MoneyBar() {
  const { showMoneyBar, players, pcount, turn, setShowStats } =
    useContext(GameContext);

  if (!showMoneyBar) return null;

  return (
    <div id='moneybar' className='card select-none p-2 sm:p-3'>
      <ul>
        {Array.from({ length: 8 }, (_, i) => i + 1)
          .filter((idx) => idx <= pcount)
          .map((idx) => (
            <li
              key={idx}
              id={`moneybarrow${idx}`}
              className={`mb-1 flex min-h-11 items-center gap-2 rounded-md border-l-4 bg-card px-2 py-1 ${idx === turn ? 'border-gold ring-2 ring-gold' : 'border-line'}`}
              style={{ borderLeftColor: players[idx] ? players[idx].color : undefined }}
            >
              <span
                className='disc h-6 w-6 text-xs'
                style={{
                  backgroundColor: players[idx] ? players[idx].color : 'gray',
                }}
              >
                <span className='disc-num'>{idx}</span>
              </span>
              <span
                id={`p${idx}moneyname`}
                className='min-w-0 flex-1 truncate font-semibold text-ink'
              >
                {players[idx] ? players[idx].name : `Player ${idx}`}
              </span>
              {idx === turn && (
                <span className='rounded-full bg-gold px-2 text-xs font-bold text-ink'>
                  Turn
                </span>
              )}
              <span className='font-bold tabular-nums text-ink'>
                $<span id={`p${idx}money`}>
                  {players[idx] ? players[idx].money : 1500}
                </span>
              </span>
            </li>
          ))}
      </ul>
      <Button
        id='viewstats'
        size='sm'
        full
        className='mt-1'
        title="View a pop-up window that shows a list of each player's properties."
        onClick={() => setShowStats(true)}
      >
        View stats
      </Button>
    </div>
  );
}

export default MoneyBar;
