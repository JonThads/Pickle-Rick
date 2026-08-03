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
    <div className="page">
      <span className="label-tag">PROFILE SETTINGS</span>
      <h2>Edit your profile</h2>

      <div className="card" style={{ marginTop: '1.5rem', maxWidth: 460 }}>
        <form className="form-stack" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}
          {success && <div className="label-tag" style={{ color: 'var(--color-court-green)' }}>Saved.</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {photoFile ? (
              <img src={preview} alt="New profile preview" style={{ width: 64, height: 64, borderRadius: 999, objectFit: 'cover' }} />
            ) : (
              <Avatar name={form.fullName} photoUrl={preview} size={64} />
            )}
            <label style={{ flex: 1 }}>
              Profile picture (optional)
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </label>
          </div>

          <label>
            Full name
            <input name="fullName" value={form.fullName} onChange={handleChange} required />
          </label>

          <label>
            Location
            <input name="location" value={form.location} onChange={handleChange} required />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
