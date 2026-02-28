import React, { useEffect, useMemo, useState } from 'react';
import { essentials as api } from '../api';

const PACKING_SUGGESTIONS = [
  'Photo ID / passport',
  'Boarding pass / tickets',
  'Phone + charger',
  'Portable battery',
  'Wallet / cards / cash',
  'Medications',
  'Toiletries',
  'Comfortable shoes',
  'Light jacket / layer',
  'Reusable water bottle',
];

const TEXT_FIELDS = {
  travelDetails: [
    ['flights', 'Flights', 'Airline, flight numbers, departure and arrival details...'],
    ['flightStatusTracker', 'Flight status tracker', 'Flight tracker link or airline app note...'],
    ['checkInReminders', 'Check-in reminders', 'When to check in for flights, hotel, or rental car...'],
    ['hotelStay', 'Hotel / stay', 'Hotel name, address, confirmation, room info, parking...'],
    ['rentalCarDetails', 'Rental car details', 'Rental company, pickup time, confirmation...'],
    ['reservations', 'Reservations', 'Tours, restaurants, events, booking windows...'],
  ],
  documentsInfo: [
    ['travelDocuments', 'Travel documents', 'Tickets, IDs, printed docs, copies...'],
    ['visaInformation', 'Visa information', 'Visa rules, processing status, entry requirements...'],
    ['travelInsurance', 'Travel insurance', 'Provider, policy number, claim contact...'],
    ['passportInformation', 'Passport information', 'Passport checks, expiry reminders...'],
    ['boardingPasses', 'Boarding passes', 'Where boarding passes are stored or shared...'],
    ['confirmationNumbers', 'Confirmation numbers', 'Flight, hotel, event, and rental confirmations...'],
  ],
  safetyHealth: [
    ['localEmergencyNumbers', 'Local emergency numbers', 'Police, ambulance, fire, tourism hotline...'],
    ['embassyConsulateInfo', 'Embassy / consulate info', 'Embassy address, phone, hours...'],
    ['nearbyHospitals', 'Nearby hospitals', 'Hospital names, addresses, ER guidance...'],
    ['pharmacies', 'Pharmacies', 'Pharmacy names, addresses, hours...'],
    ['medicationReminders', 'Medication reminders', 'Time-sensitive meds, storage needs...'],
    ['destinationRules', 'Country / state rules & laws', 'Local laws, customs, driving rules, entry requirements...'],
  ],
  localInfo: [
    ['currencyExchangeRate', 'Currency & exchange rate', 'Currency, payment notes, exchange reminders...'],
    ['weatherForecast', 'Weather forecast', 'Expected weather, seasonal notes, rain plans...'],
    ['transportationInfo', 'Transportation info', 'Uber, metro, taxi, parking, transit cards...'],
    ['languageBasics', 'Language basics', 'Common phrases, translations, etiquette...'],
    ['tippingGuidelines', 'Tipping guidelines', 'Restaurant, taxi, hotel, and tour tipping norms...'],
  ],
  planningInfo: [
    ['budgetTracker', 'Budget tracker', 'Budget targets, limits, who is paying what...'],
    ['expenseTracker', 'Expense tracker', 'Expense spreadsheet link, split notes, reimbursements...'],
    ['offlineAccess', 'Offline access (maps & itinerary)', 'Offline maps, saved docs, screenshots, backup plans...'],
  ],
  personalInfo: [
    ['dietaryRestrictions', 'Dietary restrictions', 'Allergies, restrictions, preferences...'],
    ['accessibilityNeeds', 'Accessibility needs', 'Mobility, hearing, vision, or support needs...'],
    ['frequentFlyerNumbers', 'Frequent flyer numbers', 'Airline loyalty numbers or reminders...'],
    ['hotelLoyaltyNumbers', 'Hotel loyalty numbers', 'Hotel loyalty programs or member numbers...'],
  ],
  groupFeatures: [
    ['sharedGroupChat', 'Shared group chat', 'WhatsApp, iMessage, Signal, Telegram link or notes...'],
    ['sharedExpenseSplit', 'Shared expense split', 'Splitwise link, reimbursement rules, payment method...'],
    ['taskAssignments', 'Task assignments', 'Who owns airport pickup, reservations, documents, supplies...'],
  ],
};

