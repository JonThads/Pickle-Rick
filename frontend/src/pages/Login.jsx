import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PickleFigure from '../components/PickleFigure.jsx';

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
        <div className="auth-figure-panel">
          <PickleFigure />
        </div>
      </div>
    </div>
  );
}
