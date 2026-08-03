import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MortyFigure from '../components/MortyFigure.jsx';

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
      <div className="card auth-split" style={{ marginTop: '1.5rem', padding: 0 }}>
        <div style={{ padding: '1.75rem' }}>
          <form className="form-stack" onSubmit={handleSubmit}>
            {error && <div className="error-banner">{error}</div>}

            <label>
              I am a…
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="player">Player - I want to book courts</option>
                <option value="admin">Admin - I manage courts</option>
              </select>
            </label>

            <label>
              Full name
              <input name="fullName" value={form.fullName} onChange={handleChange} required />
            </label>

            <label>
              Location (e.g. Davao)
              <input name="location" value={form.location} onChange={handleChange} required />
            </label>

            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </label>

            <label>
              Password
              <input name="password" type="password" value={form.password} onChange={handleChange} required />
            </label>

            {/* Photo upload is optional and happens after account creation,
                from Profile Settings - keeps registration itself to plain
                JSON instead of juggling multipart form state here too. */}

            <button type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
        <div className="auth-figure-panel">
          <MortyFigure />
        </div>
      </div>
    </div>
  );
}
