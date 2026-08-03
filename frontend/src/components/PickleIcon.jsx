import React from 'react';

/**
 * Compact mark for the NavBar wordmark - the same bumpy pickle silhouette
 * as PickleFigure, without limbs/paddle, sized down to sit next to text.
 */
export default function PickleIcon({ size = 26, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M24 4
           C13 4 6 11 7 21
           C3 27 3 33 7 39
           C11 45 37 45 41 39
           C45 33 45 27 41 21
           C42 11 35 4 24 4 Z"
        fill="var(--color-court-green)"
      />
      <circle cx="17" cy="16" r="2" fill="var(--color-bg)" opacity="0.8" />
      <circle cx="31" cy="19" r="2" fill="var(--color-bg)" opacity="0.8" />
      <circle cx="16" cy="28" r="2" fill="var(--color-bg)" opacity="0.8" />
      <circle cx="32" cy="31" r="2" fill="var(--color-bg)" opacity="0.8" />
    </svg>
  );
}
