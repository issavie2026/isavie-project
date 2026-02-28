import React, { useState, useEffect } from 'react';
import { itinerary as itineraryApi } from '../api';
import { analytics } from '../api';
import { formatDateOnly } from '../utils/date';
import { prepareImageAttachment } from '../utils/images.js';

export default function ItemModal({ tripId, days, item, initialDayId = '', onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [day_id, setDayId] = useState('');
  const [start_time, setStartTime] = useState('');
  const [end_time, setEndTime] = useState('');
  const [location_text, setLocationText] = useState('');
  const [cover_image, setCoverImage] = useState('');
  const [notes, setNotes] = useState('');
  const [externalLinksText, setExternalLinksText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setStartTime(item.startTime || '');
      setEndTime(item.endTime || '');
      setLocationText(item.locationText || '');
      setCoverImage(item.coverImage || '');
      setNotes(item.notes || '');
      const existingLinks = Array.isArray(item.externalLinks)
        ? item.externalLinks
        : (() => {
            try {
              return JSON.parse(item.externalLinks || '[]');
            } catch {
              return [];
            }
          })();
      setExternalLinksText(existingLinks.join('\n'));
      setDayId(item.dayId || '');
      const d = days.find((x) => x.id === item.dayId);
      if (d) setDate(d.date ? new Date(d.date).toISOString().slice(0, 10) : '');
    } else {
      setError('');
      if (initialDayId) {
        setDayId(initialDayId);
        const d = days.find((x) => x.id === initialDayId);
        setDate(d?.date ? new Date(d.date).toISOString().slice(0, 10) : '');
      } else {
        setDate('');
        setDayId('');
      }
      setTitle('');
      setStartTime('');
      setEndTime('');
      setLocationText('');
      setCoverImage('');
      setNotes('');
      setExternalLinksText('');
    }
  }, [item, days, initialDayId]);

  const handleCoverImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setError('');
      setUploadingImage(true);
      const image = await prepareImageAttachment(file, 450 * 1024);
      setCoverImage(image);
    } catch (err) {
      setError(err.message || 'Could not process image');
    } finally {
      setUploadingImage(false);
    }
  };

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
        cover_image: cover_image || null,
        notes: notes.trim() || null,
        external_links: externalLinksText
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean),
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
          {!item && !initialDayId && (
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          )}
          {((item && days?.length > 0) || (!item && initialDayId && days?.length > 0)) && (
            <div className="form-group">
              <label>{item ? 'Day' : 'Planning for'}</label>
              <select value={day_id} onChange={(e) => setDayId(e.target.value)} disabled={!item && !!initialDayId}>
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
            <label>Widget image</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                {uploadingImage ? 'Processing...' : cover_image ? 'Replace image' : 'Upload image'}
                <input type="file" accept="image/*" onChange={handleCoverImage} disabled={uploadingImage} style={{ display: 'none' }} />
              </label>
              {cover_image && (
                <button type="button" className="btn btn-ghost" onClick={() => setCoverImage('')}>
                  Remove image
                </button>
              )}
            </div>
            {cover_image && (
              <div style={{ marginTop: '0.75rem' }}>
                <img
                  src={cover_image}
                  alt="Widget preview"
                  style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: '1rem', border: '1px solid var(--border)' }}
                />
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="form-group">
            <label>Venue attachments / links</label>
            <textarea
              value={externalLinksText}
              onChange={(e) => setExternalLinksText(e.target.value)}
              rows={3}
              placeholder={'Paste one link per line\nhttps://example.com/venue'}
            />
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
