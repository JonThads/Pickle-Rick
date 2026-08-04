import React, { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';

/**
 * Edit full name / location, plus an OPTIONAL profile photo. Two separate
 * API calls under the hood (PATCH /auth/me for text fields, POST
 * /auth/me/photo for the file) since the photo needs multipart form data -
 * both only fire if that section actually changed.
 */
export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ fullName: user?.full_name || '', location: user?.location || '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(user?.photo_url || null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      let latest = await api.updateProfile(form);
      if (photoFile) {
        latest = await api.uploadPhoto(photoFile);
      }
      setUser(latest.user);
      setSuccess(true);
      setPhotoFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="page" style={{ maxWidth: 620 }}>
      <span className="label-tag">PROFILE SETTINGS</span>
      <h2>Your account</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', margin: '1.5rem 0' }}>
        {photoFile ? (
          <img src={preview} alt="New profile preview" style={{ width: 88, height: 88, borderRadius: 999, objectFit: 'cover' }} />
        ) : (
          <Avatar name={form.fullName} photoUrl={preview} size={88} />
        )}
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{user.full_name}</h3>
          <span className="label-tag" style={{ textTransform: 'capitalize' }}>{user.role} · {user.location}</span>
        </div>
      </div>

      <div className="form-stack" style={{ maxWidth: 'none', gap: '1.5rem' }}>
        <div className="card">
          <form className="form-stack" onSubmit={handleSubmit}>
            {error && <div className="error-banner">{error}</div>}
            {success && <div className="label-tag" style={{ color: 'var(--color-court-green)' }}>Saved.</div>}

            <label>
              Profile picture (optional)
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </label>

            <label>
              Full name
              <input name="fullName" value={form.fullName} onChange={handleChange} required />
            </label>

            <label>
              Location
              <input name="location" value={form.location} onChange={handleChange} required />
            </label>

            <button type="submit" disabled={saving} style={{ width: 'fit-content', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Password change and account deletion aren't wired up on the
            backend yet (no PATCH /auth/me/password or DELETE /auth/me
            route exists) - these stay visually in place per the design
            handoff but disabled, rather than faking a call to an endpoint
            that doesn't exist. */}
        <div className="card">
          <h4 style={{ margin: '0 0 0.9rem' }}>Change password</h4>
          <form className="form-stack">
            <label>
              New password
              <input type="password" disabled placeholder="Coming soon" />
            </label>
            <button type="button" className="secondary" disabled style={{ width: 'fit-content', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
              Update password
            </button>
          </form>
        </div>

        <div
          style={{
            border: '1px solid var(--color-hazard)',
            borderRadius: 'var(--radius-jar)',
            padding: '1.5rem',
            background: 'rgba(181, 72, 43, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h4 style={{ margin: '0 0 0.25rem', color: 'var(--color-hazard)' }}>Delete account</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
              This cancels all bookings and cannot be undone.
            </p>
          </div>
          <button type="button" className="danger" disabled title="Coming soon">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
