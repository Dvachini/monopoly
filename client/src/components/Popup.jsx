import React, { useContext } from 'react';
import GameContext from '../context/GameContext.jsx';

function Popup() {
  const { popupData, closePopup } = useContext(GameContext);

  if (!popupData) return null;

  const { html, action, option } = popupData;
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
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-10'
        onClick={closePopup}
      />
      <div className='fixed inset-0 flex items-center justify-center z-13 select-none p-4 pointer-events-none'>
        <div className='w-full max-w-sm min-w-0 font-sans text-sm p-5 text-center wrap-break-word leading-normal border border-gray-200 rounded-2xl bg-white z-13 select-none shadow-2xl pointer-events-auto'>
          <div className='relative'>
            <div
              className='overflow-x-auto'
              dangerouslySetInnerHTML={{ __html: html }}
            />
            {opt === 'yes/no' ? (
              <div className='mt-3 flex gap-2 justify-center'>
                <input type='button' value='Yes' onClick={handleYes} />
                <input type='button' value='No' onClick={handleNo} />
              </div>
            ) : opt !== 'blank' ? (
              <div className='mt-3'>
                <input type='button' value='OK' onClick={handleOk} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export default Popup;
