import React, { useContext } from 'react';
import GameContext from '../context/GameContext.jsx';

function MoneyBar() {
  const { showMoneyBar, players, pcount, turn, setShowStats } =
    useContext(GameContext);

  if (!showMoneyBar) return null;

  return (
    <div className='select-none min-w-28'>
      <div
        id='moneybar'
        className='block bg-white rounded-xl relative z-14 cursor-default select-none shadow-sm border border-gray-200'
      >
        <table className='font-bold' style={{ borderSpacing: '1px' }}>
          <tbody>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((idx) => (
              <tr
                key={idx}
                id={`moneybarrow${idx}`}
                className='money-bar-row'
                style={{ display: idx <= pcount ? 'table-row' : 'none' }}
              >
                <td className='moneybararrowcell'>
                  <img
                    src='/images/arrow.png'
                    id={`p${idx}arrow`}
                    className='money-bar-arrow'
                    alt='>'
                    style={{ display: idx === turn ? 'inline' : 'none' }}
                  />
                </td>
                <td
                  id={`p${idx}moneybar`}
                  className='moneybarcell'
                  style={{
                    borderColor: players[idx] ? players[idx].color : 'gray',
                  }}
                >
                  <div>
                    <span
                      id={`p${idx}moneyname`}
                      style={{
                        color: players[idx] ? players[idx].color : 'black',
                      }}
                    >
                      {players[idx] ? players[idx].name : `Player ${idx}`}
                    </span>
                    :
                  </div>
                  <div>
                    $
                    <span id={`p${idx}money`}>
                      {players[idx] ? players[idx].money : 1500}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            <tr id='moneybarrowbutton'>
              <td className='moneybararrowcell'>&nbsp;</td>
              <td className='border-none'>
                <input
                  type='button'
                  id='viewstats'
                  value='View stats'
                  title="View a pop-up window that shows a list of each player's properties."
                  onClick={() => setShowStats(true)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MoneyBar;
