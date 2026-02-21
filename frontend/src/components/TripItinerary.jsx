import React, { useState, useEffect } from 'react';
import { itinerary as itineraryApi, changeRequests as crApi, exportPdf, analytics } from '../api';
import ItemModal from './ItemModal';
import ItemDetail from './ItemDetail';
import ChangeRequestsInbox from './ChangeRequestsInbox';

export default function TripItinerary({ tripId, trip, canEdit, myRole }) {
  const [data, setData] = useState({ days: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailItemId, setDetailItemId] = useState(null);
  const [inboxOpen, setInboxOpen] = useState(false);

  const load = () => {
    itineraryApi.list(tripId).then(setData).catch(() => setData({ days: [] })).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tripId]);

  const handleExportPdf = () => {
    analytics.event('export_pdf_clicked', { tripId }).catch(() => {});
    exportPdf(tripId)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `issavie-${(trip?.name || 'trip').replace(/\s+/g, '-')}-itinerary.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        analytics.event('export_pdf_success', { tripId }).catch(() => {});
      })
      .catch(() => {});
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  if (loading) return <div>Loading itinerary...</div>;

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {canEdit && (
          <button type="button" className="btn btn-primary" onClick={() => { setEditingItem(null); setModalOpen(true); }}>
            Add item
          </button>
        )}
        {(myRole === 'organizer' || myRole === 'co_organizer') && (
          <button type="button" className="btn btn-secondary" onClick={() => setInboxOpen(true)}>
            Change requests
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={handleExportPdf}>
          Export PDF
        </button>
      </div>

      {detailItemId ? (
        <ItemDetail
          tripId={tripId}
          itemId={detailItemId}
          item={data.days?.flatMap((d) => d.items || []).find((i) => i.id === detailItemId)}
          canEdit={canEdit}
          onClose={() => setDetailItemId(null)}
          onEdit={() => { setDetailItemId(null); openEdit(data.days?.flatMap((d) => d.items || []).find((i) => i.id === detailItemId)); }}
          onUpdated={load}
        />
      ) : (
        <>
          {(!data.days || data.days.length === 0) ? (
            <div className="card" style={{ color: 'var(--text-muted)' }}>
              No itinerary days yet. Add an item and choose a date to create the first day.
            </div>
          ) : (
            data.days.map((day) => (
              <div key={day.id} className="card">
                <h3 style={{ marginTop: 0 }}>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</h3>
                {(day.items || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No items</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(day.items || []).map((item) => (
                      <li
                        key={item.id}
                        style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--surface2)' }}
                      >
                        <button
                          type="button"
                          onClick={() => setDetailItemId(item.id)}
                          style={{ background: 'none', border: 'none', color: 'inherit', textAlign: 'left', width: '100%', cursor: 'pointer' }}
                        >
                          <strong>{item.title}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                            {item.startTime || item.endTime ? [item.startTime || 'TBD', item.endTime].filter(Boolean).join(' - ') : 'TBD'}
                          </span>
                          {item.locationText && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location: {item.locationText}</div>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </>
      )}

      {modalOpen && (
        <ItemModal
          tripId={tripId}
          days={data.days || []}
          item={editingItem}
          onClose={() => { setModalOpen(false); setEditingItem(null); }}
          onSaved={() => { load(); setModalOpen(false); setEditingItem(null); }}
        />
      )}

      {inboxOpen && (
        <ChangeRequestsInbox tripId={tripId} onClose={() => setInboxOpen(false)} onUpdated={load} />
      )}
    </>
  );
}
