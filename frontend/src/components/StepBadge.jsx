import React from 'react';

/**
 * Ball-badge step number: a small brine-colored circle with three tiny
 * dimple dots and a mono-font number, replacing plain "Step 0X" labels on
 * the Home "how it works" cards.
 */
export default function StepBadge({ number }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        background: 'var(--color-brine)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: '0.8rem',
        color: 'var(--color-ink)',
      }}
    >
      <span style={{ position: 'absolute', top: 4, left: 9, width: 3, height: 3, borderRadius: 999, background: 'var(--color-ink)', opacity: 0.4 }} />
      <span style={{ position: 'absolute', top: 10, right: 5, width: 3, height: 3, borderRadius: 999, background: 'var(--color-ink)', opacity: 0.4 }} />
      <span style={{ position: 'absolute', bottom: 5, left: 7, width: 3, height: 3, borderRadius: 999, background: 'var(--color-ink)', opacity: 0.4 }} />
      {String(number).padStart(2, '0')}
    </div>
  );
}
