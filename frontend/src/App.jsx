import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './Layout';
import Login from './pages/Login';
import Verify from './pages/Verify';
import Join from './pages/Join';
import TripHome from './pages/TripHome';
import CreateTrip from './pages/CreateTrip';
import { trips as tripsApi } from './api';
import { formatDateOnly } from './utils/date';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/verify" element={<Verify />} />
      <Route path="/join/:token" element={<Join />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/trips" replace />} />
        <Route path="trips" element={<TripsList />} />
        <Route path="trips/new" element={<CreateTrip />} />
        <Route path="trips/:tripId/*" element={<TripHome />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function TripsList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    setLoading(true);
    setError(null);
    tripsApi.list()
      .then(setTrips)
      .catch((err) => setError(err.message || 'Something went wrong'))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="container">
      <section className="page-intro card card-elevated">
        <div>
          <p className="eyebrow">Travel hub</p>
          <h1 className="page-title">My trips</h1>
          <p className="muted">Keep itinerary, updates, and group coordination in one reliable place.</p>
        </div>
        <Link to="/trips/new" className="btn btn-primary">Create trip</Link>
      </section>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading trips...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {!loading && !error && trips.length === 0 && (
        <section className="card card-elevated trip-empty">
          <h3>No trips yet</h3>
          <p className="muted">Create your first trip and invite your group with one link.</p>
          <Link to="/trips/new" className="btn btn-primary">Start planning</Link>
        </section>
      )}

      {!loading && !error && trips.length > 0 && (
        <section className="trip-grid stagger-children">
          {trips.map((t) => (
            <Link key={t.id} to={`/trips/${t.id}`} className="trip-card card-interactive">
              <div className="trip-card-image" style={{ backgroundImage: `url('https://source.unsplash.com/800x500/?${encodeURIComponent(t.destination || 'travel')}')` }} />
              <div className="trip-card-body">
                <h3>{t.name}</h3>
                <p className="trip-meta">{t.destination}</p>
                <p className="trip-meta">
                  {formatDateOnly(t.startDate)} - {formatDateOnly(t.endDate)}
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
