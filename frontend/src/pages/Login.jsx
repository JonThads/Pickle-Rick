import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PaddleBallFigure from '../components/PaddleBallFigure.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user, token } = await api.login(form);
      login(user, token);
      // Route to the right dashboard depending on the role (FR-01).
      navigate(user.role === 'admin' ? '/admin' : '/player');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <span className="label-tag">LOG IN</span>
      <h2>Welcome back</h2>
      <div className="card auth-split" style={{ marginTop: '1.5rem', padding: 0 }}>
        <div style={{ padding: '1.75rem' }}>
          <form className="form-stack" onSubmit={handleSubmit}>
            {error && <div className="error-banner">{error}</div>}
            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </label>
            <label>
              Password
              <input name="password" type="password" value={form.password} onChange={handleChange} required />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>
        <div className="auth-figure-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">
            <line x1="200" y1="0" x2="200" y2="400" stroke="var(--color-court-green)" strokeWidth="2" strokeDasharray="7 9" opacity="0.14" />
            <path d="M30 400 A170 170 0 0 1 370 400" fill="none" stroke="var(--color-court-green)" strokeWidth="2" strokeDasharray="7 9" opacity="0.14" />
            <line x1="0" y1="120" x2="400" y2="120" stroke="var(--color-court-green)" strokeWidth="2" strokeDasharray="7 9" opacity="0.1" />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-muted)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: '4px 10px',
              borderRadius: 3,
              transform: 'rotate(-2deg)',
            }}
          >
            Court-side
          </span>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <PaddleBallFigure variant="standing" className="float-a" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="66" height="56" viewBox="0 0 70 60" aria-hidden="true">
                <path d="M14 6 H56 V14 C64 20 64 46 54 54 H16 C6 46 6 20 14 14 Z" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="2" />
                <circle cx="27" cy="36" r="7" fill="var(--color-brine)" />
                <circle cx="42" cy="30" r="7" fill="var(--color-brine)" />
                <circle cx="35" cy="45" r="7" fill="var(--color-brine)" />
              </svg>
              <span className="label-tag">Spare balls</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
