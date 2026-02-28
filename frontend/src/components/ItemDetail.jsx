import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { comments as commentsApi, itinerary as itineraryApi } from '../api';
import { isImageAttachment, linkifyText, parseExternalLinks } from '../utils/links.jsx';
import { prepareImageAttachment } from '../utils/images.js';

export default function ItemDetail({ tripId, itemId, item: initialItem, canEdit, onClose, onEdit, onUpdated }) {
  const { user } = useAuth();
  const [item, setItem] = useState(initialItem);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [previewImage, setPreviewImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

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
    if (!newComment.trim() && commentAttachments.length === 0) return;
    setLoading(true);
    setUploadError('');
    try {
      await commentsApi.create(tripId, 'itinerary_item', itemId, newComment.trim(), commentAttachments);
      setNewComment('');
      setCommentAttachments([]);
      commentsApi.list(tripId, 'itinerary_item', itemId).then(setComments);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadError('');
      const dataUrl = await prepareImageAttachment(file);
      setCommentAttachments((prev) => [...prev, String(dataUrl)]);
    } catch (err) {
      setUploadError(err.message || 'Could not attach image');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentsApi.delete(tripId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {}
  };

  const canDeleteComment = (c) => c.userId === user?.id || c.user?.id === user?.id || canEdit;
  const attachmentLinks = canEdit ? parseExternalLinks(item?.externalLinks) : [];

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
          <button type="button" className="btn btn-ghost" onClick={onClose}>Back</button>
        </div>
      </div>
      {item.coverImage && (
        <div style={{ marginBottom: '1rem' }}>
          <img
            src={item.coverImage}
            alt={item.title}
            style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: '1rem', border: '1px solid var(--border)' }}
          />
        </div>
      )}
      {item.locationText && <p>Location: {item.locationText}</p>}
      {canEdit && item.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</p>}
      {attachmentLinks.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Attachments</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {attachmentLinks.map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noreferrer">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 style={{ marginTop: '1.5rem' }}>Comments</h3>
      <form onSubmit={handleAddComment} style={{ marginBottom: '1rem' }}>
        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." rows={2} style={{ width: '100%', marginBottom: '0.5rem' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            Attach photo
            <input type="file" accept="image/*" onChange={handleCommentImage} style={{ display: 'none' }} />
          </label>
          {commentAttachments.length > 0 && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {commentAttachments.length} photo{commentAttachments.length > 1 ? 's' : ''} attached
            </span>
          )}
        </div>
        {commentAttachments.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {commentAttachments.map((attachment, index) => (
              <div key={`${attachment}-${index}`} style={{ position: 'relative' }}>
                <img
                  src={attachment}
                  alt={`Comment attachment ${index + 1}`}
                  style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: '0.75rem', border: '1px solid var(--border)' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setCommentAttachments((prev) => prev.filter((_, i) => i !== index))}
                  style={{ position: 'absolute', top: 4, right: 4, minWidth: 0, padding: '0.15rem 0.35rem', background: 'rgba(255,255,255,0.88)' }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        {uploadError && <p style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{uploadError}</p>}
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
                <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {linkifyText(c.body)}
                </p>
                {parseExternalLinks(c.attachments).length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {parseExternalLinks(c.attachments).map((attachment, index) => (
                      isImageAttachment(attachment) ? (
                        <button
                          key={`${attachment}-${index}`}
                          type="button"
                          onClick={() => setPreviewImage(attachment)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'zoom-in' }}
                        >
                          <img
                            src={attachment}
                            alt={`Comment attachment ${index + 1}`}
                            style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: '0.75rem', border: '1px solid var(--border)' }}
                          />
                        </button>
                      ) : (
                        <a key={`${attachment}-${index}`} href={attachment} target="_blank" rel="noreferrer">
                          {attachment}
                        </a>
                      )
                    ))}
                  </div>
                )}
              </div>
              {canDeleteComment(c) && (
                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleDeleteComment(c.id)}>Delete</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {previewImage && (
        <div
          onClick={() => setPreviewImage('')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 20, 18, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: 'min(92vw, 1100px)', maxHeight: '90vh' }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPreviewImage('')}
              style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.88)' }}
            >
              Close
            </button>
            <img
              src={previewImage}
              alt="Comment attachment preview"
              style={{ display: 'block', maxWidth: '100%', maxHeight: '90vh', borderRadius: '1rem' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
