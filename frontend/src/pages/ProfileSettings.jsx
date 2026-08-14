import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: user?.full_name || '', location: user?.location || '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(user?.photo_url || null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Account deletion (UC-06). Kept in its own state rather than reusing the
  // profile form's error/saving flags, so a failed delete can't clear a
  // "Saved." message from the form above it, or vice versa.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  function cancelDelete() {
    setConfirmingDelete(false);
    setDeletePassword('');
    setDeleteError(null);
  }

  /**
   * UC-06 step 3: confirm with the account password, then delete.
   *
   * On success the account is gone, so there's nothing to navigate back to -
   * we move to the landing page FIRST and clear auth state after. Doing it in
   * that order matters: logout() alone would leave us on /profile, whose
   * RequireAuth guard would bounce to /login, which is not where UC-06 says a
   * deleted user should end up.
   */
  async function handleDelete(e) {
    e.preventDefault();
    setDeleteError(null);
    setDeleting(true);
    try {
      await api.deleteAccount(deletePassword);
      navigate('/', { replace: true });
      logout();
    } catch (err) {
      // Wrong password (401) lands here - stay on the page with the panel
      // open so the user can retry without starting over.
      setDeleteError(err.message);
      setDeleting(false);
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

        {/* Password change still has no backend route (no PATCH
            /auth/me/password), so it stays visually in place per the design
            handoff but disabled, rather than faking a call to an endpoint
            that doesn't exist. Account deletion below is now live. */}
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

        {/* Danger zone - UC-06. Deliberately a two-step flow: the first click
            only opens the confirmation, it doesn't delete anything. The
            destructive call needs a second, deliberate action plus the
            account password. */}
        <div
          style={{
            border: '1px solid var(--color-hazard)',
            borderRadius: 'var(--radius-jar)',
            padding: '1.5rem',
            background: 'rgba(181, 72, 43, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
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
            {!confirmingDelete && (
              <button type="button" className="danger" onClick={() => setConfirmingDelete(true)}>
                Delete
              </button>
            )}
          </div>

          {confirmingDelete && (
            <form className="form-stack" onSubmit={handleDelete} style={{ gap: '1rem', maxWidth: 'none' }}>
              {deleteError && <div className="error-banner">{deleteError}</div>}

              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>
                {/* Spelled out per role, because the blast radius genuinely
                    differs - an admin deleting their account also cancels
                    OTHER players' games (see "Account Deletion Rules" in the
                    Business Rules doc). */}
                {user.role === 'admin' ? (
                  <>
                    This permanently deletes your account, <strong>every court you manage</strong>, their
                    inventory, and <strong>all bookings players have made on them</strong>. Those players
                    will lose their games. This cannot be undone.
                  </>
                ) : (
                  <>
                    This permanently deletes your account, <strong>all of your bookings</strong>, and any
                    Pasalo requests you&apos;ve made. This cannot be undone.
                  </>
                )}
              </p>

              <label>
                Confirm your password
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Your account password"
                  required
                  autoFocus
                />
              </label>

              <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  className="danger"
                  disabled={deleting || !deletePassword}
                  style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
                >
                  {deleting ? 'Deleting…' : 'Permanently delete account'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={cancelDelete}
                  disabled={deleting}
                  style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
