import React from 'react';

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

export default function CourtCard({ court, bookedHours = 0, totalHours = 12, onBook }) {
  return (
    <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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

      {onBook && <button onClick={() => onBook(court)}>Book</button>}
    </div>
  );
}
