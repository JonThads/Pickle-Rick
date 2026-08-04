import React from 'react';

/**
 * Decorative accents for the Home hero's dark "ledger" panel: a dashed
 * court-line grid plus a few gently drifting shapes (CSS `float-*`
 * keyframes in theme.css), calibrated for the deep-green background.
 * Purely decorative, so it's all aria-hidden.
 */
export default function FloatingShapes() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 900 520" preserveAspectRatio="none">
        <line x1="0" y1="70" x2="900" y2="70" stroke="var(--color-bg)" strokeWidth="2" strokeDasharray="10 12" opacity="0.07" />
        <line x1="0" y1="450" x2="900" y2="450" stroke="var(--color-bg)" strokeWidth="2" strokeDasharray="10 12" opacity="0.07" />
        <line x1="560" y1="0" x2="560" y2="520" stroke="var(--color-bg)" strokeWidth="2" strokeDasharray="10 12" opacity="0.07" />
      </svg>

      <div className="float-c" style={{ position: 'absolute', top: 60, right: 120, width: 70, height: 70, background: 'var(--color-brine)', opacity: 0.25, borderRadius: 14 }} />

      <div
        className="float-a"
        style={{
          position: 'absolute',
          bottom: 40,
          right: 280,
          width: 0,
          height: 0,
          borderLeft: '26px solid transparent',
          borderRight: '26px solid transparent',
          borderBottom: '44px solid var(--color-wax-seal)',
          opacity: 0.3,
        }}
      />

      <div className="float-b" style={{ position: 'absolute', top: 180, right: 60, width: 40, height: 40, borderRadius: 999, background: 'var(--color-bg)', opacity: 0.15 }} />

      <svg className="float-b" style={{ position: 'absolute', top: 120, left: '44%', width: 34, height: 34, opacity: 0.5 }} viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="26" fill="var(--color-brine)" stroke="var(--color-bg)" strokeWidth="2" />
        <circle cx="21" cy="20" r="2.2" fill="var(--color-court-green-deep)" />
        <circle cx="38" cy="18" r="2.2" fill="var(--color-court-green-deep)" />
        <circle cx="42" cy="34" r="2.2" fill="var(--color-court-green-deep)" />
        <circle cx="28" cy="42" r="2.2" fill="var(--color-court-green-deep)" />
        <circle cx="17" cy="36" r="2.2" fill="var(--color-court-green-deep)" />
      </svg>
    </div>
  );
}
