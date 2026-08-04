import React from 'react';

/**
 * Full-card background watermark: 1-2 faint dashed lines echoing a court's
 * service/baseline markings. Purely decorative, so it's absolutely
 * positioned behind the card content and aria-hidden - the parent needs
 * `position: relative; overflow: hidden` (see `.motif-card` in theme.css).
 */
export default function CourtLinePattern({ lines = 'horizontal' }) {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 400 140"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="0" y1="24" x2="400" y2="24" stroke="var(--color-court-green)" strokeWidth="2" strokeDasharray="6 8" opacity="0.06" />
      {lines === 'both' && (
        <line x1="320" y1="0" x2="320" y2="140" stroke="var(--color-court-green)" strokeWidth="2" strokeDasharray="6 8" opacity="0.06" />
      )}
    </svg>
  );
}
