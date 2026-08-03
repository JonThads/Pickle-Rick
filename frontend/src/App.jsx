import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import PlayerDashboard from './pages/PlayerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminCourtDetail from './pages/AdminCourtDetail.jsx';
import AdminReports from './pages/AdminReports.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';
import NavBar from './components/NavBar.jsx';
import PickleFigure from './components/PickleFigure.jsx';
import MortyFigure from './components/MortyFigure.jsx';
import FloatingShapes from './components/FloatingShapes.jsx';
import { useAuth } from './context/AuthContext.jsx';

/** Keeps logged-out visitors off pages that need a user (and vice versa isn't enforced - a logged-in admin can still browse /player, etc.). */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Home() {
  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden', minHeight: '70vh' }}>
      <FloatingShapes />

      <div className="float-a" style={{ position: 'absolute', right: '1rem', top: '0.5rem', opacity: 0.9 }}>
        <MortyFigure width={150} height={210} />
      </div>
      <div className="float-c" style={{ position: 'absolute', right: '8.5rem', top: '3.5rem', opacity: 0.9 }}>
        <PickleFigure width={150} height={210} />
      </div>
      <div className="float-b" style={{ position: 'absolute', right: '3rem', bottom: '-1rem', opacity: 0.3 }}>
        <PickleFigure width={90} height={130} />
      </div>

      <span className="label-tag">SPECIMEN 01 / COURT BOOKING SYSTEM</span>
      <h2 style={{ fontSize: '2.4rem', marginTop: '0.5rem', maxWidth: 560, position: 'relative' }}>
        One jar. Every court, <br /> every booking, brined to order.
      </h2>
      <p style={{ color: 'var(--color-ink-muted)', maxWidth: 520, position: 'relative' }}>
        Pickle Rick manages courts for Admins and books games for Players -
        in one app. Register as a Player to book a court, or as an Admin to
        manage your own courts and see your revenue.
      </p>
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
