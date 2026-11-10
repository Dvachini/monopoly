import React, { useContext, useState, useEffect, useRef } from 'react';
import GameContext from '../context/GameContext.jsx';
import SocketContext from '../context/SocketContext.jsx';
import Button from './Button.jsx';

function MoneyBar() {
  const { showMoneyBar, players, pcount, turn, setShowStats } =
    useContext(GameContext);
  const { roomCode, myPlayerIndex, connected, renamePlayer, renameError } =
    useContext(SocketContext);

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
          .map((idx) => (
            <li
              key={idx}
              id={`moneybarrow${idx}`}
              className={`mb-1 flex min-h-11 items-center gap-2 rounded-md border-l-4 px-2 py-1 ${idx === turn ? 'border-gold ring-2 ring-gold' : 'border-line'} ${roomCode && idx === myPlayerIndex ? `bg-paper ${idx === turn ? '' : 'ring-2 ring-ink'}` : 'bg-card'}`}
              style={{ borderLeftColor: players[idx] ? players[idx].color : undefined }}
            >
              <span
                className='disc h-6 w-6 text-xs'
                style={{
                  backgroundColor: players[idx] ? players[idx].color : 'gray',
                }}
              >
                <span className='disc-num'>{idx}</span>
              </span>
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
                  className='min-h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-card px-2 text-base text-ink'
                />
              ) : (
                <span
                  id={`p${idx}moneyname`}
                  className='min-w-0 flex-1 truncate font-semibold text-ink'
                >
                  {players[idx] ? players[idx].name : `Player ${idx}`}
                </span>
              )}
              {roomCode && idx === myPlayerIndex && (
                <span className='rounded-full bg-ink px-2 text-xs font-bold text-paper'>
                  You
                </span>
              )}
              {idx === turn && (
                <span className='rounded-full bg-gold px-2 text-xs font-bold text-ink'>
                  Turn
                </span>
              )}
              <span className='font-bold tabular-nums text-ink'>
                $<span id={`p${idx}money`}>
                  {players[idx] ? players[idx].money : 1500}
                </span>
              </span>
            </li>
          ))}
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
