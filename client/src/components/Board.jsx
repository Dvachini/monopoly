import React, { useContext, useEffect, useState } from 'react';
import GameContext from '../context/GameContext.jsx';
import SocketContext from '../context/SocketContext.jsx';
import Control from './Control.jsx';
import MoneyBar from './MoneyBar.jsx';
import Button from './Button.jsx';
import SquareIcon from './SquareIcon.jsx';
import Pawn from './Pawn.jsx';

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

// Owner colour name -> hex, to pick a readable digit ink for the ownership ribbon
const OWNER_HEX = {
  yellow: '#ffff00',
  blue: '#0000ff',
  red: '#ff0000',
  lime: '#00ff00',
  green: '#008000',
  aqua: '#00ffff',
  orange: '#ffa500',
  purple: '#800080',
  fuchsia: '#ff00ff',
  maroon: '#800000',
  navy: '#000080',
  olive: '#808000',
  silver: '#c0c0c0',
  teal: '#008080',
};

// true when the ink digit has more contrast than white on this owner colour
function prefersInk(color) {
  const hex = OWNER_HEX[String(color).toLowerCase()];
  if (!hex) return false;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179;
}

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

// Squares that show an icon (see SquareIcon.jsx)
const SQUARE_KINDS = {
  0: 'go',
  2: 'chest',
  4: 'tax',
  5: 'rail',
  7: 'chance',
  10: 'jail',
  12: 'electric',
  15: 'rail',
  17: 'chest',
  20: 'parking',
  22: 'chance',
  25: 'rail',
  28: 'water',
  30: 'gotojail',
  33: 'chest',
  35: 'rail',
  36: 'chance',
  38: 'tax',
};

// Corner squares: title (\n = line break) and the rule line under it
const CORNERS = {
  0: { title: 'GO', sub: 'Collect $200', tint: 'cell-go' },
  10: { title: 'JAIL', sub: 'Just visiting', tint: 'cell-jail' },
  20: { title: 'FREE\nPARKING', sub: '', tint: 'cell-park' },
  30: { title: 'GO TO\nJAIL', sub: 'Go directly to jail', tint: 'cell-go' },
};

