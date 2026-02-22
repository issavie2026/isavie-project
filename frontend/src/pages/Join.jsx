import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invites as invitesApi } from '../api';
import { useAuth } from '../AuthContext';
import { analytics } from '../api';
import { formatDateOnly } from '../utils/date';

export default function Join() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [alreadyMemberTrip, setAlreadyMemberTrip] = useState(null);

  useEffect(() => {
    if (!token) return;
    invitesApi.preview(token)
      .then((data) => {
        setPreview(data);
        analytics.event('invite_opened', { tripId: data.trip?.id }).catch(() => {});
      })
      .catch(() => setError('Invalid or expired invite link'));
  }, [token]);

  const handleJoin = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
      return;
    }
    setJoining(true);
    setError('');
    setAlreadyMemberTrip(null);
    try {
      const res = await invitesApi.join(token);
      analytics.event('join_completed', { tripId: res.trip?.id }).catch(() => {});
      if (res.alreadyMember && res.trip) {
        setAlreadyMemberTrip(res.trip);
      } else {
        navigate(`/trips/${res.trip.id}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || (token && preview === null && !error)) {
    return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (error && !preview) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <h2 style={{ marginTop: 0 }}>Invalid invite</h2>
          <p className="muted">{error}</p>
        </div>
      </div>
    );
  }

  const trip = preview?.trip;
  const dateStr = trip?.startDate && trip?.endDate
    ? `${formatDateOnly(trip.startDate)} - ${formatDateOnly(trip.endDate)}`
    : '';

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <p className="eyebrow">Invite</p>
        <h1 style={{ marginTop: 0 }}>Join trip</h1>
        {trip && (
          <div className="card" style={{ background: 'var(--surface2)', boxShadow: 'none', marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>{trip.name}</h3>
            <p className="muted" style={{ marginBottom: '0.35rem' }}>{trip.destination}</p>
            {dateStr && <p className="muted" style={{ marginBottom: 0 }}>{dateStr}</p>}
          </div>
        )}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        {alreadyMemberTrip ? (
          <div>
            <p className="muted">You are already in this trip.</p>
            <Link to={`/trips/${alreadyMemberTrip.id}`} className="btn btn-primary">Go to trip</Link>
          </div>
        ) : user ? (
          <button type="button" className="btn btn-primary" onClick={handleJoin} disabled={joining}>
            {joining ? 'Joining...' : 'Join trip'}
          </button>
        ) : (
          <Link to={`/login?next=${encodeURIComponent(`/join/${token}`)}`} className="btn btn-primary">
            Sign in to join
          </Link>
        )}
      </div>
    </div>
  );
}
