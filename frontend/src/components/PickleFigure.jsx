import React from 'react';

/**
 * Original, abstract geometric mark. Reads as "a pickle" through shape
 * alone - a bumpy, tapered pickle-jar body with small proportionally-tiny
 * stick limbs (the exaggerated tiny-arms silhouette pickleball fans of the
 * show will recognize) - not through any likeness, face, or color scheme
 * copied from the show. No face is drawn at all, on purpose.
 */
export default function PickleFigure({ width = 220, height = 320, className }) {
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
      <circle cx="34" cy="46" r="16" stroke="var(--color-brine)" strokeWidth="2" opacity="0.5" />
      <polygon
        points="188,26 204,36 204,56 188,66 172,56 172,36"
        stroke="var(--color-court-green)"
        strokeWidth="2"
        opacity="0.35"
      />
      <circle cx="196" cy="180" r="6" fill="var(--color-brine)" opacity="0.5" />

      {/* legs, slightly bent as if mid-stance - deliberately thin/short to
          read as the "tiny limbs on a big body" silhouette */}
      <path d="M96 246 L88 292" stroke="var(--color-court-green)" strokeWidth="8" strokeLinecap="round" />
      <path d="M124 246 L134 290" stroke="var(--color-court-green)" strokeWidth="8" strokeLinecap="round" />

      {/* bumpy, tapered pickle body (wavy outline instead of a plain
          rounded rect - this is what actually reads as "a pickle") */}
      <path
        d="M110 78
           C82 78 66 96 68 122
           C61 138 61 156 68 172
           C61 190 63 210 78 224
           C88 238 132 238 142 224
           C157 210 159 190 152 172
           C159 156 159 138 152 122
           C154 96 138 78 110 78 Z"
        fill="var(--color-court-green)"
        opacity="0.16"
      />
      <path
        d="M110 78
           C82 78 66 96 68 122
           C61 138 61 156 68 172
           C61 190 63 210 78 224
           C88 238 132 238 142 224
           C157 210 159 190 152 172
           C159 156 159 138 152 122
           C154 96 138 78 110 78 Z"
        stroke="var(--color-court-green)"
        strokeWidth="3"
      />

      {/* dimple texture dots, the one unmistakably "pickle" detail */}
      <circle cx="90" cy="110" r="3" fill="var(--color-court-green)" opacity="0.55" />
      <circle cx="130" cy="126" r="3" fill="var(--color-court-green)" opacity="0.55" />
      <circle cx="86" cy="160" r="3" fill="var(--color-court-green)" opacity="0.55" />
      <circle cx="132" cy="178" r="3" fill="var(--color-court-green)" opacity="0.55" />
      <circle cx="100" cy="202" r="3" fill="var(--color-court-green)" opacity="0.55" />

      {/* brine fill line, echoing the CourtCard "brine gauge" */}
      <path d="M72 168 H150" stroke="var(--color-brine)" strokeWidth="2" opacity="0.5" />

      {/* tiny arms - short on purpose, one holding a paddle up and ready */}
      <path d="M148 128 L176 104" stroke="var(--color-court-green)" strokeWidth="7" strokeLinecap="round" />
      <path d="M70 138 L46 152" stroke="var(--color-court-green)" strokeWidth="7" strokeLinecap="round" />

      {/* paddle: simple rounded rect + handle */}
      <g transform="translate(176 70) rotate(18)">
        <rect x="-18" y="-26" width="36" height="46" rx="16" fill="none" stroke="var(--color-brine)" strokeWidth="4" />
        <line x1="0" y1="20" x2="0" y2="42" stroke="var(--color-brine)" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
