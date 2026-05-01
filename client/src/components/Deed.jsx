import React, { useContext } from 'react';
import GameContext from '../context/GameContext.jsx';

function Deed() {
  const { deedIndex, setDeedIndex, squares } = useContext(GameContext);

  if (deedIndex < 0 || !squares[deedIndex]) return null;

  const sq = squares[deedIndex];

  return (
    <div
      id='deed'
      style={{ display: 'block' }}
      onMouseLeave={() => setDeedIndex(-1)}
    >
      {sq.mortgage ? (
        <div id='deed-mortgaged' style={{ display: 'block' }}>
          <div id='deed-mortgaged-name'>{sq.name}</div>
          <p>&bull;</p>
          <div>MORTGAGED</div>
          <div>for ${sq.price / 2}</div>
          <p>&bull;</p>
          <div
            style={{ fontStyle: 'italic', fontSize: '13px', margin: '10px' }}
          >
            Card must be turned this side up if property is mortgaged
          </div>
        </div>
      ) : sq.groupNumber >= 3 ? (
        <div id='deed-normal' style={{ display: 'block' }}>
          <div id='deed-header' style={{ backgroundColor: sq.color }}>
            <div style={{ margin: '5px', fontSize: '11px' }}>
              T I T L E&nbsp;&nbsp;D E E D
            </div>
            <div id='deed-name'>{sq.name}</div>
          </div>
          <table id='deed-table'>
            <tbody>
              <tr>
                <td colSpan='2'>RENT&nbsp;${sq.baserent}.</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>With 1 House</td>
                <td style={{ textAlign: 'right' }}>
                  $&nbsp;&nbsp;&nbsp;{sq.rent1}.
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>With 2 Houses</td>
                <td style={{ textAlign: 'right' }}>{sq.rent2}.</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>With 3 Houses</td>
                <td style={{ textAlign: 'right' }}>{sq.rent3}.</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left' }}>With 4 Houses</td>
                <td style={{ textAlign: 'right' }}>{sq.rent4}.</td>
              </tr>
              <tr>
                <td colSpan='2'>
                  <div style={{ marginBottom: '8px' }}>
                    With HOTEL ${sq.rent5}.
                  </div>
                  <div>Mortgage Value ${sq.price / 2}.</div>
                  <div>Houses cost ${sq.houseprice}. each</div>
                  <div>Hotels, ${sq.houseprice}. plus 4 houses</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : sq.groupNumber > 0 ? (
        <div id='deed-special' style={{ display: 'block' }}>
          <div id='deed-special-name'>{sq.name}</div>
          <div id='deed-special-text'>
            {sq.groupNumber === 2
              ? 'If one "Utility" is owned rent is 4 times amount shown on dice. If both "Utilities" are owned rent is 10 times amount shown on dice.'
              : 'Rent $25. If 2 Railroads are owned $50. If 3 are owned $100. If 4 are owned $200.'}
          </div>
          <div id='deed-special-footer'>
            Mortgage Value{' '}
            <span style={{ float: 'right' }}>${sq.price / 2}.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Deed;
