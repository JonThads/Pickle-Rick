import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import CourtCard from '../components/CourtCard.jsx';
import CalendarPicker from '../components/CalendarPicker.jsx';
import Avatar from '../components/Avatar.jsx';
import PlayerSlots from '../components/PlayerSlots.jsx';
import CourtLinePattern from '../components/CourtLinePattern.jsx';
import PickleballWatermark from '../components/PickleballWatermark.jsx';
import { todayKey } from '../utils/date.js';

// "Approved" and "Pending" both read as wax-seal stamps; "Cancelled" reads
// as the hazard-red stamp - same wax-seal-vs-hazard split used on the
// Admin slot-approvals cards.
const STAMP_CLASS = {
  approved: 'stamp stamp-wax',
  pending: 'stamp stamp-wax',
  cancelled: 'stamp stamp-hazard',
};

function formatHour(hour) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? 'AM' : 'PM'}`;
}

// Postgres DATE columns come back from the API as full timestamps
// ("2026-08-04T00:00:00.000Z") - only the first 10 characters are the
// calendar date we actually want to show.
function dateOnly(value) {
  return value ? String(value).slice(0, 10) : value;
}

const SLOT_LABELS = {
  available: 'Book',
  requestable: 'Request',
  approved: 'Join (Pasalo)',
  'mine-pending': 'Requested',
  'mine-approved': 'Booked',
};

/**
 * Business Rules doc: "consecutive hour time slots booked by a specific
 * player... joined into one booking in the UI." The API still returns one
 * row per hour (schema.sql's own comment calls merging "a presentation-
 * layer job") - this groups runs of consecutive hours for the same
 * court/date/status into a single visual block.
 */
function groupConsecutiveBookings(bookings) {
  const sorted = [...bookings].sort((a, b) => {
    if (a.court_id !== b.court_id) return a.court_id.localeCompare(b.court_id);
    if (a.booking_date !== b.booking_date) return a.booking_date.localeCompare(b.booking_date);
    return a.start_hour - b.start_hour;
  });

  const blocks = [];
  for (const booking of sorted) {
    const last = blocks[blocks.length - 1];
    const isConsecutive =
      last &&
      last.court_id === booking.court_id &&
      last.booking_date === booking.booking_date &&
      last.status === booking.status &&
      last.endHour === booking.start_hour;

    if (isConsecutive) {
      last.endHour = booking.start_hour + 1;
      last.hours.push(booking.start_hour);
      last.ids.push(booking.id);
      for (const p of booking.players || []) {
        if (!last.players.some((existing) => existing.player_id === p.player_id)) last.players.push(p);
      }
    } else {
      blocks.push({
        court_id: booking.court_id,
        court_name: booking.court_name,
        booking_date: booking.booking_date,
        status: booking.status,
        startHour: booking.start_hour,
        endHour: booking.start_hour + 1,
        hours: [booking.start_hour],
        ids: [booking.id],
        players: [...(booking.players || [])],
      });
    }
  }
  return blocks;
}

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [courts, setCourts] = useState([]);
  const [location, setLocation] = useState('Davao');
  const [error, setError] = useState(null);

  const [selectedCourt, setSelectedCourt] = useState(null);
  const [bookingDate, setBookingDate] = useState(todayKey());
  const [showCalendar, setShowCalendar] = useState(false);
  const [slots, setSlots] = useState([]);
  const [expandedHour, setExpandedHour] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  async function loadCourts(loc) {
    try {
      const { courts } = await api.listCourts(loc);
      setCourts(courts);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadBookings() {
    try {
      const { bookings } = await api.listMyBookings();
      setBookings(bookings);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadJoinRequests() {
    try {
      const [{ joinRequests: inc }, { joinRequests: out }] = await Promise.all([
        api.listIncomingJoinRequests(),
        api.listOutgoingJoinRequests(),
      ]);
      setIncoming(inc);
      setOutgoing(out);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadCourts(location);
    loadBookings();
    loadJoinRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSlots() {
    if (!selectedCourt) return;
    try {
      const { slots } = await api.getCourtAvailability(selectedCourt.id, bookingDate);
      setSlots(slots);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadSlots();
    setExpandedHour(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourt, bookingDate]);

  function handleSelectCourt(court) {
    setSelectedCourt((prev) => (prev?.id === court.id ? null : court));
    setBookingDate(todayKey());
  }

  async function refreshAfterAction() {
    await Promise.all([loadSlots(), loadBookings(), loadJoinRequests()]);
  }

  async function handleSlotClick(slot) {
    // Already-confirmed/requested slots don't trigger a new API call -
    // clicking just expands an inline panel showing who's playing (or, for
    // a still-pending request, a reminder that it's awaiting approval).
    if (slot.status === 'mine-pending' || slot.status === 'mine-approved') {
      setExpandedHour((h) => (h === slot.startHour ? null : slot.startHour));
      return;
    }

    setError(null);
    try {
      if (slot.status === 'approved') {
        await api.requestToJoin(slot.bookingId);
      } else {
        await api.createBooking({ courtId: selectedCourt.id, bookingDate, startHour: slot.startHour });
      }
      await refreshAfterAction();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRespond(joinRequestId, approve) {
    try {
      await api.respondToJoinRequest(joinRequestId, approve);
      await refreshAfterAction();
    } catch (err) {
      setError(err.message);
    }
  }

  const myBookingBlocks = useMemo(() => groupConsecutiveBookings(bookings), [bookings]);
  const expandedSlot = slots.find((s) => s.startHour === expandedHour);

  return (
    <div className="page">
      <span className="label-tag">PLAYER DASHBOARD</span>
      <h2>Find a court</h2>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', maxWidth: 320, marginBottom: '1.5rem' }}>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location, e.g. Davao" />
        <button onClick={() => loadCourts(location)}>Search</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {courts.map((court, i) => (
          <div key={court.id}>
            <CourtCard
              court={court}
              onBook={() => handleSelectCourt(court)}
              selected={selectedCourt?.id === court.id}
              motif={i % 2 === 0 ? 'pickleball' : 'pickle'}
            />

            {selectedCourt?.id === court.id && (
              <div className="card motif-card" style={{ marginTop: '0.5rem', padding: 0 }}>
                <div style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                  <CourtLinePattern lines="both" />
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
                    <button type="button" className="secondary" onClick={() => setShowCalendar((s) => !s)}>
                      {bookingDate}
                    </button>
                    {showCalendar && (
                      <CalendarPicker
                        value={bookingDate}
                        onSelect={setBookingDate}
                        onClose={() => setShowCalendar(false)}
                      />
                    )}
                  </div>

                <div className="slot-grid" style={{ position: 'relative' }}>
                  {slots.map((slot) => {
                    const seatCount = slot.players ? slot.players.length + 1 : null; // +1 for the owner
                    return (
                      <button
                        type="button"
                        key={slot.startHour}
                        className={`slot-button ${slot.status}`}
                        onClick={() => handleSlotClick(slot)}
                      >
                        {formatHour(slot.startHour)}
                        <br />
                        <span style={{ fontSize: '0.72rem' }}>{SLOT_LABELS[slot.status]}</span>
                        {seatCount != null && (
                          <>
                            <br />
                            <span style={{ fontSize: '0.65rem' }}>{seatCount}/8</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {expandedSlot && (
                  <div className="accordion-body" style={{ borderTop: '1px solid var(--color-border)', marginTop: '1rem', paddingTop: '1rem' }}>
                    <p className="label-tag" style={{ marginBottom: '0.5rem' }}>
                      {formatHour(expandedSlot.startHour)} - {expandedSlot.status === 'mine-pending' ? 'awaiting admin approval' : 'players in this booking'}
                    </p>
                    {expandedSlot.status === 'mine-approved' && (
                      <PlayerSlots
                        owner={{ full_name: expandedSlot.ownerName, photo_url: expandedSlot.ownerPhotoUrl }}
                        players={expandedSlot.players}
                      />
                    )}
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        ))}
        {courts.length === 0 && (
          <p style={{ color: 'var(--color-ink-muted)' }}>No courts found in that location yet.</p>
        )}
      </div>

      <h2 className="section-divider" style={{ marginTop: '2.5rem', paddingTop: '2rem' }} id="my-bookings">My bookings</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {myBookingBlocks.map((block) => (
          <div key={block.ids.join('-')} className="card motif-card" style={{ padding: '1rem' }}>
            <PickleballWatermark size={60} opacity={0.13} />
            <span className={STAMP_CLASS[block.status] || 'stamp stamp-wax'}>{block.status}</span>
            <p style={{ margin: '0.5rem 0 0.35rem' }}>
              {block.court_name} · {dateOnly(block.booking_date)} · {block.hours.map(formatHour).join(' - ')}
            </p>
            <span className="label-tag">{block.hours.length} hour{block.hours.length > 1 ? 's' : ''}</span>
            {block.status === 'approved' && (
              <div style={{ marginTop: '0.5rem' }}>
                <PlayerSlots owner={{ full_name: user.full_name, photo_url: user.photo_url }} players={block.players} />
              </div>
            )}
          </div>
        ))}
        {myBookingBlocks.length === 0 && <p style={{ color: 'var(--color-ink-muted)' }}>No bookings yet.</p>}
      </div>

      <h2 className="section-divider" style={{ marginTop: '2.5rem', paddingTop: '2rem' }} id="pasalo">Incoming Pasalo requests</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {incoming.map((req) => (
          <div key={req.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <Avatar name={req.requester_name} photoUrl={req.requester_photo_url} />
            <div style={{ flex: 1 }}>
              <strong>{req.requester_name}</strong>
              <p className="label-tag" style={{ margin: '0.2rem 0 0' }}>
                {req.court_name} · {dateOnly(req.booking_date)} · {formatHour(req.start_hour)}
              </p>
            </div>
            <button type="button" onClick={() => handleRespond(req.id, true)}>Approve</button>
            <button type="button" className="danger" onClick={() => handleRespond(req.id, false)}>Reject</button>
          </div>
        ))}
        {incoming.length === 0 && <p style={{ color: 'var(--color-ink-muted)' }}>No pending requests.</p>}
      </div>

      <h2 style={{ marginTop: '2.5rem' }}>My Pasalo requests</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {outgoing.map((req) => (
          <div key={req.id} className="card" style={{ padding: '1rem' }}>
            <span className="label-tag">{req.status}</span>
            <p style={{ margin: '0.25rem 0 0' }}>
              {req.court_name} · {dateOnly(req.booking_date)} · {formatHour(req.start_hour)}
            </p>
          </div>
        ))}
        {outgoing.length === 0 && <p style={{ color: 'var(--color-ink-muted)' }}>You haven't asked to join anyone's booking.</p>}
      </div>

      <nav className="mobile-tabbar">
        <a className="tab active" href="#">Find</a>
        <a className="tab" href="#my-bookings">Bookings</a>
        <a className="tab" href="#pasalo">Pasalo</a>
        <Link className="tab" to="/profile">Profile</Link>
      </nav>
    </div>
  );
}
