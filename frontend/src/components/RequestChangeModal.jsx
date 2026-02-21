import React, { useState } from 'react';
import { itinerary as itineraryApi } from '../api';
import { analytics } from '../api';

export default function RequestChangeModal({ tripId, itemId, item, onClose, onSent }) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [start_time, setStartTime] = useState(item?.startTime ?? '');
  const [end_time, setEndTime] = useState(item?.endTime ?? '');
  const [location_text, setLocationText] = useState(item?.locationText ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const proposed_patch = {};
      if (title !== (item?.title ?? '')) proposed_patch.title = title;
      if (start_time !== (item?.startTime ?? '')) proposed_patch.startTime = start_time || null;
      if (end_time !== (item?.endTime ?? '')) proposed_patch.endTime = end_time || null;
      if (location_text !== (item?.locationText ?? '')) proposed_patch.locationText = location_text || null;
      if (notes !== (item?.notes ?? '')) proposed_patch.notes = notes || null;
      if (Object.keys(proposed_patch).length === 0) {
        setError('No changes to submit');
        setSending(false);
        return;
      }
      await itineraryApi.createChangeRequest(tripId, itemId, proposed_patch);
      analytics.event('change_request_submitted', { tripId, itemId }).catch(() => {});
      onSent();
    } catch (err) {
      setError(err.message || 'Failed to submit');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Request change</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Propose edits. Organizers can approve or deny.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Start time</label>
            <input value={start_time} onChange={(e) => setStartTime(e.target.value)} placeholder="TBD or time" />
          </div>
          <div className="form-group">
            <label>End time</label>
            <input value={end_time} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input value={location_text} onChange={(e) => setLocationText(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Submit request'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
