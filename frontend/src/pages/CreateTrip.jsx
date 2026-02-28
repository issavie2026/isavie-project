import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trips as tripsApi } from '../api';
import { analytics } from '../api';

export default function CreateTrip() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [start_date, setStartDate] = useState('');
  const [end_date, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setMonth(today.getMonth() + 6);
  const formatDateLocal = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const minDate = formatDateLocal(today);
  const maxDateStr = formatDateLocal(maxDate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (start_date && start_date > maxDateStr) {
      setError(`Start date must be on or before ${maxDateStr}.`);
      return;
    }
    if (end_date && end_date > maxDateStr) {
      setError(`End date must be on or before ${maxDateStr}.`);
      return;
    }
    setLoading(true);
    try {
      const trip = await tripsApi.create({
        name: name.trim(),
        destination: destination.trim(),
        start_date: start_date || undefined,
        end_date: end_date || undefined,
      });
      analytics.event('trip_created', { tripId: trip.id }).catch(() => {});
      navigate(`/trips/${trip.id}?created=1`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <section className="page-intro card card-elevated">
        <div>
          <p className="eyebrow">Plan a new trip</p>
          <h1 className="page-title">Create trip</h1>
          <p className="muted">Set the destination and dates. You can add the itinerary right after.</p>
        </div>
      </section>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="name">Trip name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Summer 2025" />
        </div>
        <div className="form-group">
          <label htmlFor="destination">Destination</label>
          <input id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} required placeholder="e.g. Paris, France" />
        </div>
        <div className="form-group">
          <label htmlFor="start_date">Start date</label>
          <input
            id="start_date"
            type="date"
            value={start_date}
            min={minDate}
            max={maxDateStr}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (end_date && e.target.value && end_date < e.target.value) {
                setEndDate(e.target.value);
              }
            }}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="end_date">End date</label>
          <input
            id="end_date"
            type="date"
            value={end_date}
            min={start_date || minDate}
            max={maxDateStr}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
          <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.85rem' }}>
            Trips can be scheduled up to 6 months ahead (on or before {maxDateStr}).
          </p>
        </div>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create trip'}
        </button>
      </form>
    </div>
  );
}
