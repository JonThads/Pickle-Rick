import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import AdminSidebar from '../components/AdminSidebar.jsx';
import Avatar from '../components/Avatar.jsx';
import PlayerSlots from '../components/PlayerSlots.jsx';
import CalendarPicker from '../components/CalendarPicker.jsx';
import { todayKey } from '../utils/date.js';

function formatHour(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? 'AM' : 'PM'}`;
}

/**
 * UC-05-02 (Admin): a court's hourly bookings for one day, expandable per
 * slot to approve/reject contested requests and see who's playing. Also
 * hosts that court's Item/Inventory management (UC-04, BR-07's data model).
 */
export default function AdminCourtDetail() {
  const { courtId } = useParams();
  const [court, setCourt] = useState(null);
  const [date, setDate] = useState(todayKey());
  const [showCalendar, setShowCalendar] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [expandedHour, setExpandedHour] = useState(null);
  const [items, setItems] = useState([]);
  const [itemForm, setItemForm] = useState({ name: '', quantity: '', pricePhp: '', details: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listMyCourts()
      .then(({ courts }) => setCourt(courts.find((c) => c.id === courtId) || null))
      .catch((err) => setError(err.message));
  }, [courtId]);

  async function loadBookings() {
    try {
      const { bookings } = await api.listBookingsForCourt(courtId, date);
      setBookings(bookings);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadItems() {
    try {
      const { items } = await api.listItems(courtId);
      setItems(items);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtId, date]);

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtId]);

  // Group the flat booking rows by hour - a slot with a manual court can
  // have several competing PENDING rows before the admin picks one.
  const slotsByHour = useMemo(() => {
    const map = new Map();
    for (const booking of bookings) {
      if (booking.status === 'cancelled') continue;
      if (!map.has(booking.start_hour)) map.set(booking.start_hour, []);
      map.get(booking.start_hour).push(booking);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [bookings]);

  async function handleApprove(bookingId) {
    try {
      await api.approveBooking(bookingId);
      await loadBookings();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancel(bookingId) {
    try {
      await api.cancelBooking(bookingId);
      await loadBookings();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    try {
      await api.createItem(courtId, {
        name: itemForm.name,
        details: itemForm.details || undefined,
        quantity: Number(itemForm.quantity) || 0,
        pricePhp: Number(itemForm.pricePhp),
      });
      setItemForm({ name: '', quantity: '', pricePhp: '', details: '' });
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleQuantityChange(itemId, quantity) {
    try {
      await api.updateItem(courtId, itemId, { quantity });
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteItem(itemId) {
    try {
      await api.deleteItem(courtId, itemId);
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="sidebar-layout">
      <AdminSidebar />

      <div>
        <span className="label-tag">{court?.location}</span>
        <h2>{court?.name || 'Court'}</h2>
        {court && (
          <p style={{ color: 'var(--color-ink-muted)' }}>
            {court.address} · ₱{Number(court.hourly_rate_php).toFixed(2)}/hr ·{' '}
            <span className="label-tag" style={{ textTransform: 'capitalize' }}>{court.approval_type} approval</span>
          </p>
        )}

        {error && <div className="error-banner">{error}</div>}

        <h3 style={{ marginTop: '2rem' }}>Bookings</h3>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
          <button type="button" className="secondary" onClick={() => setShowCalendar((s) => !s)}>
            {date}
          </button>
          {showCalendar && (
            <CalendarPicker value={date} onSelect={setDate} onClose={() => setShowCalendar(false)} />
          )}
        </div>

        {slotsByHour.length === 0 && (
          <p style={{ color: 'var(--color-ink-muted)' }}>No bookings for this date.</p>
        )}

        {slotsByHour.map(([hour, slotBookings]) => {
          const approved = slotBookings.find((b) => b.status === 'approved');
          const isExpanded = expandedHour === hour;

          return (
            <div className="accordion-item" key={hour}>
              <button type="button" className="accordion-header" onClick={() => setExpandedHour(isExpanded ? null : hour)}>
                <span>
                  {formatHour(hour)}–{formatHour((hour + 1) % 24)}
                  {approved ? ` · ${approved.owner_name}` : ` · ${slotBookings.length} pending request(s)`}
                </span>
                <span className="label-tag">{isExpanded ? 'Hide' : 'Show'}</span>
              </button>

              {isExpanded && (
                <div className="accordion-body">
                  {approved ? (
                    <>
                      <PlayerSlots
                        owner={{ full_name: approved.owner_name, photo_url: approved.owner_photo_url }}
                        players={approved.players}
                      />
                      <div style={{ marginTop: '0.75rem' }}>
                        <div className="player-row">
                          <Avatar name={approved.owner_name} photoUrl={approved.owner_photo_url} />
                          <span>{approved.owner_name} (booked)</span>
                        </div>
                        {approved.players.map((p) => (
                          <div className="player-row" key={p.join_request_id}>
                            <Avatar name={p.full_name} photoUrl={p.photo_url} />
                            <span>{p.full_name} (Pasalo)</span>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="danger" style={{ marginTop: '0.5rem' }} onClick={() => handleCancel(approved.id)}>
                        Cancel booking
                      </button>
                    </>
                  ) : (
                    slotBookings.map((b) => (
                      <div className="player-row" key={b.id} style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Avatar name={b.owner_name} photoUrl={b.owner_photo_url} />
                          <span>{b.owner_name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" onClick={() => handleApprove(b.id)}>Approve</button>
                          <button type="button" className="danger" onClick={() => handleCancel(b.id)}>Reject</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        <h3 style={{ marginTop: '2.5rem' }}>Inventory</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
              <div style={{ flex: 1 }}>
                <strong>{item.name}</strong>
                <p className="label-tag" style={{ margin: '0.2rem 0 0' }}>₱{Number(item.price_php).toFixed(2)}</p>
              </div>
              <label style={{ width: 90 }}>
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                />
              </label>
              <button type="button" className="danger" onClick={() => handleDeleteItem(item.id)}>Remove</button>
            </div>
          ))}
          {items.length === 0 && <p style={{ color: 'var(--color-ink-muted)' }}>No items yet.</p>}
        </div>

        <div className="card" style={{ maxWidth: 420 }}>
          <form className="form-stack" onSubmit={handleAddItem}>
            <label>
              Item name
              <input name="name" value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="0"
                value={itemForm.quantity}
                onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                required
              />
            </label>
            <label>
              Price (₱)
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemForm.pricePhp}
                onChange={(e) => setItemForm((f) => ({ ...f, pricePhp: e.target.value }))}
                required
              />
            </label>
            <button type="submit">Add item</button>
          </form>
        </div>
      </div>
    </div>
  );
}
