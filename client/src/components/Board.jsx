import React, { useContext, useEffect, useState } from 'react';
import GameContext from '../context/GameContext.jsx';
import Control from './Control.jsx';
import MoneyBar from './MoneyBar.jsx';
import Button from './Button.jsx';

// groupNumber -> group name (matches data/classicedition.jsx)
const GROUP_NAMES = [
  '',
  'Railroad',
  'Utility',
  'Brown',
  'Light blue',
  'Pink',
  'Orange',
  'Red',
  'Yellow',
  'Green',
  'Dark blue',
];

// Short labels for small boards (UI only, classic edition). \n = line break
const SHORT_NAMES = {
  0: 'GO',
  1: 'Med.',
  3: 'Balt.',
  5: 'Read.\nRR',
  6: 'Orien.',
  8: 'Verm.',
  9: 'Conn.',
  10: 'JAIL',
  11: 'St.C.',
  13: 'State',
  14: 'Virg.',
  15: 'Penn.\nRR',
  16: 'St.J.',
  18: 'Tenn.',
  19: 'N.Y.',
  20: 'FREE\nPARK.',
  21: 'Kent.',
  23: 'Indi.',
  24: 'Illi.',
  25: 'B&O\nRR',
  26: 'Atl.',
  27: 'Vent.',
  29: 'Marv.',
  30: 'GO TO\nJAIL',
  31: 'Paci.',
  32: 'N.C.',
  34: 'Penn.\nAve',
  35: 'Short\nRR',
  37: 'Park',
  39: 'Board',
};

// Squares that show an existing icon instead of short text
const SQUARE_ICONS = {
  2: 'community_chest_icon',
  4: 'tax_icon',
  7: 'chance_icon',
  12: 'electric_icon',
  17: 'community_chest_icon',
  22: 'chance_icon',
  28: 'water_icon',
  33: 'community_chest_icon',
  36: 'chance_icon',
  38: 'tax_icon',
};

