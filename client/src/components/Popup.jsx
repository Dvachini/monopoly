import React, { useContext, useRef } from 'react';
import GameContext from '../context/GameContext.jsx';
import Button from './Button.jsx';
import useDialogFocus from './useDialogFocus.jsx';

function Popup() {
  const { popupData, closePopup } = useContext(GameContext);
  const dialogRef = useRef(null);

  useDialogFocus(Boolean(popupData), dialogRef);

  if (!popupData) return null;

  const { message, action, option } = popupData;
  const opt = option ? option.toLowerCase() : '';

  const handleOk = () => {
    if (typeof action === 'function') action();
    closePopup();
  };

  const handleYes = () => {
    if (typeof action === 'function') action();
    closePopup();
  };

  const handleNo = () => {
    closePopup();
  };

  return (
    <>
      <div
        className='modal-overlay fixed inset-0 bg-black/55 z-10'
        onClick={closePopup}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-label='Message'
        className='fixed inset-0 flex items-center justify-center z-13 select-none p-4 pointer-events-none'
      >
        <div className='modal w-full max-w-sm min-w-0 text-base p-5 text-center wrap-break-word leading-normal z-13 select-none pointer-events-auto'>
          <div className='relative'>
            <div className='overflow-x-auto'>
              {/* message: array = one paragraph per item (nested array = lines
                  joined by <br/>), all plain text. A string only understands
                  <p>, <br/> and <b>; everything else is shown as text. */}
              {(Array.isArray(message)
                ? message
                : String(message)
                    .split(/<\/?p>/i)
                    .filter((para) => para.trim() !== '')
                    .map((para) => para.split(/<br\s*\/?>/i))
              ).map((para, i) => (
                <p key={i}>
                  {(Array.isArray(para) ? para : [para]).map((line, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <br />}
                      {Array.isArray(message)
                        ? line
                        : line.split(/<b>(.*?)<\/b>/i).map((part, k) =>
                            k % 2 === 1 ? <b key={k}>{part}</b> : part,
                          )}
                    </React.Fragment>
                  ))}
                </p>
              ))}
            </div>
            {opt === 'yes/no' ? (
              <div className='mt-3 flex gap-2 justify-center'>
                <Button variant='primary' onClick={handleYes}>
                  Yes
                </Button>
                <Button onClick={handleNo}>No</Button>
              </div>
            ) : opt !== 'blank' ? (
              <div className='mt-3'>
                <Button variant='primary' onClick={handleOk}>
                  OK
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export default Popup;
