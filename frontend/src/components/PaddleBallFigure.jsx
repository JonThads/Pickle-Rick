import React from 'react';

/**
 * Abstract paddle-and-pickleball illustration - a rounded elongated paddle
 * with a gripped handle, leaning next to a dimpled pickleball. Replaces
 * PickleFigure/MortyFigure on the Home hero and Login illustration panel.
 * No human likeness or character features, per the design handoff.
 *
 * `variant="leaning"` (default) is the Home hero composition: paddle tipped
 * on its side with the ball floating beside it. `variant="standing"` is the
 * Login panel composition: paddle upright with the ball resting next to it.
 */
export default function PaddleBallFigure({ variant = 'leaning', width, height, className }) {
  if (variant === 'standing') {
    const w = width ?? 130;
    const h = height ?? 190;
    return (
      <svg className={className} width={w} height={h} viewBox="0 0 100 180" aria-hidden="true">
        <rect x="6" y="0" width="88" height="108" rx="42" fill="var(--color-court-green-deep)" />
        <rect x="12" y="6" width="76" height="96" rx="38" fill="var(--color-court-green)" />
        <rect x="37" y="102" width="26" height="58" rx="10" fill="var(--color-ink)" />
        <rect x="37" y="112" width="26" height="4" fill="var(--color-ink-muted)" opacity="0.5" />
        <rect x="37" y="122" width="26" height="4" fill="var(--color-ink-muted)" opacity="0.5" />
        <rect x="37" y="132" width="26" height="4" fill="var(--color-ink-muted)" opacity="0.5" />
        <circle cx="80" cy="128" r="21" fill="var(--color-brine)" stroke="var(--color-ink)" strokeWidth="2" />
        <circle cx="70" cy="118" r="2.2" fill="var(--color-ink)" />
        <circle cx="82" cy="112" r="2.2" fill="var(--color-ink)" />
        <circle cx="92" cy="124" r="2.2" fill="var(--color-ink)" />
        <circle cx="90" cy="138" r="2.2" fill="var(--color-ink)" />
        <circle cx="76" cy="142" r="2.2" fill="var(--color-ink)" />
        <circle cx="66" cy="132" r="2.2" fill="var(--color-ink)" />
      </svg>
    );
  }

  const w = width ?? 230;
  const h = height ?? 300;
  return (
    <svg className={className} width={w} height={h} viewBox="0 0 180 240" aria-hidden="true">
      <ellipse cx="90" cy="225" rx="70" ry="10" fill="#000000" opacity="0.15" />
      <rect x="18" y="4" width="106" height="132" rx="50" fill="var(--color-court-green-deep)" transform="rotate(-8 71 70)" />
      <rect x="26" y="12" width="90" height="116" rx="44" fill="var(--color-brine)" transform="rotate(-8 71 70)" />
      <rect x="52" y="118" width="30" height="66" rx="12" fill="var(--color-court-green-deep)" transform="rotate(-8 67 150)" />
      <rect x="56" y="130" width="24" height="4" fill="#c7d6bc" opacity="0.5" transform="rotate(-8 68 132)" />
      <rect x="56" y="140" width="24" height="4" fill="#c7d6bc" opacity="0.5" transform="rotate(-8 68 142)" />
      <rect x="56" y="150" width="24" height="4" fill="#c7d6bc" opacity="0.5" transform="rotate(-8 68 152)" />
      <circle cx="140" cy="150" r="34" fill="var(--color-bg)" stroke="var(--color-court-green-deep)" strokeWidth="3" />
      <circle cx="128" cy="136" r="3" fill="var(--color-court-green-deep)" />
      <circle cx="150" cy="132" r="3" fill="var(--color-court-green-deep)" />
      <circle cx="158" cy="150" r="3" fill="var(--color-court-green-deep)" />
      <circle cx="150" cy="166" r="3" fill="var(--color-court-green-deep)" />
      <circle cx="128" cy="164" r="3" fill="var(--color-court-green-deep)" />
      <circle cx="140" cy="150" r="3" fill="var(--color-court-green-deep)" />
    </svg>
  );
}