function parseArrayJson(value, fallback = []) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseObjectJson(value, fallback = {}) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function inferDestinationRules(destination) {
  const value = String(destination || '').trim();
  if (!value) return '';
  const lower = value.toLowerCase();
  if (lower.includes('france')) return 'France basics\n- Carry photo ID or passport copy.\n- Expect timed entry and bag checks at major sites.\n- Watch transport strike notices.';
  if (lower.includes('italy')) return 'Italy basics\n- Modest dress may be required for churches.\n- Check if service charge is already included before tipping.\n- Validate tickets where required before boarding.';
  if (lower.includes('mexico')) return 'Mexico basics\n- Keep passport details handy for check-in and excursions.\n- Use registered taxis or app rides when possible.\n- Check beach, weather, and water advisories.';
  if (/\b(texas|florida|california|new york|nevada)\b/i.test(value)) return `${value} basics\n- Check venue and local event rules before arrival.\n- Review weather and safety alerts for the trip dates.\n- Carry ID for hotels, rentals, nightlife, and restricted venues.`;
  return `${value} basics\n- Check passport, visa, and entry requirements before departure.\n- Review local transport, safety, and customs guidance.\n- Confirm restaurant, attraction, and hotel reservation rules.`;
}

function emptyForm(destinationRules) {
  return {
    travelDetails: { flights: '', flightStatusTracker: '', checkInReminders: '', hotelStay: '', rentalCarDetails: '', reservations: '' },
    documentsInfo: { travelDocuments: '', visaInformation: '', travelInsurance: '', passportInformation: '', boardingPasses: '', confirmationNumbers: '', keyLinks: [] },
    safetyHealth: { emergencyContacts: [], localEmergencyNumbers: '', embassyConsulateInfo: '', nearbyHospitals: '', pharmacies: '', medicationReminders: '', destinationRules: destinationRules || '' },
    localInfo: { currencyExchangeRate: '', weatherForecast: '', transportationInfo: '', languageBasics: '', tippingGuidelines: '' },
    planningInfo: { packingList: [], budgetTracker: '', expenseTracker: '', offlineAccess: '' },
    personalInfo: { dietaryRestrictions: '', accessibilityNeeds: '', frequentFlyerNumbers: '', hotelLoyaltyNumbers: '' },
    groupFeatures: { sharedGroupChat: '', sharedExpenseSplit: '', taskAssignments: '' },
  };
}

