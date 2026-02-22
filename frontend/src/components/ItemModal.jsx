import React, { useState, useEffect } from 'react';
import { itinerary as itineraryApi } from '../api';
import { analytics } from '../api';
import { formatDateOnly } from '../utils/date';

export default function ItemModal({ tripId, days, item, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [day_id, setDayId] = useState('');
  const [start_time, setStartTime] = useState('');
  const [end_time, setEndTime] = useState('');
  const [location_text, setLocationText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setStartTime(item.startTime || '');
      setEndTime(item.endTime || '');
      setLocationText(item.locationText || '');
      setNotes(item.notes || '');
      setDayId(item.dayId || '');
      const d = days.find((x) => x.id === item.dayId);
      if (d) setDate(d.date ? new Date(d.date).toISOString().slice(0, 10) : '');
    } else {
      setDate('');
      setDayId('');
    }
  }, [item, days]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        start_time: start_time || null,
        end_time: end_time || null,
        location_text: location_text.trim() || null,
        notes: notes.trim() || null,
      };
      if (item) {
        if (day_id) body.day_id = day_id;
        await itineraryApi.updateItem(tripId, item.id, body);
        analytics.event('itinerary_item_updated', { tripId, itemId: item.id }).catch(() => {});
      } else {
        body.date = date || day_id ? undefined : null;
        if (day_id) body.day_id = day_id;
        else if (date) body.date = date;
        await itineraryApi.createItem(tripId, body);
        analytics.event('itinerary_item_created', { tripId }).catch(() => {});
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 480, width: '100%', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>{item ? 'Edit item' : 'Add itinerary item'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          {!item && (
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          )}
          {item && days?.length > 0 && (
            <div className="form-group">
              <label>Day</label>
              <select value={day_id} onChange={(e) => setDayId(e.target.value)}>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>{formatDateOnly(d.date)}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Start time (or TBD)</label>
            <input placeholder="e.g. 09:00 or TBD" value={start_time} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label>End time</label>
            <input placeholder="e.g. 10:30" value={end_time} onChange={(e) => setEndTime(e.target.value)} />
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
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
