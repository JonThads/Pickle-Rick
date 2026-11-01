import React, { useEffect } from 'react';

const AUTO_DISMISS_MS = 7000;

/**
 * Floating notification for errors/warnings from user actions.
 *
 * Why fixed-position instead of an inline banner: the old banner sat at the
 * top of the page, so a failure triggered by a button further down (e.g.
 * "Approve" in the Pasalo list) appeared off-screen. A fixed toast is always
 * visible no matter where the user has scrolled. It auto-dismisses and can be
 * closed manually; role="alert" makes screen readers announce it.
 */
export default function Toast({ title, message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    // Restart the timer whenever a new message arrives.
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="toast" role="alert">
      <span className="toast-icon" aria-hidden="true">!</span>
      <div className="toast-body">
        {title && <strong className="toast-title">{title}</strong>}
        <p className="toast-message">{message}</p>
      </div>
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
