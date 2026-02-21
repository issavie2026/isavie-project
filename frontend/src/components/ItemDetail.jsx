import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { comments as commentsApi, itinerary as itineraryApi } from '../api';
import RequestChangeModal from './RequestChangeModal';

export default function ItemDetail({ tripId, itemId, item: initialItem, canEdit, onClose, onEdit, onUpdated }) {
  const { user } = useAuth();
  const [item, setItem] = useState(initialItem);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [requestChangeOpen, setRequestChangeOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    commentsApi.list(tripId, 'itinerary_item', itemId).then(setComments).catch(() => setComments([]));
  }, [tripId, itemId]);

  const refreshItem = () => {
    itineraryApi.list(tripId).then((data) => {
      const i = data.days?.flatMap((d) => d.items || []).find((x) => x.id === itemId);
      if (i) setItem(i);
    });
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await commentsApi.create(tripId, 'itinerary_item', itemId, newComment.trim());
      setNewComment('');
      commentsApi.list(tripId, 'itinerary_item', itemId).then(setComments);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentsApi.delete(tripId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {}
  };

  const canDeleteComment = (c) => c.userId === user?.id || c.user?.id === user?.id || canEdit;

  if (!item) return <div className="card"><p>Item not found.</p><button type="button" className="btn btn-ghost" onClick={onClose}>Back</button></div>;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>{item.title}</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            {item.startTime || item.endTime ? [item.startTime || 'TBD', item.endTime].filter(Boolean).join(' - ') : 'TBD'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canEdit && <button type="button" className="btn btn-secondary" onClick={onEdit}>Edit</button>}
          {!canEdit && <button type="button" className="btn btn-secondary" onClick={() => setRequestChangeOpen(true)}>Request change</button>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Back</button>
        </div>
      </div>
      {item.locationText && <p>Location: {item.locationText}</p>}
      {item.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</p>}

      <h3 style={{ marginTop: '1.5rem' }}>Comments</h3>
      <form onSubmit={handleAddComment} style={{ marginBottom: '1rem' }}>
        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." rows={2} style={{ width: '100%', marginBottom: '0.5rem' }} />
        <button type="submit" className="btn btn-primary" disabled={loading}>Post</button>
      </form>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {comments.map((c) => (
          <li key={c.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--surface2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{c.user?.name || c.user?.email}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                  {new Date(c.createdAt).toLocaleString()}
                </span>
                <p style={{ margin: '0.25rem 0 0' }}>{c.body}</p>
              </div>
              {canDeleteComment(c) && (
                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleDeleteComment(c.id)}>Delete</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {requestChangeOpen && (
        <RequestChangeModal
          tripId={tripId}
          itemId={itemId}
          item={item}
          onClose={() => setRequestChangeOpen(false)}
          onSent={() => { setRequestChangeOpen(false); onUpdated?.(); refreshItem(); }}
        />
      )}
    </div>
  );
}
