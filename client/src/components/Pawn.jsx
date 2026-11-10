import React from 'react';

function Pawn({ color, n, size = 28, className = '', ...rest }) {
  return (
    <svg
      viewBox='0 0 24 28'
      width={size * 0.86}
      height={size}
      className={`pawn ${className}`}
      aria-hidden='true'
      focusable='false'
      {...rest}
    >
      <ellipse
        cx='12'
        cy='25.2'
        rx='9.5'
        ry='2.6'
        fill={color}
        stroke='#1c1917'
        strokeWidth='1.5'
      />
      <path
        d='M8.4 16 5.6 24.8Q12 27.2 18.4 24.8L15.6 16Z'
        fill={color}
        stroke='#1c1917'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
      <circle
        cx='12'
        cy='10'
        r='8'
        fill={color}
        stroke='#1c1917'
        strokeWidth='1.6'
      />
      <path
        d='M6.2 7.2a6.2 6.2 0 0 1 4.2-3.2'
        fill='none'
        stroke='#fff'
        strokeOpacity='0.55'
        strokeWidth='1.6'
        strokeLinecap='round'
      />
      <text
        x='12'
        y='13.5'
        textAnchor='middle'
        fontSize='10.5'
        fontWeight='800'
        fill='#fff'
        stroke='#1c1917'
        strokeWidth='2.6'
        paintOrder='stroke'
        strokeLinejoin='round'
        fontFamily='ui-sans-serif, system-ui, sans-serif'
      >
        {n}
      </text>
    </svg>
  );
}

export default Pawn;
