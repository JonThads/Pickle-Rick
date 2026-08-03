import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import PickleIcon from './PickleIcon.jsx';

/**
 * Auth-aware header. Logged out: Login/Register links (as before). Logged
 * in: the user's name + a dropdown (Profile Settings, Log out) replaces
 * those links entirely - this is the fix for "Users have no Logout Button."
 */
export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <PickleIcon size={26} />
        <h1 style={{ fontSize: '1.4rem', color: 'var(--color-court-green)', margin: 0 }}>Pickle Rick</h1>
      </Link>

      {user ? (
        <div className="nav-profile" ref={menuRef}>
          <button type="button" className="nav-profile-trigger" onClick={() => setOpen((o) => !o)}>
            <Avatar name={user.full_name} photoUrl={user.photo_url} size={28} />
            {user.full_name}
          </button>
          {open && (
            <div className="nav-dropdown">
              <Link to={user.role === 'admin' ? '/admin' : '/player'} onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <Link to="/profile" onClick={() => setOpen(false)}>
                Profile Settings
              </Link>
              <button type="button" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
        </div>
      ) : (
        <nav className="nav-links label-tag">
          <Link to="/login">Log in</Link>
          <Link to="/register">Register</Link>
        </nav>
      )}
    </header>
  );
}
