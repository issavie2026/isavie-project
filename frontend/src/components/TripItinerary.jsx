import React, { useState, useEffect } from 'react';
import { itinerary as itineraryApi, changeRequests as crApi, exportPdf, analytics } from '../api';
import ItemModal from './ItemModal';
import ItemDetail from './ItemDetail';
import ChangeRequestsInbox from './ChangeRequestsInbox';
import { formatDateOnly } from '../utils/date';

export default function TripItinerary({ tripId, trip, canEdit, myRole }) {
  const [data, setData] = useState({ days: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState('');
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
    setSelectedDayId('');
    setEditingItem(item);
    setModalOpen(true);
  };

  const openCreateForDay = (dayId = '') => {
    setEditingItem(null);
    setSelectedDayId(dayId);
    setModalOpen(true);
  };

  if (loading) return <div>Loading itinerary...</div>;

  const renderTime = (item) =>
    item.startTime || item.endTime
      ? [item.startTime || 'TBD', item.endTime].filter(Boolean).join(' - ')
      : 'TBD';

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {canEdit && (
          <button type="button" className="btn btn-primary" onClick={() => openCreateForDay()}>
            Add item
          </button>
        )}
        {myRole === 'organizer' && (
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>{formatDateOnly(day.date, undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</h3>
                  {canEdit && (
                    <button type="button" className="btn btn-secondary" onClick={() => openCreateForDay(day.id)}>
                      Add activity
                    </button>
                  )}
                </div>
                {(day.items || []).length === 0 ? (
                  <div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: canEdit ? '0.75rem' : 0 }}>
                      No activities planned yet for this date.
                    </p>
                    {canEdit && (
                      <button type="button" className="btn btn-primary" onClick={() => openCreateForDay(day.id)}>
                        Plan this day
                      </button>
                    )}
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(day.items || []).map((item) => (
                      <li
                        key={item.id}
                        style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--surface2)' }}
                      >
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => setDetailItemId(item.id)}
                            style={{ background: 'none', border: 'none', color: 'inherit', textAlign: 'left', width: '100%', cursor: 'pointer' }}
                          >
                            <strong>{item.title}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                              {renderTime(item)}
                            </span>
                            {item.locationText && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location: {item.locationText}</div>}
                          </button>
                        ) : (
                          <article
                            style={{
                              display: 'grid',
                              gridTemplateColumns: item.coverImage ? '112px 1fr' : '1fr',
                              gap: '0.9rem',
                              alignItems: 'stretch',
                              padding: '0.25rem 0',
                            }}
                          >
                            {item.coverImage && (
                              <img
                                src={item.coverImage}
                                alt={item.title}
                                style={{
                                  width: '112px',
                                  height: '112px',
                                  objectFit: 'cover',
                                  borderRadius: '1rem',
                                  border: '1px solid var(--border)',
                                }}
                              />
                            )}
                            <div
                              style={{
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <strong style={{ fontSize: '1rem', lineHeight: 1.2 }}>{item.title}</strong>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>{renderTime(item)}</div>
                              {item.locationText && (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                  {item.locationText}
                                </div>
                              )}
                            </div>
                          </article>
                        )}
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
          initialDayId={selectedDayId}
          onClose={() => { setModalOpen(false); setEditingItem(null); setSelectedDayId(''); }}
          onSaved={() => { load(); setModalOpen(false); setEditingItem(null); setSelectedDayId(''); }}
        />
      )}

      {inboxOpen && (
        <ChangeRequestsInbox tripId={tripId} onClose={() => setInboxOpen(false)} onUpdated={load} />
      )}
    </>
  );
}
