import React from 'react';

// kind = go | jail | parking | gotojail | chance | chest | tax | electric | water | rail
const P = {
  stroke: '#1c1917',
  strokeWidth: 2,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
};

const ICONS = {
  // arrow points left = direction of travel on the bottom row
  go: (
    <>
      <path
        d='M20 12H5m0 0 6-6M5 12l6 6'
        fill='none'
        stroke='#1c1917'
        strokeWidth='5.6'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M20 12H5m0 0 6-6M5 12l6 6'
        fill='none'
        stroke='#b91c1c'
        strokeWidth='2.6'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </>
  ),
  jail: (
    <>
      <rect x='4' y='4' width='16' height='16' rx='2' fill='#e7e5e4' {...P} />
      <path d='M8.7 4v16M12 4v16M15.3 4v16' fill='none' {...P} />
    </>
  ),
  parking: (
    <>
      <rect x='4' y='3' width='16' height='18' rx='3' fill='#1d4ed8' {...P} />
      <path
        d='M9.5 17V7.5h3.2a2.7 2.7 0 0 1 0 5.4H9.5'
        fill='none'
        stroke='#fff'
        strokeWidth='2.2'
        strokeLinecap='round'
      />
    </>
  ),
  // siren
  gotojail: (
    <>
      <path d='M7 17v-4a5 5 0 0 1 10 0v4z' fill='#ef4444' {...P} />
      <rect x='5' y='17' width='14' height='4' rx='1' fill='#57534e' {...P} />
      <path d='M12 2v2M4.5 5.5 6 7M19.5 5.5 18 7' fill='none' {...P} />
    </>
  ),
  chance: (
    <>
      <rect x='4' y='3' width='16' height='18' rx='3' fill='#0d9488' {...P} />
      <path
        d='M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.1 1-1.1 2M12 16.2v.6'
        fill='none'
        stroke='#fff'
        strokeWidth='2.2'
        strokeLinecap='round'
      />
    </>
  ),
  chest: (
    <>
      <path d='M3 12a9 6 0 0 1 18 0v8H3z' fill='#7c3aed' {...P} />
      <path d='M3 12h18' fill='none' {...P} />
      <rect x='10.2' y='10.6' width='3.6' height='5' rx='1' fill='#e8b931' {...P} />
    </>
  ),
  // banknote
  tax: (
    <>
      <rect x='2.5' y='6' width='19' height='12' rx='2' fill='#86efac' {...P} />
      <circle cx='12' cy='12' r='2.8' fill='#fff' {...P} />
      <path d='M6 9.5v.1M18 14.5v.1' fill='none' {...P} />
    </>
  ),
  electric: <path d='M13 2 5 13.5h5.5L9.5 22 19 9.5h-5.8z' fill='#fde047' {...P} />,
  water: (
    <path
      d='M12 2.5C9 7 5.5 10.2 5.5 14a6.5 6.5 0 0 0 13 0C18.5 10.2 15 7 12 2.5z'
      fill='#38bdf8'
      {...P}
    />
  ),
  rail: (
    <>
      <rect x='5' y='3' width='14' height='14' rx='3' fill='#57534e' {...P} />
      <rect x='7.5' y='6' width='9' height='5' rx='1' fill='#fff' stroke='none' />
      <path d='M9 14h.01M15 14h.01M7 21l2-4M17 21l-2-4' fill='none' {...P} />
    </>
  ),
};

function SquareIcon({ kind, size = 20 }) {
  return (
    <svg
      viewBox='0 0 24 24'
      width={size}
      height={size}
      aria-hidden='true'
      focusable='false'
    >
      {ICONS[kind]}
    </svg>
  );
}

export default SquareIcon;
