import React from 'react';
import AdminSidebar from '../components/AdminSidebar.jsx';
import PickleballWatermark from '../components/PickleballWatermark.jsx';

const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:5000';

/**
 * "Reports" section of the Admin sidebar shell (FR-09, BRD "Key Metrics").
 * The analytics-python service that actually computes revenue/profit isn't
 * built yet - this stays a pointer to it, same as before, just restyled in
 * the "ledger" dark-surface treatment the mockup uses for KPI/stat cards.
 * (The mockup's Reports screen shows populated stat cards and a bar chart,
 * but those numbers don't exist yet on a real backend - faking them here
 * would misrepresent what the app currently does, so this stays a pointer
 * to the real (not-yet-built) data source instead.)
 */
export default function AdminReports() {
  return (
    <div className="sidebar-layout">
      <AdminSidebar />

      <div>
        <span className="label-tag">REPORTS</span>
        <h2>Revenue &amp; profit</h2>
        <div className="ledger motif-card" style={{ borderRadius: 'var(--radius-jar)', padding: '1.75rem', maxWidth: 620 }}>
          <PickleballWatermark size={80} opacity={0.14} />
          <span className="label-tag">Coming soon</span>
          <p style={{ margin: '0.6rem 0 0', color: '#c7d6bc', lineHeight: 1.6 }}>
            Revenue and profit numbers come from the Python analytics service. Once you're logged
            in, try it directly at{' '}
            <code className="label-tag" style={{ color: '#a9c79b' }}>{ANALYTICS_URL}/docs</code> - it has
            interactive, auto-generated docs where you can call{' '}
            <code className="label-tag" style={{ color: '#a9c79b' }}>GET /revenue/{'{admin_id}'}</code> yourself.
          </p>
        </div>
      </div>
    </div>
  );
}
