import React from 'react';

/**
 * Companion mark to PickleFigure - a taller, lankier abstract line figure in
 * a serving motion (ball tossed up, arm drawn back). Same rule applies: pure
 * geometric shapes in the site's own palette, no likeness of any
 * copyrighted character.
 */
export default function MortyFigure({ width = 220, height = 320, className }) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 220 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* floating geometric accents */}
      <circle cx="182" cy="52" r="14" stroke="var(--color-court-green)" strokeWidth="2" opacity="0.4" />
      <rect
        x="24"
        y="150"
        width="26"
        height="26"
        rx="6"
        transform="rotate(20 37 163)"
        stroke="var(--color-brine)"
        strokeWidth="2"
        opacity="0.5"
      />

      {/* tossed ball, mid-air above the raised hand */}
      <circle cx="150" cy="46" r="9" fill="var(--color-brine)" opacity="0.7" />

      {/* legs, lunging into the serve */}
      <path d="M96 234 L78 300" stroke="var(--color-court-green)" strokeWidth="9" strokeLinecap="round" />
      <path d="M118 234 L150 296" stroke="var(--color-court-green)" strokeWidth="9" strokeLinecap="round" />

      {/* lanky torso, taller/thinner than PickleFigure's rounded jar body */}
      <rect x="88" y="120" width="44" height="118" rx="20" fill="var(--color-court-green)" opacity="0.14" />
      <rect x="88" y="120" width="44" height="118" rx="20" stroke="var(--color-court-green)" strokeWidth="3" />

      {/* raised serving arm, reaching for the ball */}
      <path d="M126 138 L150 68" stroke="var(--color-court-green)" strokeWidth="8" strokeLinecap="round" />
      {/* drawn-back paddle arm */}
      <path d="M94 150 L58 172" stroke="var(--color-court-green)" strokeWidth="8" strokeLinecap="round" />

      <g transform="translate(48 190) rotate(-24)">
        <rect x="-16" y="-24" width="32" height="42" rx="14" fill="none" stroke="var(--color-brine)" strokeWidth="4" />
        <line x1="0" y1="18" x2="0" y2="38" stroke="var(--color-brine)" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* small oval head, kept intentionally featureless */}
      <ellipse cx="110" cy="96" rx="20" ry="24" fill="var(--color-court-green)" opacity="0.22" />
      <ellipse cx="110" cy="96" rx="20" ry="24" stroke="var(--color-court-green)" strokeWidth="3" />
    </svg>
  );
}
