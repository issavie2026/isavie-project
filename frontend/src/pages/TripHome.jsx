import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { trips as tripsApi } from '../api';
import TripItinerary from '../components/TripItinerary';
import TripAnnouncements from '../components/TripAnnouncements';
import TripMembers from '../components/TripMembers';
import TripEssentials from '../components/TripEssentials';
import { formatDateOnly } from '../utils/date';

const TABS = ['itinerary', 'essentials', 'announcements', 'members'];

export default function TripHome() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState('itinerary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCreated, setShowCreated] = useState(searchParams.get('created') === '1');
  const tabsRef = useRef(null);
  const unlockAll = import.meta.env.VITE_UNLOCK_ALL === 'true';

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    Promise.all([tripsApi.get(tripId), tripsApi.members(tripId)])
      .then(([t, m]) => {
        setTrip(t);
        setMembers(m);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;
  if (error || !trip) return <div className="container"><p style={{ color: 'var(--danger)' }}>{error || 'Trip not found'}</p><Link to="/trips">Back to trips</Link></div>;

  const myMember = members.find((m) => m.userId === user?.id || m.user?.id === user?.id);
  const myRole = myMember?.role ?? trip.myRole;
  const canEdit = unlockAll || myRole === 'organizer';
  const canDelete = unlockAll || myRole === 'organizer';
  const heroImage = `https://source.unsplash.com/1200x800/?${encodeURIComponent(trip.destination || 'travel')}`;
  const dismissCreated = () => {
    setShowCreated(false);
    searchParams.delete('created');
    setSearchParams(searchParams, { replace: true });
  };
  const handleDeleteTrip = async () => {
    if (!canDelete || deleteLoading) return;
    const confirmed = window.confirm(`Delete "${trip.name}"? This removes the trip and all of its planning data.`);
    if (!confirmed) return;
    setDeleteLoading(true);
    setError('');
    try {
      await tripsApi.delete(tripId);
      navigate('/trips', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to delete trip');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="container">
      {showCreated && (
        <section className="trip-hero">
          <div className="trip-hero-media" style={{ backgroundImage: `url('${heroImage}')` }} />
          <div className="trip-hero-card card-primary">
            <p className="eyebrow">Trip created</p>
            <h1>{trip.name}</h1>
            <p className="muted">
              {trip.destination} - {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setTab('itinerary');
                  dismissCreated();
                  tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Start planning
              </button>
              <button type="button" className="btn btn-secondary" onClick={dismissCreated}>
                Dismiss
              </button>
            </div>
          </div>
        </section>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <Link to="/trips" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>&larr; Trips</Link>
          <h1 style={{ margin: '0.25rem 0' }}>{trip.name}</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {trip.destination} - {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
          </p>
        </div>
        {canDelete && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDeleteTrip}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete trip'}
          </button>
        )}
      </div>
      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}

      <div ref={tabsRef} className="tabs" style={{ flexWrap: 'wrap', gap: '0.25rem' }}>
        {TABS.map((t) => (
          <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'itinerary' ? 'Itinerary' : t === 'essentials' ? 'Essentials' : t === 'announcements' ? 'Announcements' : 'Members'}
          </button>
        ))}
      </div>

      {tab === 'itinerary' && (
        <TripItinerary tripId={tripId} trip={trip} canEdit={canEdit} myRole={myRole} />
      )}
      {tab === 'essentials' && <TripEssentials tripId={tripId} canEdit={canEdit} trip={trip} />}
      {tab === 'announcements' && (
        <TripAnnouncements tripId={tripId} canEdit={canEdit} />
      )}
      {tab === 'members' && (
        <TripMembers tripId={tripId} members={members} setMembers={setMembers} trip={trip} myRole={myRole} />
      )}
    </div>
  );
}
