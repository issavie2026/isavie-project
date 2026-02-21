import React, { useState, useEffect } from 'react';
import { essentials as api } from '../api';

function parseArrayJson(s, fallback = []) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function normalizeItem(str) {
  return String(str || '').trim().toLowerCase();
}

const SUGGESTED_PACKING = [
  'Photo ID / passport',
  'Boarding pass / tickets',
  'Phone + charger',
  'Portable battery',
  'Wallet / cards / cash',
  'Medications',
  'Toiletries',
  'Sunglasses',
  'Comfortable shoes',
  'Light jacket / layer',
  'Swimwear',
  'Reusable water bottle',
];

export default function TripEssentials({ tripId, canEdit }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get(tripId)
      .then((res) => {
        setData(res);
        setForm({
          meetingPoints: parseArrayJson(res.meetingPoints, []),
          houseRules: res.houseRules || '',
          emergencyContacts: parseArrayJson(res.emergencyContacts, []),
          lodgingDetails: res.lodgingDetails || '',
          keyLinks: parseArrayJson(res.keyLinks, []),
          packingList: parseArrayJson(res.packingList, []),
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tripId]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const updated = await api.patch(tripId, {
        meeting_points: form.meetingPoints,
        house_rules: form.houseRules,
        emergency_contacts: form.emergencyContacts,
        lodging_details: form.lodgingDetails,
        key_links: form.keyLinks,
        packing_list: form.packingList,
      });
      setData(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading essentials...</p>;
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>;
  if (!data || !form) return null;

  const addMeetingPoint = () =>
    setForm((f) => ({
      ...f,
      meetingPoints: [...f.meetingPoints, { label: '', text: '', link: '' }],
    }));

  const addEmergencyContact = () =>
    setForm((f) => ({
      ...f,
      emergencyContacts: [...f.emergencyContacts, { name: '', phone: '', note: '' }],
    }));

  const addKeyLink = () =>
    setForm((f) => ({
      ...f,
      keyLinks: [...f.keyLinks, { label: '', url: '' }],
    }));

  const addPackingItem = (value = '') => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return;
    setForm((f) => {
      const exists = f.packingList.some((item) => normalizeItem(item) === normalizeItem(trimmed));
      if (exists) return f;
      return { ...f, packingList: [...f.packingList, trimmed] };
    });
  };

  return (
    <div className="card" style={{ maxWidth: '54rem' }}>
      <div className="section-header">
        <div>
          <h3 style={{ marginBottom: '0.2rem' }}>Trip essentials</h3>
          <p className="muted" style={{ margin: 0 }}>Everything the group needs to know before departure.</p>
        </div>
        {canEdit && (
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        )}
      </div>

      <div className="section-block">
        <h4>Meeting points</h4>
        {canEdit ? (
          <>
            {form.meetingPoints.map((mp, idx) => (
              <div key={`mp-${idx}`} className="input-row">
                <input
                  placeholder="Label (e.g. Airport pickup)"
                  value={mp.label || ''}
                  onChange={(e) => setForm((f) => {
                    const next = [...f.meetingPoints];
                    next[idx] = { ...next[idx], label: e.target.value };
                    return { ...f, meetingPoints: next };
                  })}
                />
                <input
                  placeholder="Details (time, place)"
                  value={mp.text || ''}
                  onChange={(e) => setForm((f) => {
                    const next = [...f.meetingPoints];
                    next[idx] = { ...next[idx], text: e.target.value };
                    return { ...f, meetingPoints: next };
                  })}
                />
                <input
                  placeholder="Optional link"
                  value={mp.link || ''}
                  onChange={(e) => setForm((f) => {
                    const next = [...f.meetingPoints];
                    next[idx] = { ...next[idx], link: e.target.value };
                    return { ...f, meetingPoints: next };
                  })}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setForm((f) => {
                    const next = f.meetingPoints.filter((_, i) => i !== idx);
                    return { ...f, meetingPoints: next };
                  })}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addMeetingPoint}>Add meeting point</button>
          </>
        ) : (
          <ul className="clean-list">
            {form.meetingPoints.length === 0 && <li className="muted">No meeting points yet.</li>}
            {form.meetingPoints.map((mp, idx) => (
              <li key={`mp-view-${idx}`}>
                <strong>{mp.label || 'Meeting point'}</strong> - {mp.text || 'Details TBD'} {mp.link ? `(${mp.link})` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="section-block">
        <h4>House rules</h4>
        {canEdit ? (
          <textarea
            rows={2}
            value={form.houseRules}
            onChange={(e) => setForm((f) => ({ ...f, houseRules: e.target.value }))}
            placeholder="Quiet hours, shared costs, safety notes, etc."
          />
        ) : (
          <p className="muted">{form.houseRules || 'No rules added yet.'}</p>
        )}
      </div>

      <div className="section-block">
        <h4>Emergency contacts</h4>
        {canEdit ? (
          <>
            {form.emergencyContacts.map((c, idx) => (
              <div key={`ec-${idx}`} className="input-row">
                <input
                  placeholder="Name"
                  value={c.name || ''}
                  onChange={(e) => setForm((f) => {
                    const next = [...f.emergencyContacts];
                    next[idx] = { ...next[idx], name: e.target.value };
                    return { ...f, emergencyContacts: next };
                  })}
                />
                <input
                  placeholder="Phone"
                  value={c.phone || ''}
                  onChange={(e) => setForm((f) => {
                    const next = [...f.emergencyContacts];
                    next[idx] = { ...next[idx], phone: e.target.value };
                    return { ...f, emergencyContacts: next };
                  })}
                />
                <input
                  placeholder="Notes"
                  value={c.note || ''}
                  onChange={(e) => setForm((f) => {
                    const next = [...f.emergencyContacts];
                    next[idx] = { ...next[idx], note: e.target.value };
                    return { ...f, emergencyContacts: next };
                  })}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setForm((f) => {
                    const next = f.emergencyContacts.filter((_, i) => i !== idx);
                    return { ...f, emergencyContacts: next };
                  })}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addEmergencyContact}>Add contact</button>
          </>
        ) : (
          <ul className="clean-list">
            {form.emergencyContacts.length === 0 && <li className="muted">No emergency contacts yet.</li>}
            {form.emergencyContacts.map((c, idx) => (
              <li key={`ec-view-${idx}`}>
                <strong>{c.name || 'Contact'}</strong> - {c.phone || 'Phone TBD'} {c.note ? `(${c.note})` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="section-block">
        <h4>Lodging</h4>
        {canEdit ? (
          <textarea
            rows={2}
            value={form.lodgingDetails}
            onChange={(e) => setForm((f) => ({ ...f, lodgingDetails: e.target.value }))}
            placeholder="Address, check-in time, codes, etc."
          />
        ) : (
          <p className="muted">{form.lodgingDetails || 'No lodging details yet.'}</p>
        )}
      </div>

      <div className="section-block">
        <h4>Key links</h4>
        {canEdit ? (
          <>
            {form.keyLinks.map((link, idx) => (
              <div key={`kl-${idx}`} className="input-row">
                <input
                  placeholder="Label"
                  value={link.label || ''}
                  onChange={(e) => setForm((f) => {
                    const next = [...f.keyLinks];
                    next[idx] = { ...next[idx], label: e.target.value };
                    return { ...f, keyLinks: next };
                  })}
                />
                <input
                  placeholder="URL"
                  value={link.url || ''}
                  onChange={(e) => setForm((f) => {
                    const next = [...f.keyLinks];
                    next[idx] = { ...next[idx], url: e.target.value };
                    return { ...f, keyLinks: next };
                  })}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setForm((f) => {
                    const next = f.keyLinks.filter((_, i) => i !== idx);
                    return { ...f, keyLinks: next };
                  })}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addKeyLink}>Add link</button>
          </>
        ) : (
          <ul className="clean-list">
            {form.keyLinks.length === 0 && <li className="muted">No key links yet.</li>}
            {form.keyLinks.map((link, idx) => (
              <li key={`kl-view-${idx}`}>
                <strong>{link.label || 'Link'}</strong> - {link.url || 'URL TBD'}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="section-block">
        <h4>Packing list</h4>
        {canEdit ? (
          <>
            <div className="input-row">
              <input
                placeholder="Add an item (e.g. hiking boots)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPackingItem(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.querySelector('input');
                  if (input) {
                    addPackingItem(input.value);
                    input.value = '';
                  }
                }}
              >
                Add
              </button>
            </div>
            <div className="chip-list">
              {form.packingList.map((item, idx) => (
                <span key={`pack-${idx}`} className="chip">
                  {item}
                  <button
                    type="button"
                    aria-label={`Remove ${item}`}
                    onClick={() => setForm((f) => ({
                      ...f,
                      packingList: f.packingList.filter((_, i) => i !== idx),
                    }))}
                  >
                    x
                  </button>
                </span>
              ))}
              {form.packingList.length === 0 && <span className="muted">No items yet.</span>}
            </div>
            <div className="suggestions">
              <p className="muted" style={{ margin: '0 0 0.5rem' }}>Suggestions</p>
              <div className="chip-list">
                {SUGGESTED_PACKING.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip suggestion-chip"
                    onClick={() => addPackingItem(item)}
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <ul className="clean-list">
            {form.packingList.length === 0 && <li className="muted">No packing list yet.</li>}
            {form.packingList.map((item, idx) => (
              <li key={`pack-view-${idx}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      {saved && <p style={{ marginTop: '0.75rem', color: 'var(--success)' }}>Saved.</p>}
      {saving && <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Saving...</p>}
    </div>
  );
}
