import React from 'react';

/**
 * Corner watermark: a dimpled-pickleball circle, low-opacity, tucked in a
 * card's bottom-right corner. The parent needs `position: relative;
 * overflow: hidden` (see `.motif-card` in theme.css).
 */
export default function PickleballWatermark({ size = 70, opacity = 0.14 }) {
  return (
    <svg
      style={{ position: 'absolute', bottom: -size * 0.23, right: -size * 0.2, width: size, height: size, pointerEvents: 'none', opacity }}
      viewBox="0 0 60 60"
      aria-hidden="true"
    >
      <circle cx="30" cy="30" r="26" fill="var(--color-brine)" />
      <circle cx="21" cy="20" r="2.2" fill="var(--color-ink)" />
      <circle cx="38" cy="18" r="2.2" fill="var(--color-ink)" />
      <circle cx="42" cy="34" r="2.2" fill="var(--color-ink)" />
      <circle cx="28" cy="42" r="2.2" fill="var(--color-ink)" />
      <circle cx="17" cy="36" r="2.2" fill="var(--color-ink)" />
    </svg>
  );
}
