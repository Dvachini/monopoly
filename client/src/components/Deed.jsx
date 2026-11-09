import React, { useContext, useEffect, useRef } from 'react';
import GameContext from '../context/GameContext.jsx';
import Button from './Button.jsx';
import useDialogFocus from './useDialogFocus.jsx';

function Deed() {
  const { deedIndex, setDeedIndex, squares } = useContext(GameContext);

  const open = deedIndex >= 0 && Boolean(squares[deedIndex]);
  const dialogRef = useRef(null);

  useDialogFocus(open, dialogRef);

  // Escape closes the preview
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setDeedIndex(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setDeedIndex]);

  if (!open) return null;

  const sq = squares[deedIndex];

  return (
    <>
      <div className='deed-backdrop' onClick={() => setDeedIndex(-1)} />
      <div id='deed' ref={dialogRef} tabIndex={-1} role='dialog' aria-label={sq.name}>
        {sq.groupNumber >= 3 && (
          <div
            className='deed-band'
            role='presentation'
            style={{ backgroundColor: sq.color }}
          />
        )}
        <div className='p-4'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='deed-title'>{sq.name}</div>
              <div className='text-sm text-ink-muted'>
                {sq.groupNumber === 1
                  ? 'Railroad'
                  : sq.groupNumber === 2
                    ? 'Utility'
                    : [
                        'Brown',
                        'Light blue',
                        'Pink',
                        'Orange',
                        'Red',
                        'Yellow',
                        'Green',
                        'Dark blue',
                      ][sq.groupNumber - 3]}
                {sq.groupNumber >= 3 && ' property'}
              </div>
            </div>
            <Button
              variant='ghost'
              size='sm'
              aria-label='Close'
              onClick={() => setDeedIndex(-1)}
            >
              ×
            </Button>
          </div>

          {sq.mortgage ? (
            <div className='mt-3 text-sm'>
              <p className='font-bold text-danger'>MORTGAGED</p>
              <p>Mortgage value ${sq.price / 2}</p>
              <p className='mt-2 text-ink-muted'>
                Card must be turned this side up if property is mortgaged
              </p>
            </div>
          ) : sq.groupNumber >= 3 ? (
            <dl className='deed-rows mt-3 text-sm'>
              <div>
                <dt>Rent</dt>
                <dd>${sq.baserent}</dd>
              </div>
              <div>
                <dt>With 1 house</dt>
                <dd>${sq.rent1}</dd>
              </div>
              <div>
                <dt>With 2 houses</dt>
                <dd>${sq.rent2}</dd>
              </div>
              <div>
                <dt>With 3 houses</dt>
                <dd>${sq.rent3}</dd>
              </div>
              <div>
                <dt>With 4 houses</dt>
                <dd>${sq.rent4}</dd>
              </div>
              <div>
                <dt>With hotel</dt>
                <dd>${sq.rent5}</dd>
              </div>
              <div>
                <dt>Mortgage value</dt>
                <dd>${sq.price / 2}</dd>
              </div>
              <div>
                <dt>Houses cost</dt>
                <dd>${sq.houseprice} each</dd>
              </div>
              <div>
                <dt>Hotel costs</dt>
                <dd>${sq.houseprice} plus 4 houses</dd>
              </div>
            </dl>
          ) : (
            <div className='mt-3 text-sm'>
              <p>
                {sq.groupNumber === 2
                  ? 'If one "Utility" is owned rent is 4 times amount shown on dice. If both "Utilities" are owned rent is 10 times amount shown on dice.'
                  : 'Rent $25. If 2 Railroads are owned $50. If 3 are owned $100. If 4 are owned $200.'}
              </p>
              <p className='mt-2 font-semibold'>
                Mortgage value ${sq.price / 2}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Deed;
