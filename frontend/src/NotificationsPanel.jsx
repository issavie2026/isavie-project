import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notifications as notifApi } from './api';

export default function NotificationsPanel({ onClose }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () => {
      notifApi.list()
        .then((items) => {
          if (active) setList(items);
        })
        .catch(() => {
          if (active) setList([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const markRead = (id) => {
    notifApi.markRead(id).catch(() => {});
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 72,
        right: 16,
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 420,
        overflow: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: '0 20px 40px rgba(22, 29, 25, 0.18)',
        zIndex: 1000,
      }}
    >
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Notifications</strong>
        <button type="button" className="btn btn-ghost" onClick={onClose}>x</button>
      </div>
      {loading ? (
        <div style={{ padding: '1rem' }}>Loading...</div>
      ) : list.length === 0 ? (
        <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>No notifications</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {list.map((n) => (
            <li
              key={n.id}
              style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border)',
                background: n.readAt ? 'transparent' : 'rgba(47, 127, 115, 0.08)',
              }}
            >
              <Link
                to={n.trip ? `/trips/${n.trip.id}` : '#'}
                style={{ color: 'inherit', textDecoration: 'none' }}
                onClick={() => { markRead(n.id); onClose(); }}
              >
                <div style={{ fontSize: '0.9rem' }}>{formatType(n.type)}</div>
                {formatDetail(n) && (
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    {formatDetail(n)}
                  </div>
                )}
                {n.trip && <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{n.trip.name}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function parsePayload(payload) {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

function formatType(type) {
  const t = {
    announcement_posted: 'New announcement',
    itinerary_item_created: 'Itinerary item added',
    itinerary_item_updated: 'Itinerary updated',
    change_request_submitted: 'Change request submitted',
    change_request_approved: 'Change request approved',
    change_request_denied: 'Change request denied',
    essentials_updated: 'Essentials updated',
  };
  return t[type] || type;
}

function formatDetail(notification) {
  const payload = parsePayload(notification.payload);
  if (notification.type === 'itinerary_item_created') {
    return payload.title ? `"${payload.title}" was added to the itinerary.` : 'A new itinerary item was added.';
  }
  if (notification.type === 'itinerary_item_updated') {
    return payload.title ? `"${payload.title}" was updated.` : 'An itinerary item was updated.';
  }
  if (notification.type === 'announcement_posted') {
    return payload.title ? `"${payload.title}" was posted.` : 'A new announcement is available.';
  }
  if (notification.type === 'change_request_submitted') {
    return payload.title ? `Review the request for "${payload.title}".` : 'A trip change needs review.';
  }
  if (notification.type === 'change_request_approved') {
    return payload.title ? `"${payload.title}" was approved.` : 'A change request was approved.';
  }
  if (notification.type === 'change_request_denied') {
    return payload.title ? `"${payload.title}" was denied.` : 'A change request was denied.';
  }
  return '';
}
