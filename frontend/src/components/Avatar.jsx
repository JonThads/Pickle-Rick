import React from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Rounded profile photo, falling back to initials-on-a-jar-lid when a user
 * hasn't uploaded one (photo upload is optional, per Profile Settings).
 */
export default function Avatar({ name, photoUrl, size = 32 }) {
  const src = photoUrl ? (photoUrl.startsWith('http') ? photoUrl : `${BASE_URL}${photoUrl}`) : null;
  const style = { width: size, height: size, fontSize: size * 0.4 };

  if (src) {
    return <img className="avatar" style={style} src={src} alt={name || 'Profile photo'} />;
  }

  return (
    <span className="avatar" style={style}>
      {initials(name) || '?'}
    </span>
  );
}
