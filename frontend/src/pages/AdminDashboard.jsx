import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import CourtCard from '../components/CourtCard.jsx';
import AdminSidebar from '../components/AdminSidebar.jsx';

/**
 * "Courts" section of the Admin sidebar shell (UI mockup Admin comment 1).
 * Court cards are now clickable and route to /admin/courts/:id, where the
 * admin manages that court's bookings + inventory (mockup Admin comment 2).
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    location: '',
    hourlyRatePhp: '',
    approvalType: 'manual',
  });

  async function loadCourts() {
    try {
      const { courts } = await api.listMyCourts();
      setCourts(courts);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadCourts();
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.createCourt({ ...form, hourlyRatePhp: Number(form.hourlyRatePhp) });
      setForm({ name: '', address: '', location: '', hourlyRatePhp: '', approvalType: 'manual' });
      await loadCourts();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="sidebar-layout">
      <AdminSidebar />

      <div>
        <span className="label-tag">ADMIN DASHBOARD</span>
        <h2>Your courts</h2>

        {error && <div className="error-banner">{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {courts.map((court) => (
            <div
              key={court.id}
              onClick={() => navigate(`/admin/courts/${court.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <CourtCard court={court} />
            </div>
          ))}
          {courts.length === 0 && <p style={{ color: 'var(--color-ink-muted)' }}>You haven't added a court yet.</p>}
        </div>

        <h2>Add a court</h2>
        <div className="card" style={{ marginBottom: '2rem' }}>
          <form className="form-stack" onSubmit={handleSubmit}>
            <label>
              Name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              Address
              <input name="address" value={form.address} onChange={handleChange} required />
            </label>
            <label>
              Location
              <input name="location" value={form.location} onChange={handleChange} required />
            </label>
            <label>
              Hourly rate (₱)
              <input
                name="hourlyRatePhp"
                type="number"
                min="0"
                step="0.01"
                value={form.hourlyRatePhp}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Approval type
              <select name="approvalType" value={form.approvalType} onChange={handleChange}>
                <option value="manual">Manual - I approve each booking</option>
                <option value="auto">Auto - bookings are approved instantly</option>
              </select>
            </label>
            <button type="submit">Add court</button>
          </form>
        </div>
      </div>
    </div>
  );
}
