import React from 'react';

// Scattered geometric accents for the Landing page - circles, a triangle,
// a hex outline, a plus mark - each gently drifting (CSS `float-*`
// keyframes in theme.css). Purely decorative, so it's all aria-hidden.
const SHAPES = [
  { type: 'circle', top: '8%', left: '6%', size: 22, color: 'var(--color-brine)', fill: false, anim: 'float-a' },
  { type: 'circle', top: '65%', left: '3%', size: 14, color: 'var(--color-court-green)', fill: true, anim: 'float-b' },
  { type: 'triangle', top: '20%', left: '85%', size: 30, color: 'var(--color-court-green)', anim: 'float-c' },
  { type: 'hex', top: '75%', left: '80%', size: 34, color: 'var(--color-brine)', anim: 'float-a' },
  { type: 'plus', top: '45%', left: '92%', size: 18, color: 'var(--color-court-green)', anim: 'float-b' },
  { type: 'circle', top: '85%', left: '40%', size: 10, color: 'var(--color-brine)', fill: true, anim: 'float-c' },
];

function Shape({ type, size, color, fill }) {
  if (type === 'circle') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill={fill ? color : 'none'} stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'triangle') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <polygon points="12,2 22,20 2,20" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'hex') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  // plus
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2 V22 M2 12 H22" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function FloatingShapes() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {SHAPES.map((shape, i) => (
        <div
          key={i}
          className={shape.anim}
          style={{ position: 'absolute', top: shape.top, left: shape.left, opacity: 0.55 }}
        >
          <Shape {...shape} />
        </div>
      ))}
    </div>
  );
}
