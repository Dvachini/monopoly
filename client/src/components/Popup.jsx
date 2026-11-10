import React, { useContext, useEffect, useRef } from 'react';
import GameContext from '../context/GameContext.jsx';
import Button from './Button.jsx';
import useDialogFocus from './useDialogFocus.jsx';

function Popup() {
  const { popupData, closePopup } = useContext(GameContext);
  const dialogRef = useRef(null);

  useDialogFocus(Boolean(popupData), dialogRef);

  // Scrim click and Esc act like the safe button: No for Yes/No, OK for OK
  const dismiss = () => {
    if (
      popupData &&
      popupData.option &&
      popupData.option.toLowerCase() !== 'yes/no' &&
      popupData.option.toLowerCase() !== 'blank' &&
      typeof popupData.action === 'function'
    ) {
      popupData.action();
    } else if (popupData && !popupData.option && typeof popupData.action === 'function') {
      popupData.action();
    }
    closePopup();
  };

  useEffect(() => {
    if (!popupData) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [popupData]);

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
        className='scrim [--z:var(--z-confirm)]'
        onClick={dismiss}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-label='Message'
        className='dialog-wrap select-none [--z:var(--z-confirm)]'
      >
        <div className='modal modal-body min-w-0 text-base text-center wrap-break-word leading-normal select-none'>
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
              <div className='mt-3 flex gap-3'>
                <Button full onClick={handleNo}>
                  No
                </Button>
                <Button variant='primary' full onClick={handleYes}>
                  Yes
                </Button>
              </div>
            ) : opt !== 'blank' ? (
              <div className='mt-3'>
                <Button variant='primary' full onClick={handleOk}>
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
