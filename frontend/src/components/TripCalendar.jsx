import React, { useEffect, useState } from 'react';
import { calendar as calendarApi } from '../api';

export default function TripCalendar({ tripId }) {
  const [token, setToken] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    calendarApi.getToken(tripId)
      .then((res) => {
        setToken(res.token || '');
        setFeedUrl(res.feedUrl || '');
      })
      .catch((e) => setError(e.message || 'Failed to load calendar feed'))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading calendar feed...</p>;
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>;

  return (
    <div className="card" style={{ maxWidth: '42rem' }}>
      <h3 style={{ marginTop: 0 }}>Calendar feed</h3>
      <p className="muted">Subscribe in Google, Apple, or Outlook to keep the itinerary in your calendar.</p>
      <input readOnly value={feedUrl} style={{ width: '100%', padding: '0.6rem' }} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigator.clipboard?.writeText(feedUrl)}
        >
          Copy feed URL
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.open(feedUrl, '_blank', 'noopener,noreferrer')}
          disabled={!feedUrl}
        >
          Download .ics
        </button>
      </div>
      {token && <p className="muted" style={{ marginTop: '0.75rem' }}>Token: {token}</p>}
    </div>
  );
}
