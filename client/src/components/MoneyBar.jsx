import React, { useContext, useState, useEffect, useRef } from 'react';
import GameContext from '../context/GameContext.jsx';
import SocketContext from '../context/SocketContext.jsx';
import Button from './Button.jsx';
import Pawn from './Pawn.jsx';
import Cash from './Cash.jsx';
import { bankruptcyLimit } from '../game/constants.jsx';

function MoneyBar() {
  const {
    showMoneyBar,
    players,
    squares,
    pcount,
    turn,
    setShowStats,
    startingMoney: localStartingMoney,
  } = useContext(GameContext);
  const {
    roomCode,
    myPlayerIndex,
    connected,
    renamePlayer,
    renameError,
    startingMoney: socketStartingMoney,
  } = useContext(SocketContext);
  const startingMoney = roomCode ? socketStartingMoney : localStartingMoney;

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const wasEditing = useRef(false);

  // Close the editor if the room goes away
  useEffect(() => {
    if (!roomCode) setEditing(false);
  }, [roomCode]);

  // Editor closed: give focus back to the button that opened it
  useEffect(() => {
    if (wasEditing.current && !editing) {
      const btn = document.getElementById('editname');
      if (btn) btn.focus();
    }
    wasEditing.current = editing;
  }, [editing]);

  if (!showMoneyBar) return null;

  const startEdit = () => {
    setDraftName(players[myPlayerIndex] ? players[myPlayerIndex].name : '');
    setEditing(true);
  };

  const saveName = () => {
    // Same clean-up the server does: collapse inner spaces, trim
    const name = draftName.trim().replace(/\s+/g, ' ');
    if (!name || !renamePlayer) return;
    if (players[myPlayerIndex] && name === players[myPlayerIndex].name) {
      setEditing(false);
      return;
    }
    renamePlayer(name);
    setEditing(false);
  };

  return (
    <div id='moneybar' className='card select-none p-2 sm:p-3'>
      <ul>
        {Array.from({ length: 8 }, (_, i) => i + 1)
          .filter((idx) => idx <= pcount)
          .map((idx) => {
            const owned = squares
              .filter((sq) => sq && sq.owner === idx && sq.groupNumber > 0)
              .sort((a, b) => a.groupNumber - b.groupNumber);
            return (
            <li
              key={idx}
              id={`moneybarrow${idx}`}
              className={`prow ${idx === turn ? 'prow-turn' : ''} ${roomCode && idx === myPlayerIndex ? 'prow-me' : ''}`}
              style={{ '--o': players[idx] ? players[idx].color : 'gray' }}
            >
              <Pawn
                color={players[idx] ? players[idx].color : 'gray'}
                n={idx}
                size={34}
              />
              <div className='prow-main'>
                <div className='prow-top'>
                  {roomCode && idx === myPlayerIndex && editing ? (
                    <input
                      type='text'
                      aria-label='Your name'
                      autoFocus
                      maxLength={20}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName();
                        if (e.key === 'Escape') setEditing(false);
                      }}
                      className='field min-w-0 flex-1'
                    />
                  ) : (
                    <span id={`p${idx}moneyname`}>
                      {players[idx] ? players[idx].name : `Player ${idx}`}
                    </span>
                  )}
                  {roomCode && idx === myPlayerIndex && (
                    <span className='pill pill-you'>You</span>
                  )}
                  {idx === turn && <span className='pill pill-turn'>Turn</span>}
                  <Cash
                    id={`p${idx}money`}
                    value={players[idx] ? players[idx].money : startingMoney}
                  />
                </div>
                <div className='prow-sub'>
                  <span
                    className='deeds'
                    role='img'
                    aria-label={`${owned.length} properties${owned.length > 0 ? `: ${owned.map((sq) => sq.name).join(', ')}` : ''}`}
                  >
                    {owned.map((sq) => (
                      <i
                        key={sq.index}
                        className={`deed-mini ${sq.groupNumber === 1 ? 'deed-rail' : sq.groupNumber === 2 ? 'deed-util' : ''} ${sq.mortgage ? 'deed-mort' : ''}`}
                        style={{ backgroundColor: sq.color }}
                      />
                    ))}
                  </span>
                  <span>
                    {owned.length} {owned.length === 1 ? 'property' : 'properties'}
                  </span>
                  {players[idx] &&
                    players[idx].money < 0 &&
                    players[idx].position >= 0 &&
                    (!roomCode || idx === myPlayerIndex) && (
                      <span className='prow-debt'>
                        In debt. Bankrupt below -${-bankruptcyLimit(startingMoney)}
                      </span>
                    )}
                </div>
              </div>
            </li>
            );
          })}
      </ul>
      {roomCode && editing && (
        <div className='mb-1 flex gap-2'>
          <Button size='sm' full className='lg:min-h-11!' onClick={saveName}>
            Save name
          </Button>
          <Button
            size='sm'
            full
            className='lg:min-h-11!'
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
      )}
      <div role='status' aria-live='polite' className='text-sm text-danger'>
        {roomCode && renameError ? renameError : ''}
      </div>
      {roomCode && !editing && renamePlayer && (
        <Button
          id='editname'
          size='sm'
          full
          className='mt-1 lg:min-h-11!'
          title='Change the name other players see.'
          disabled={!connected || !players[myPlayerIndex]}
          onClick={startEdit}
        >
          Edit name
        </Button>
      )}
      <Button
        id='viewstats'
        size='sm'
        full
        className='mt-1'
        title="View a pop-up window that shows a list of each player's properties."
        onClick={() => setShowStats(true)}
      >
        View stats
      </Button>
    </div>
  );
}

export default MoneyBar;
