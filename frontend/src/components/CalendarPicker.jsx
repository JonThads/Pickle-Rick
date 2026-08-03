import React, { useState } from 'react';
import { toLocalDateKey } from '../utils/date.js';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Small custom month-grid popover - no date-picker dependency, per the
 * project's minimal-deps philosophy (frontend only depends on
 * react/react-dom/react-router-dom otherwise). Past dates are disabled since
 * a court can't be booked retroactively.
 */
export default function CalendarPicker({ value, onSelect, onClose }) {
  const today = startOfToday();
  const initialMonth = value ? new Date(value + 'T00:00:00') : today;
  const [viewMonth, setViewMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="calendar-popover" role="dialog" aria-label="Choose a date">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button
          type="button"
          className="secondary"
          style={{ padding: '0.3em 0.7em' }}
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
        >
          ‹
        </button>
        <span className="label-tag">
          {viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          className="secondary"
          style={{ padding: '0.3em 0.7em' }}
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
        >
          ›
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((wd) => (
          <span key={wd} className="label-tag">
            {wd}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const key = toLocalDateKey(date);
          const isPast = date < today;
          return (
            <button
              type="button"
              key={key}
              disabled={isPast}
              className={key === value ? 'selected' : ''}
              onClick={() => {
                onSelect(key);
                onClose?.();
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
