import React, { useState, useEffect } from 'react';
import { announcements as announcementsApi } from '../api';
import { analytics } from '../api';

export default function TripAnnouncements({ tripId, canEdit }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => announcementsApi.list(tripId).then(setList).catch(() => setList([])).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [tripId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await announcementsApi.create(tripId, { title: title.trim() || null, body: body.trim() });
      analytics.event('announcement_created', { tripId }).catch(() => {});
      setTitle('');
      setBody('');
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        {canEdit && (
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            New announcement
          </button>
        )}
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : list.length === 0 ? (
        <div className="card" style={{ color: 'var(--text-muted)' }}>No announcements yet.</div>
      ) : (
        list.map((a) => (
          <div key={a.id} className="card">
            {a.title && <h3 style={{ marginTop: 0 }}>{a.title}</h3>}
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{a.body}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
              {a.creator?.name || a.creator?.email} · {new Date(a.createdAt).toLocaleString()}
            </p>
          </div>
        ))
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setModalOpen(false)}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>New announcement</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title (optional)</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Posting…' : 'Post'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
