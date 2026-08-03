import React from 'react';
import AdminSidebar from '../components/AdminSidebar.jsx';

const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:5000';

/**
 * "Reports" section of the Admin sidebar shell (FR-09, BRD "Key Metrics").
 * The analytics-python service that actually computes revenue/profit isn't
 * built yet - this stays a pointer to it, same as before, just relocated
 * under the new sidebar nav instead of living inline on the Courts page.
 */
export default function AdminReports() {
  return (
    <div className="sidebar-layout">
      <AdminSidebar />

      <div>
        <span className="label-tag">REPORTS</span>
        <h2>Revenue</h2>
        <div className="card">
          <p style={{ color: 'var(--color-ink-muted)', margin: 0 }}>
            Revenue and profit numbers come from the Python analytics service.
            Once you're logged in, try it directly at{' '}
            <code className="label-tag">{ANALYTICS_URL}/docs</code> - it has interactive,
            auto-generated docs where you can call{' '}
            <code className="label-tag">GET /revenue/{'{admin_id}'}</code> yourself.
          </p>
        </div>
      </div>
    </div>
  );
}
