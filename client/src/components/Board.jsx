import React, { useContext, useState } from 'react';
import GameContext from '../context/GameContext.jsx';
import Control from './Control.jsx';
import MoneyBar from './MoneyBar.jsx';

function Board() {
  const { showBoard, squares, players, setDeedIndex } = useContext(GameContext);
  const [zoom, setZoom] = useState(1);

  if (!showBoard) return null;

  const topRow = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
  const bottomRow = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  const leftCol = [19, 18, 17, 16, 15, 14, 13, 12, 11];
  const rightCol = [31, 32, 33, 34, 35, 36, 37, 38, 39];

  const getCellClass = (index) => {
    if ([0, 10, 20, 30].includes(index)) return 'cell board-corner';
    if (index > 20 && index < 30) return 'cell board-top';
    if (index > 0 && index < 10) return 'cell board-bottom';
    if (index > 10 && index < 20) return 'cell board-left';
    if (index > 30 && index < 40) return 'cell board-right';
    return 'cell';
  };

  const getSquareName = (index) => {
    if (squares[index]) return squares[index].name;
    return '';
  };

  const getSquareColor = (index) => {
    if (squares[index] && squares[index].groupNumber >= 3)
      return squares[index].color;
    return null;
  };

  const getPlayerPositions = (cellIndex) => {
    return players
      .filter((p, i) => i > 0 && p.position === cellIndex && !p.jail)
      .map((p) => (
        <div
          key={p.index}
          className='cell-position'
          title={p.name}
          style={{ backgroundColor: p.color }}
        />
      ));
  };

  const renderCell = (index) => {
    const color = getSquareColor(index);
    return (
      <td
        key={index}
        className={getCellClass(index)}
        id={`cell${index}`}
        onMouseEnter={() => {
          if (squares[index] && squares[index].groupNumber > 0)
            setDeedIndex(index);
        }}
        onMouseLeave={() => setDeedIndex(-1)}
      >
        <div className='cell-anchor'>
          {color && (
            <div
              className='cell-color-strip'
              style={{ backgroundColor: color }}
            />
          )}
          <div className='cell-position-holder'>
            {getPlayerPositions(index)}
          </div>
          <div className='cell-name'>{getSquareName(index)}</div>
          {squares[index] &&
            squares[index].groupNumber > 0 &&
            squares[index].owner > 0 && (
              <div
                className='cell-owner'
                style={{
                  display: 'block',
                  backgroundColor: players[squares[index].owner]
                    ? players[squares[index].owner].color
                    : 'transparent',
                }}
              />
            )}
        </div>
      </td>
    );
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.5));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.3));
  const resetZoom = () => setZoom(1);

  return (
    <div className='board-wrapper'>
      <div className='board-zoom-controls'>
        <button onClick={zoomOut} title='Zoom out'>
          −
        </button>
        <button
          onClick={resetZoom}
          title='Reset zoom'
          className='board-zoom-label'
        >
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={zoomIn} title='Zoom in'>
          +
        </button>
      </div>
      <div className='board-scroll-container'>
        <table id='board' style={{ zoom }}>
          <tbody>
            <tr>{topRow.map((i) => renderCell(i))}</tr>
            {leftCol.map((leftIdx, rowIdx) => (
              <tr key={`mid-${rowIdx}`}>
                {renderCell(leftIdx)}
                {rowIdx === 0 && (
                  <td colSpan='9' rowSpan='9' className='board-center'>
                    <div className='board-center-content'>
                      <div className='board-center-logo'>MONOPOLY</div>
                      <div className='board-center-panels'>
                        <Control />
                        <MoneyBar />
                      </div>
                    </div>
                    <div id='jail'>
                      {players
                        .filter((p, i) => i > 0 && p.jail)
                        .map((p) => (
                          <div
                            key={p.index}
                            className='cell-position'
                            title={p.name}
                            style={{
                              backgroundColor: p.color,
                              display: 'inline-block',
                            }}
                          />
                        ))}
                      <span className='jail-label'>IN JAIL</span>
                    </div>
                  </td>
                )}
                {renderCell(rightCol[rowIdx])}
              </tr>
            ))}
            <tr>{bottomRow.map((i) => renderCell(i))}</tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Board;
