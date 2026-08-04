import React from 'react';
import CourtLinePattern from './CourtLinePattern.jsx';
import PickleballWatermark from './PickleballWatermark.jsx';
import PickleWatermark from './PickleWatermark.jsx';

/**
 * The "brine gauge" is this project's one signature visual element: a
 * vertical fill meter styled like the liquid level in a specimen jar,
 * showing how full a court's booked hours are (bookedHours / totalHours).
 * It's a literal pickle-jar metaphor applied to something the BRD actually
 * cares about (court utilization) rather than pure decoration.
 */
function BrineGauge({ bookedHours, totalHours }) {
  const pct = totalHours > 0 ? Math.min(100, Math.round((bookedHours / totalHours) * 100)) : 0;

  return (
    <div
      title={`${bookedHours} of ${totalHours} hours booked today`}
      style={{
        width: 14,
        height: 56,
        borderRadius: 7,
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface-raised)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${pct}%`,
          background: 'var(--color-brine)',
          transition: 'height 0.4s ease',
        }}
      />
    </div>
  );
}

/**
 * `motif`: which corner watermark this card wears - alternate 'pickleball'
 * / 'pickle' across a list for visual variety, matching the mockup's court
 * list and admin court list.
 * `selected`: when true and `onBook` is set, shows a "Selected" stamp
 * instead of the Book button (the mockup's expanded-court state).
 */
export default function CourtCard({ court, bookedHours = 0, totalHours = 12, onBook, motif = 'pickleball', selected = false }) {
  return (
    <div className="card motif-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      {motif === 'pickle' ? <PickleWatermark size={60} rotation={14} opacity={0.12} corner="top-right" /> : <CourtLinePattern />}
      {motif === 'pickleball' && <PickleballWatermark />}

      <BrineGauge bookedHours={bookedHours} totalHours={totalHours} />

      <div style={{ flex: 1 }}>
        <span className="label-tag">{court.location}</span>
        <h3 style={{ fontSize: '1.15rem' }}>{court.name}</h3>
        <p style={{ color: 'var(--color-ink-muted)', margin: '0.25rem 0' }}>{court.address}</p>
        <p style={{ margin: 0 }}>
          ₱{Number(court.hourly_rate_php).toFixed(2)}/hr ·{' '}
          <span className="label-tag" style={{ textTransform: 'capitalize' }}>
            {court.approval_type} approval
          </span>
        </p>
      </div>

      {onBook && (selected ? (
        <span
          className="label-tag"
          style={{ background: 'var(--color-court-green)', color: '#fff', padding: '0.5em 1.1em', borderRadius: 999 }}
        >
          Selected
        </span>
      ) : (
        <button onClick={() => onBook(court)}>Book</button>
      ))}
    </div>
  );
}
