import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PickleWatermark from '../components/PickleWatermark.jsx';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'player', // BR-02: registration must offer both Player and Admin
    location: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleRoleSelect(role) {
    setForm((prev) => ({ ...prev, role }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user, token } = await api.register(form);
      login(user, token);
      navigate(user.role === 'admin' ? '/admin' : '/player');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <span className="label-tag">REGISTER</span>
      <h2>Create your account</h2>
      <div className="card register-card motif-card" style={{ marginTop: '1.5rem' }}>
        <PickleWatermark size={100} rotation={16} opacity={0.08} corner="top-right" />

        <form className="form-stack" style={{ flex: 1, maxWidth: 'none' }} onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <div className="segmented" role="radiogroup" aria-label="I am a…">
            <button
              type="button"
              role="radio"
              aria-checked={form.role === 'player'}
              className={form.role === 'player' ? 'active' : ''}
              onClick={() => handleRoleSelect('player')}
            >
              Player
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={form.role === 'admin'}
              className={form.role === 'admin' ? 'active' : ''}
              onClick={() => handleRoleSelect('admin')}
            >
              Admin
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label>
              Full name
              <input name="fullName" value={form.fullName} onChange={handleChange} required />
            </label>

            <label>
              Location
              <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Davao" required />
            </label>

            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </label>

            <label>
              Password
              <input name="password" type="password" value={form.password} onChange={handleChange} required />
            </label>
          </div>

          {/* Photo upload is optional and happens after account creation,
              from Profile Settings - keeps registration itself to plain
              JSON instead of juggling multipart form state here too. The
              circle to the right is a decorative preview of that later
              step, not a functional upload control. */}

          <button type="submit" disabled={loading} style={{ width: 'fit-content', paddingLeft: '1.75rem', paddingRight: '1.75rem' }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
          <span className="register-photo-slot">Add photo</span>
          <span className="label-tag">Optional · later in Profile</span>
        </div>
      </div>
    </div>
  );
}
