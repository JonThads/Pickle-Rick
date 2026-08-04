import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import PlayerDashboard from './pages/PlayerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminCourtDetail from './pages/AdminCourtDetail.jsx';
import AdminReports from './pages/AdminReports.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';
import NavBar from './components/NavBar.jsx';
import FloatingShapes from './components/FloatingShapes.jsx';
import PaddleBallFigure from './components/PaddleBallFigure.jsx';
import StepBadge from './components/StepBadge.jsx';
import { useAuth } from './context/AuthContext.jsx';

const STEPS = [
  {
    title: 'Register a profile',
    body: 'Sign up as a Player or an Admin. Add a photo, pick your location.',
  },
  {
    title: 'Find & book a court',
    body: 'Browse courts near you and reserve an hourly slot — auto or admin-approved.',
  },
  {
    title: 'Play, or join a "Pasalo"',
    body: 'Show up and play, or request to join an approved booking with open seats.',
  },
];

/** Keeps logged-out visitors off pages that need a user (and vice versa isn't enforced - a logged-in admin can still browse /player, etc.). */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Home() {
  const navigate = useNavigate();

  return (
    <div>
      <section className="ledger home-hero">
        <FloatingShapes />

        <div className="home-hero-copy">
          <span className="label-tag">Specimen 01 / Court booking system</span>
          <h1 style={{ fontSize: '3.1rem', color: 'var(--color-bg)', margin: '0.7rem 0 1.1rem', lineHeight: 1.05 }}>
            One jar. Every court, every booking, brined to order.
          </h1>
          <p style={{ color: '#c7d6bc', maxWidth: 480, fontSize: '1rem', lineHeight: 1.6, margin: '0 0 1.75rem' }}>
            Pickle Rick manages courts for Admins and books games for Players — in one app. Register as
            a Player to find and book a court, or as an Admin to manage your own courts and track
            revenue.
          </p>
          <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/register')}
              style={{ background: 'var(--color-bg)', color: 'var(--color-court-green-deep)' }}
            >
              Find a court
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => navigate('/register')}
              style={{ color: 'var(--color-bg)', borderColor: '#4d6b52' }}
            >
              I manage courts
            </button>
          </div>
        </div>

        <div className="home-hero-art">
          <PaddleBallFigure className="float-a" />
        </div>
      </section>

      <div className="page" style={{ maxWidth: 1100 }}>
        <div className="home-steps">
          {STEPS.map((step, i) => (
            <div className="card" key={step.title}>
              <StepBadge number={i + 1} />
              <h3 style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>{step.title}</h3>
              <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/player"
          element={
            <RequireAuth>
              <PlayerDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/courts/:courtId"
          element={
            <RequireAuth>
              <AdminCourtDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RequireAuth>
              <AdminReports />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfileSettings />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
