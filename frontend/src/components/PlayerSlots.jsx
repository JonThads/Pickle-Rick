import React from 'react';
import Avatar from './Avatar.jsx';

/**
 * "Only a maximum of 8 players are allowed in that timeslot" (Business
 * Rules doc, Pasalo section) - the owner counts as one of the 8. Shows
 * "X/8" plus filled avatars for the owner + approved Pasalo joiners,
 * followed by dashed "ghost" placeholders for the remaining open seats.
 */
export default function PlayerSlots({ owner, players = [], capacity = 8, size = 26 }) {
  const filled = [owner, ...players].filter(Boolean);
  const emptyCount = Math.max(0, capacity - filled.length);

  return (
    <div>
      <span className="label-tag">{filled.length}/{capacity} players</span>
      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
        {filled.map((p, i) => (
          <Avatar key={p.player_id || p.id || i} name={p.full_name || p.name} photoUrl={p.photo_url || p.photoUrl} size={size} />
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <span key={`ghost-${i}`} className="avatar-ghost" style={{ width: size, height: size }} />
        ))}
      </div>
    </div>
  );
}
