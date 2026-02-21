import React, { useState, useEffect } from 'react';
import { changeRequests as crApi } from '../api';
import { analytics } from '../api';

export default function ChangeRequestsInbox({ tripId, onClose, onUpdated }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crApi.list(tripId, 'pending').then(setList).catch(() => setList([])).finally(() => setLoading(false));
  }, [tripId]);

  const handleApprove = async (requestId) => {
    try {
      await crApi.approve(tripId, requestId);
      analytics.event('change_request_approved', { tripId, requestId }).catch(() => {});
      setList((prev) => prev.filter((r) => r.id !== requestId));
      onUpdated?.();
    } catch (err) {}
  };

  const handleDeny = async (requestId) => {
    try {
      await crApi.deny(tripId, requestId);
      analytics.event('change_request_denied', { tripId, requestId }).catch(() => {});
      setList((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {}
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 560, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Change requests</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <p>Loading…</p>
        ) : list.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No pending requests.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {list.map((r) => (
              <li key={r.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--surface2)' }}>
                <div><strong>{r.item?.title}</strong></div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Requested by {r.requester?.name || r.requester?.email}
                </div>
                <pre style={{ background: 'var(--surface2)', padding: '0.5rem', borderRadius: 8, fontSize: '0.85rem', overflow: 'auto' }}>
                  {JSON.stringify(JSON.parse(r.proposedPatch || '{}'), null, 2)}
                </pre>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-primary" onClick={() => handleApprove(r.id)}>Approve</button>
                  <button type="button" className="btn btn-danger" onClick={() => handleDeny(r.id)}>Deny</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
