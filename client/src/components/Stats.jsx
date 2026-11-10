import React, { useContext, useEffect, useRef } from 'react';
import GameContext from '../context/GameContext.jsx';
import Button from './Button.jsx';
import Pawn from './Pawn.jsx';
import Cash from './Cash.jsx';
import useDialogFocus from './useDialogFocus.jsx';

function Stats() {
  const { showStats, setShowStats, players, pcount, squares } =
    useContext(GameContext);

  const dialogRef = useRef(null);

  useDialogFocus(showStats, dialogRef);

  // Escape closes the stats
  useEffect(() => {
    if (!showStats) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowStats(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showStats, setShowStats]);

  if (!showStats) return null;

  return (
    <>
      <div
        className='scrim'
        onClick={() => setShowStats(false)}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-labelledby='stats-title'
        className='dialog-wrap select-none'
      >
        <div className='modal [--w:48rem]'>
          <div className='modal-head'>
            <h2 id='stats-title' className='modal-title'>
              Player stats
            </h2>
            <Button
              variant='ghost'
              size='sm'
              aria-label='Close'
              className='lg:min-h-11!'
              onClick={() => setShowStats(false)}
            >
              ×
            </Button>
          </div>
          <div className='modal-body grid gap-3 text-sm sm:grid-cols-2'>
            {Array.from({ length: pcount }, (_, i) => i + 1).map((idx) => {
              const p = players[idx];
              if (!p) return null;
              return (
                <section
                  key={idx}
                  className='min-w-0 rounded-[10px] border border-line bg-card p-2'
                  style={{ borderLeft: `5px solid ${p.color}` }}
                >
                  <div className='flex items-center gap-2 font-bold'>
                    <Pawn color={p.color} n={idx} size={34} />
                    <span className='min-w-0 flex-1 truncate'>{p.name}</span>
                    <Cash value={p.money} />
                  </div>
                  <ul className='mt-2'>
                    {squares
                      .filter((sq) => sq && sq.owner === idx)
                      .map((sq) => (
                        <li key={sq.index} className='flex items-center gap-2 py-0.5'>
                          <i
                            className='deed-mini'
                            style={{ backgroundColor: sq.color, width: 10, height: 14 }}
                          />
                          <span className='min-w-0 flex-1'>{sq.name}</span>
                          <span className='text-xs text-ink-muted'>
                            {sq.mortgage
                              ? 'Mortgaged'
                              : sq.house === 5
                                ? 'Hotel'
                                : sq.house > 0
                                  ? `${sq.house} ${sq.house === 1 ? 'house' : 'houses'}`
                                  : ''}
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default Stats;