function Board() {
  const {
    showBoard,
    squares,
    players,
    turn,
    setDeedIndex,
    die1,
    die2,
    alerts,
  } = useContext(GameContext);
  const { roomCode, myPlayerIndex } = useContext(SocketContext);
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

  // The roller is not stored: read it from the "X rolled N." log line.
  // Its index also keys the dice so they re-animate once per roll.
  let rollIdx = -1;
  alerts.forEach((a, i) => {
    if (/^(.+?) rolled (\d+)( - doubles)?\.$/.test(a)) rollIdx = i;
  });
  const rolled =
    rollIdx >= 0
      ? alerts[rollIdx].match(/^(.+?) rolled (\d+)( - doubles)?\.$/)
      : null;

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
    const there = players.filter(
      (p, i) => i > 0 && p.position === cellIndex && !p.jail,
    );
    // Show 3 pawns and a +N chip past 4
    const crowded = there.length > 4;
    const shown = crowded ? there.slice(0, 3) : there;
    return [
      ...shown.map((p) => (
        <Pawn
          key={p.index}
          color={p.color}
          n={p.index}
          className={`pawn-board${p.index === turn ? ' is-turn' : ''}`}
        />
      )),
      crowded && (
        <div
          key='more'
          className='cell-position-more'
          title={there
            .slice(3)
            .map((p) => p.name)
            .join(', ')}
        >
          +{there.length - 3}
        </div>
      ),
    ];
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
    const jailed =
      index === 10 ? players.filter((p, i) => i > 0 && p.jail) : [];
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
        }${
          jailed.length > 0
            ? `, in jail: ${jailed.map((p) => p.name).join(', ')}`
            : ''
        }`;

    return (
      <div
        key={index}
        className={`${getCellClass(index)}${hasStrip ? ' has-strip' : ''}${
          CORNERS[index] ? ` ${CORNERS[index].tint}` : ''
        }${owner ? ' has-owner' : ''}${
          here.length + jailed.length > 0 ? ' occupied' : ''
        }${jailed.length > 0 ? ' has-jailed' : ''}${
          players[turn] &&
          players[turn].position === index &&
          !players[turn].jail
            ? ' is-current'
            : ''
        }`}
        id={`cell${index}`}
        style={{
          gridColumn: col,
          gridRow: row,
          '--o': owner ? owner.color : undefined,
        }}
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
          {CORNERS[index] ? (
            <span className='corner'>
              <SquareIcon kind={SQUARE_KINDS[index]} size={null} />
              <b className='corner-title'>{CORNERS[index].title}</b>
              {CORNERS[index].sub && (
                <span className='corner-sub'>{CORNERS[index].sub}</span>
              )}
            </span>
          ) : (
            <>
              {SQUARE_KINDS[index] && (
                <span className='cell-icon'>
                  <SquareIcon kind={SQUARE_KINDS[index]} size={null} />
                </span>
              )}
              {(!SQUARE_KINDS[index] || SQUARE_KINDS[index] === 'rail') && (
                <span className='short'>
                  {SQUARE_KINDS[index] ? 'RR' : shortName}
                </span>
              )}
              <span className='full'>
                {/* soft hyphens: safety net where the browser has no hyphenation dictionary */}
                {name
                  .replace('Mediterranean', 'Medi\u00ADter\u00ADra\u00ADnean')
                  .replace('Pennsylvania', 'Penn\u00ADsyl\u00ADva\u00ADnia')
                  .replace('Connecticut', 'Con\u00ADnect\u00ADi\u00ADcut')}
              </span>
              {(isProperty || index === 4 || index === 38) && (
                <span className='cell-price'>{sq.pricetext}</span>
              )}
            </>
          )}
        </div>
        {owner && (
          <span
            className='cell-flag'
            role='img'
            aria-label={`owned by ${owner.name}`}
            title={`Owned by ${owner.name}`}
            style={{
              '--num': prefersInk(owner.color) ? '#1c1917' : '#fff',
              '--halo': prefersInk(owner.color) ? '#fff' : '#1c1917',
            }}
          >
            <span className='disc-num'>{owner.index}</span>
          </span>
        )}
        <div className='cell-position-holder'>{getPlayerPositions(index)}</div>
        {jailed.length > 0 && (
          <div className='jailed'>
            {jailed.slice(0, 4).map((p) => (
              <Pawn
                key={p.index}
                color={p.color}
                n={p.index}
                className='pawn-board'
              />
            ))}
            {jailed.length > 4 && (
              <span className='cell-position-more'>+{jailed.length - 4}</span>
            )}
          </div>
        )}
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
                <div className='plate plate-sm'>Monopoly</div>
                <div className='centre-dice' aria-hidden={die1 === 0}>
                  <div
                    key={`a${rollIdx}`}
                    className={`die die-${die1 || 1} ${die1 ? 'die-roll' : 'die-idle'}`}
                    role='img'
                    aria-label={`Die ${die1}`}
                  />
                  <div
                    key={`b${rollIdx}`}
                    className={`die die-${die2 || 1} ${die2 ? 'die-roll' : 'die-idle'}`}
                    role='img'
                    aria-label={`Die ${die2}`}
                  />
                </div>
                {rolled && (
                  <p className='centre-cap'>
                    {rolled[1]} rolled {parseInt(rolled[2]) || 0}
                    {rolled[3] ? ' · Doubles!' : ''}
                  </p>
                )}
                {players[turn] && (
                  <div key={turn} className='turn-banner'>
                    <Pawn
                      color={players[turn].color}
                      n={players[turn].index}
                      size={28}
                    />
                    <span className='name'>{players[turn].name}&apos;s turn</span>
                    {roomCode && turn === myPlayerIndex && (
                      <span className='pill pill-turn'>You</span>
                    )}
                  </div>
                )}
                {alerts.length > 0 && (
                  <p className='event-line'>{alerts[alerts.length - 1]}</p>
                )}
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
