import React, { useEffect, useRef, useState } from 'react';

// Cash amount with a short tint and signed chip when the value changes
function Cash({ value, id }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(null); // { dir: 'up' | 'down', amount }

  useEffect(() => {
    if (value === prev.current) return undefined;
    setFlash({
      dir: value > prev.current ? 'up' : 'down',
      amount: Math.abs(value - prev.current),
    });
    prev.current = value;
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span className={`cash ${flash ? `cash-${flash.dir}` : ''}`}>
      $<span id={id}>{value}</span>
      {flash && (
        <span className='cash-delta' aria-hidden='true'>
          {flash.dir === 'up' ? '+' : '-'}${flash.amount}
        </span>
      )}
    </span>
  );
}

export default Cash;