function Section({ title, children }) {
  return (
    <div className="section-block">
      <h4 style={{ marginBottom: '0.75rem' }}>{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>{label}</label>
      {children}
    </div>
  );
}

function ViewText({ value, empty }) {
  return <p className="muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{String(value || '').trim() || empty}</p>;
}

export default function TripEssentials({ tripId, canEdit, trip }) {
  const suggestedRules = useMemo(() => inferDestinationRules(trip?.destination), [trip?.destination]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const countdown = useMemo(() => {
    const start = trip?.startDate ? new Date(trip.startDate) : null;
    if (!start || Number.isNaN(start.getTime())) return 'Trip date not set';
    const days = Math.round((new Date(start.getFullYear(), start.getMonth(), start.getDate()) - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
    if (days > 1) return `${days} days to go`;
    if (days === 1) return '1 day to go';
    if (days === 0) return 'Trip starts today';
    return 'Trip already started';
  }, [trip?.startDate]);

  useEffect(() => {
    api.get(tripId)
      .then((res) => {
        const next = emptyForm(suggestedRules);
        next.travelDetails = { ...next.travelDetails, ...parseObjectJson(res.travelDetails), flights: parseObjectJson(res.travelDetails).flights || res.flightInfo || '', hotelStay: parseObjectJson(res.travelDetails).hotelStay || res.hotelInfo || res.lodgingDetails || '' };
        next.documentsInfo = { ...next.documentsInfo, ...parseObjectJson(res.documentsInfo), keyLinks: parseObjectJson(res.documentsInfo).keyLinks?.length ? parseObjectJson(res.documentsInfo).keyLinks : parseArrayJson(res.keyLinks, []) };
        next.safetyHealth = { ...next.safetyHealth, ...parseObjectJson(res.safetyHealth), emergencyContacts: parseObjectJson(res.safetyHealth).emergencyContacts?.length ? parseObjectJson(res.safetyHealth).emergencyContacts : parseArrayJson(res.emergencyContacts, []), destinationRules: parseObjectJson(res.safetyHealth).destinationRules || res.destinationRules || suggestedRules };
        next.localInfo = { ...next.localInfo, ...parseObjectJson(res.localInfo) };
        next.planningInfo = { ...next.planningInfo, ...parseObjectJson(res.planningInfo), packingList: parseObjectJson(res.planningInfo).packingList?.length ? parseObjectJson(res.planningInfo).packingList : parseArrayJson(res.packingList, []) };
        next.personalInfo = { ...next.personalInfo, ...parseObjectJson(res.personalInfo) };
        next.groupFeatures = { ...next.groupFeatures, ...parseObjectJson(res.groupFeatures) };
        setForm(next);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tripId, suggestedRules]);

  const update = (section, key, value) => setForm((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.patch(tripId, {
        hotel_information: form.travelDetails.hotelStay,
        flight_information: form.travelDetails.flights,
        destination_rules: form.safetyHealth.destinationRules,
        emergency_contacts: form.safetyHealth.emergencyContacts,
        key_links: form.documentsInfo.keyLinks,
        packing_list: form.planningInfo.packingList,
        travel_details: form.travelDetails,
        documents_info: form.documentsInfo,
        safety_health: form.safetyHealth,
        local_info: form.localInfo,
        planning_info: form.planningInfo,
        personal_info: form.personalInfo,
        group_features: form.groupFeatures,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addPacking = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return;
    if (form.planningInfo.packingList.some((item) => item.trim().toLowerCase() === trimmed.toLowerCase())) return;
    update('planningInfo', 'packingList', [...form.planningInfo.packingList, trimmed]);
  };

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading essentials...</p>;
  if (error && !form) return <p style={{ color: 'var(--danger)' }}>{error}</p>;
  if (!form) return null;

  const renderTextSection = (sectionKey) => TEXT_FIELDS[sectionKey].map(([key, label, placeholder]) => (
    <Field key={`${sectionKey}-${key}`} label={label}>
      {canEdit ? (
        <textarea rows={key === 'destinationRules' || key === 'reservations' ? 4 : 2} value={form[sectionKey][key]} onChange={(e) => update(sectionKey, key, e.target.value)} placeholder={placeholder} />
      ) : (
        <ViewText value={form[sectionKey][key]} empty={`No ${label.toLowerCase()} yet.`} />
      )}
    </Field>
  ));

  return (
    <div className="card" style={{ maxWidth: '58rem' }}>
      <div className="section-header">
        <div>
          <h3 style={{ marginBottom: '0.2rem' }}>Trip essentials</h3>
          <p className="muted" style={{ margin: 0 }}>Organized into the sections you listed.</p>
        </div>
        {canEdit ? <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button> : null}
      </div>

      <Section title="Travel details">{renderTextSection('travelDetails')}</Section>

      <Section title="Documents">
        {renderTextSection('documentsInfo')}
        <Field label="Key links">
          {canEdit ? (
            <>
              {form.documentsInfo.keyLinks.map((link, idx) => (
                <div key={`link-${idx}`} style={{ display: 'grid', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <input value={link.label || ''} onChange={(e) => update('documentsInfo', 'keyLinks', form.documentsInfo.keyLinks.map((item, i) => i === idx ? { ...item, label: e.target.value } : item))} placeholder="Label" />
                  <input value={link.url || ''} onChange={(e) => update('documentsInfo', 'keyLinks', form.documentsInfo.keyLinks.map((item, i) => i === idx ? { ...item, url: e.target.value } : item))} placeholder="URL" />
                  <button type="button" className="btn btn-ghost" onClick={() => update('documentsInfo', 'keyLinks', form.documentsInfo.keyLinks.filter((_, i) => i !== idx))}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={() => update('documentsInfo', 'keyLinks', [...form.documentsInfo.keyLinks, { label: '', url: '' }])}>Add link</button>
            </>
          ) : (
            <ul className="clean-list">
              {form.documentsInfo.keyLinks.length === 0 ? <li className="muted">No key links yet.</li> : null}
              {form.documentsInfo.keyLinks.map((link, idx) => <li key={`view-link-${idx}`}><strong>{link.label || 'Link'}</strong> - {link.url ? <a href={link.url} target="_blank" rel="noreferrer">{link.url}</a> : 'URL TBD'}</li>)}
            </ul>
          )}
        </Field>
      </Section>

      <Section title="Safety & health">
        <Field label="Emergency contacts">
          {canEdit ? (
            <>
              {form.safetyHealth.emergencyContacts.map((contact, idx) => (
                <div key={`contact-${idx}`} style={{ display: 'grid', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <input value={contact.name || ''} onChange={(e) => update('safetyHealth', 'emergencyContacts', form.safetyHealth.emergencyContacts.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Name" />
                  <input value={contact.phone || ''} onChange={(e) => update('safetyHealth', 'emergencyContacts', form.safetyHealth.emergencyContacts.map((item, i) => i === idx ? { ...item, phone: e.target.value } : item))} placeholder="Phone" />
                  <input value={contact.note || ''} onChange={(e) => update('safetyHealth', 'emergencyContacts', form.safetyHealth.emergencyContacts.map((item, i) => i === idx ? { ...item, note: e.target.value } : item))} placeholder="Note" />
                  <button type="button" className="btn btn-ghost" onClick={() => update('safetyHealth', 'emergencyContacts', form.safetyHealth.emergencyContacts.filter((_, i) => i !== idx))}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={() => update('safetyHealth', 'emergencyContacts', [...form.safetyHealth.emergencyContacts, { name: '', phone: '', note: '' }])}>Add contact</button>
            </>
          ) : (
            <ul className="clean-list">
              {form.safetyHealth.emergencyContacts.length === 0 ? <li className="muted">No emergency contacts yet.</li> : null}
              {form.safetyHealth.emergencyContacts.map((contact, idx) => <li key={`view-contact-${idx}`}><strong>{contact.name || 'Contact'}</strong> - {contact.phone || 'Phone TBD'}{contact.note ? ` (${contact.note})` : ''}</li>)}
            </ul>
          )}
        </Field>
        {renderTextSection('safetyHealth')}
        {canEdit ? <button type="button" className="btn btn-secondary" onClick={() => update('safetyHealth', 'destinationRules', suggestedRules)} disabled={!suggestedRules}>Refresh from destination</button> : null}
      </Section>

      <Section title="Local info">{renderTextSection('localInfo')}</Section>

      <Section title="Planning & organization">
        <Field label="Packing list">
          {canEdit ? (
            <>
              <div className="input-row">
                <input placeholder="Add an item" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPacking(e.target.value); e.target.value = ''; } }} />
                <button type="button" className="btn btn-secondary" onClick={(e) => { const input = e.currentTarget.parentElement?.querySelector('input'); if (input) { addPacking(input.value); input.value = ''; } }}>Add</button>
              </div>
              <div className="chip-list">
                {form.planningInfo.packingList.map((item, idx) => <span key={`packing-${idx}`} className="chip">{item}<button type="button" onClick={() => update('planningInfo', 'packingList', form.planningInfo.packingList.filter((_, i) => i !== idx))}>x</button></span>)}
                {form.planningInfo.packingList.length === 0 ? <span className="muted">No items yet.</span> : null}
              </div>
              <div className="chip-list" style={{ marginTop: '0.65rem' }}>
                {PACKING_SUGGESTIONS.map((item) => <button key={item} type="button" className="chip suggestion-chip" onClick={() => addPacking(item)}>+ {item}</button>)}
              </div>
            </>
          ) : (
            <ul className="clean-list">
              {form.planningInfo.packingList.length === 0 ? <li className="muted">No packing list yet.</li> : null}
              {form.planningInfo.packingList.map((item, idx) => <li key={`view-packing-${idx}`}>{item}</li>)}
            </ul>
          )}
        </Field>
        <Field label="Trip countdown"><p style={{ margin: 0, fontWeight: 600 }}>{countdown}</p></Field>
        {renderTextSection('planningInfo')}
      </Section>

      <Section title="Personal info">{renderTextSection('personalInfo')}</Section>
      <Section title="Group features">{renderTextSection('groupFeatures')}</Section>

      {error ? <p style={{ color: 'var(--danger)', marginTop: '0.75rem' }}>{error}</p> : null}
      {saved ? <p style={{ color: 'var(--success)', marginTop: '0.75rem' }}>Saved.</p> : null}
    </div>
  );
}