function Board() {
  const { showBoard, squares, players, turn, setDeedIndex } =
    useContext(GameContext);
  const [zoom, setZoom] = useState(1);

  // Desktop may zoom out to 0.6; phones may not. Clamp when the viewport changes.
  useEffect(() => {
    const onResize = () => {
      if (!window.matchMedia('(min-width: 1024px)').matches) {
        setZoom((z) => Math.max(z, 1));
      }
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!showBoard) return null;

  const topRow = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
  const bottomRow = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  const leftCol = [19, 18, 17, 16, 15, 14, 13, 12, 11];
  const rightCol = [31, 32, 33, 34, 35, 36, 37, 38, 39];

  const getCellClass = (index) => {
    if ([0, 10, 20, 30].includes(index)) return 'cell cell-corner';
    if (index > 20 && index < 30) return 'cell cell-top';
    if (index > 0 && index < 10) return 'cell cell-bottom';
    if (index > 10 && index < 20) return 'cell cell-left';
    if (index > 30 && index < 40) return 'cell cell-right';
    return 'cell';
  };

  const getPlayerPositions = (cellIndex) => {
    return players
      .filter((p, i) => i > 0 && p.position === cellIndex && !p.jail)
      .map((p) => (
        <div
          key={p.index}
          className='cell-position disc'
          title={p.name}
          style={{ backgroundColor: p.color }}
        >
          <span className='disc-num'>{p.index}</span>
        </div>
      ));
  };

  const renderCell = (index, col, row) => {
    const sq = squares[index];
    const name = sq ? sq.name : '';
    const isProperty = sq && sq.groupNumber > 0;
    const hasStrip = sq && sq.groupNumber >= 3;
    const owner = isProperty && sq.owner > 0 ? players[sq.owner] : null;
    const here = players.filter(
      (p, i) => i > 0 && p.position === index && !p.jail,
    );
    const shortName = SHORT_NAMES[index] || `${name.slice(0, 5)}.`;
    const label = isProperty
      ? `${name}, ${GROUP_NAMES[sq.groupNumber] || 'property'}, $${sq.price}, ${
          owner ? `owned by ${owner.name}` : 'unowned'
        }${sq.mortgage ? ', mortgaged' : ''}${
          sq.house > 0 && sq.house < 5
            ? `, ${sq.house} ${sq.house === 1 ? 'house' : 'houses'}`
            : ''
        }${sq.house === 5 ? ', hotel' : ''}${
          here.length > 0
            ? `, players here: ${here.map((p) => p.name).join(', ')}`
            : ''
        }`
      : `${name}${
          here.length > 0
            ? `, players here: ${here.map((p) => p.name).join(', ')}`
            : ''
        }`;

    return (
      <div
        key={index}
        className={`${getCellClass(index)}${hasStrip ? ' has-strip' : ''}`}
        id={`cell${index}`}
        style={{ gridColumn: col, gridRow: row }}
        role={isProperty ? 'button' : 'img'}
        tabIndex={isProperty ? 0 : undefined}
        aria-label={label}
        onClick={isProperty ? () => setDeedIndex(index) : undefined}
        onKeyDown={
          isProperty
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setDeedIndex(index);
                }
              }
            : undefined
        }
        onMouseEnter={
          isProperty ? () => setDeedIndex(index) : undefined
        }
        onMouseLeave={() => {
          if (window.matchMedia('(hover: hover)').matches) setDeedIndex(-1);
        }}
      >
        {hasStrip && (
          <div className='cell-strip' style={{ backgroundColor: sq.color }}>
            {sq.house > 0 &&
              sq.house < 5 &&
              Array.from({ length: sq.house }, (_, h) => (
                <span key={h} className='house-pip' />
              ))}
            {sq.house === 5 && <span className='hotel-pip' />}
          </div>
        )}
        {sq && sq.mortgage > 0 && (
          <>
            <div className='cell-mortgaged' />
            <span className='cell-mflag'>M</span>
          </>
        )}
        <div className='cell-name' aria-hidden='true'>
          <span className='short'>
            {SQUARE_ICONS[index] ? (
              <img src={`/images/${SQUARE_ICONS[index]}.png`} alt='' />
            ) : (
              shortName
            )}
          </span>
          <span className='full'>
            {/* soft hyphens: safety net where the browser has no hyphenation dictionary */}
            {name
              .replace('Mediterranean', 'Medi\u00ADter\u00ADra\u00ADnean')
              .replace('Pennsylvania', 'Penn\u00ADsyl\u00ADva\u00ADnia')
              .replace('Connecticut', 'Con\u00ADnect\u00ADi\u00ADcut')}
          </span>
        </div>
        {owner && (
          <>
            <div
              className='cell-owner'
              style={{ backgroundColor: owner.color }}
            />
            <span
              className='cell-owner-badge disc'
              style={{ backgroundColor: owner.color }}
            >
              <span className='disc-num'>{owner.index}</span>
            </span>
          </>
        )}
        <div className='cell-position-holder'>{getPlayerPositions(index)}</div>
      </div>
    );
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.5));
  const zoomOut = () =>
    setZoom((z) =>
      Math.max(
        z - 0.15,
        window.matchMedia('(min-width: 1024px)').matches ? 0.6 : 1,
      ),
    );
  const resetZoom = () => setZoom(1);

  return (
    <div className='game-layout'>
      <div className='board-stage'>
        <a
          href='#game-panel'
          className='sr-only focus:not-sr-only focus:mb-2 focus:inline-block focus:rounded-md focus:bg-paper focus:px-3 focus:py-2 focus:text-ink'
        >
          Skip board
        </a>
        <div className='board-zoom-controls'>
          <Button size='sm' aria-label='Zoom out' onClick={zoomOut}>
            −
          </Button>
          <Button size='sm' aria-label='Reset zoom' onClick={resetZoom}>
            {Math.round(zoom * 100)}%
          </Button>
          <Button size='sm' aria-label='Zoom in' onClick={zoomIn}>
            +
          </Button>
        </div>
        <div className='board-scroll'>
          <div className='board-sizer' style={{ '--zoom': zoom }}>
            <div className='board' role='group' aria-label='Game board'>
              {topRow.map((i, c) => renderCell(i, c + 1, 1))}
              {rightCol.map((i, r) => renderCell(i, 11, r + 2))}
              {bottomRow.map((i, c) => renderCell(i, c + 1, 11))}
              {leftCol.map((i, r) => renderCell(i, 1, r + 2))}
              <div className='board-center'>
                <div className='board-center-logo'>Monopoly</div>
                {players[turn] && (
                  <div className='turn-chip'>
                    <span
                      className='disc h-5 w-5 text-xs'
                      style={{ backgroundColor: players[turn].color }}
                    >
                      <span className='disc-num'>{players[turn].index}</span>
                    </span>
                    <span className='name'>{players[turn].name}&apos;s turn</span>
                  </div>
                )}
                <div id='jail'>
                  {players
                    .filter((p, i) => i > 0 && p.jail)
                    .map((p) => (
                      <div
                        key={p.index}
                        className='cell-position disc'
                        title={p.name}
                        style={{ backgroundColor: p.color }}
                      >
                        <span className='disc-num'>{p.index}</span>
                      </div>
                    ))}
                  <span className='jail-label'>IN JAIL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id='game-panel' tabIndex={-1} className='side-panel'>
        <Control />
        <MoneyBar />
      </div>
    </div>
  );
}

export default Board;
