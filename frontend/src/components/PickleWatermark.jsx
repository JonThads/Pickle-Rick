import React from 'react';

/**
 * Corner watermark: an elongated "pickle" (rounded rect + warty dimple
 * ellipses), rotated and low-opacity, tucked in a card's corner. The parent
 * needs `position: relative; overflow: hidden` (see `.motif-card` in
 * theme.css).
 */
export default function PickleWatermark({ size = 60, rotation = 14, opacity = 0.12, corner = 'top-right' }) {
  const height = size * 1.67;
  const cornerStyle =
    corner === 'top-right'
      ? { top: -size * 0.5, right: -size * 0.33 }
      : { bottom: -size * 0.27, right: -size * 0.23 };

  return (
    <svg
      style={{
        position: 'absolute',
        width: size,
        height,
        pointerEvents: 'none',
        opacity,
        transform: `rotate(${rotation}deg)`,
        ...cornerStyle,
      }}
      viewBox="0 0 60 100"
      aria-hidden="true"
    >
      <rect x="10" y="6" width="40" height="88" rx="20" fill="var(--color-court-green)" />
      <ellipse cx="20" cy="24" rx="3" ry="2" fill="var(--color-court-green-deep)" opacity="0.5" />
      <ellipse cx="38" cy="34" rx="3" ry="2" fill="var(--color-court-green-deep)" opacity="0.5" />
      <ellipse cx="22" cy="48" rx="3" ry="2" fill="var(--color-court-green-deep)" opacity="0.5" />
      <ellipse cx="36" cy="60" rx="3" ry="2" fill="var(--color-court-green-deep)" opacity="0.5" />
      <ellipse cx="24" cy="72" rx="3" ry="2" fill="var(--color-court-green-deep)" opacity="0.5" />
    </svg>
  );
}
