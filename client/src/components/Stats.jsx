import React, { useContext, useEffect, useRef } from 'react';
import GameContext from '../context/GameContext.jsx';
import Button from './Button.jsx';
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
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-16'
        onClick={() => setShowStats(false)}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-label='Stats'
        className='fixed inset-0 flex items-center justify-center z-17 select-none p-4 pointer-events-none'
      >
        <div className='w-full max-w-3xl min-w-0 max-h-[80vh] overflow-y-auto font-sans text-sm p-5 text-center wrap-break-word leading-normal border border-line rounded-2xl bg-card text-ink relative select-none shadow-2xl pointer-events-auto'>
          <div className='relative'>
            <Button
              size='sm'
              aria-label='Close'
              className='absolute -top-3 -right-3 z-17 rounded-full'
              onClick={() => setShowStats(false)}
            >
              ×
            </Button>
            <div className='overflow-hidden min-h-17.5'>
              <table className='mx-auto'>
                <tbody>
                  <tr>
                    {Array.from(
                      { length: Math.min(pcount, 4) },
                      (_, i) => i + 1,
                    ).map((idx) => {
                      const p = players[idx];
                      if (!p) return null;
                      return (
                        <td
                          key={idx}
                          className='statscell'
                          style={{ border: `2px solid ${p.color}` }}
                        >
                          <div className='statsplayername'>{p.name}</div>
                          {squares
                            .filter((sq) => sq && sq.owner === idx)
                            .map((sq, j) => (
                              <div key={j} className='text-left'>
                                <span
                                  className='statscellcolor inline-block w-5 h-5'
                                  style={{ backgroundColor: sq.color }}
                                />{' '}
                                {sq.name}
                              </div>
                            ))}
                        </td>
                      );
                    })}
                  </tr>
                  {pcount > 4 && (
                    <tr>
                      {Array.from(
                        { length: Math.min(pcount - 4, 4) },
                        (_, i) => i + 5,
                      ).map((idx) => {
                        const p = players[idx];
                        if (!p) return null;
                        return (
                          <td
                            key={idx}
                            className='statscell'
                            style={{ border: `2px solid ${p.color}` }}
                          >
                            <div className='statsplayername'>{p.name}</div>
                            {squares
                              .filter((sq) => sq && sq.owner === idx)
                              .map((sq, j) => (
                                <div key={j} className='text-left'>
                                  <span
                                    className='statscellcolor inline-block w-5 h-5'
                                    style={{ backgroundColor: sq.color }}
                                  />{' '}
                                  {sq.name}
                                </div>
                              ))}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Stats;
