import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { trips as tripsApi, analytics } from '../api';

export default function TripMembers({ tripId, members, setMembers, trip, myRole }) {
  const { user } = useAuth();
  const unlockAll = import.meta.env.VITE_UNLOCK_ALL === 'true';
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);

  const canManage = unlockAll || myRole === 'organizer' || myRole === 'co_organizer';
  const isOrganizer = unlockAll || myRole === 'organizer';

  const handleCreateInvite = async () => {
    setLoading(true);
    try {
      const res = await tripsApi.invite(tripId);
      analytics.event('invite_created', { tripId }).catch(() => {});
      setInviteUrl(res.url || `${window.location.origin}/join/${res.token}`);
      setInviteOpen(true);
    } catch (err) {}
    setLoading(false);
  };

  const handleRoleChange = async (userId, role) => {
    try {
      const updated = await tripsApi.patchMember(tripId, userId, role);
      setMembers(updated);
    } catch (err) {}
  };

  const handleRemove = async (userId) => {
    try {
      await tripsApi.removeMember(tripId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      setDeleteConfirm(false);
    } catch (err) {}
  };

  const handleLeave = async () => {
    try {
      await tripsApi.removeMember(tripId, user?.id);
      window.location.href = '/trips';
    } catch (err) {}
  };

  const handleDeleteTrip = async () => {
    try {
      await tripsApi.delete(tripId);
      window.location.href = '/trips';
    } catch (err) {}
  };

  return (
    <>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={handleCreateInvite} disabled={loading}>
            Get invite link
          </button>
        )}
        {myRole === 'member' && (
          <button type="button" className="btn btn-ghost" onClick={() => setLeaveConfirm(true)}>
            Leave trip
          </button>
        )}
        {isOrganizer && (
          <button type="button" className="btn btn-danger" onClick={() => setDeleteConfirm(true)}>
            Delete trip
          </button>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Members</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {members.map((m) => (
            <li key={m.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--surface2)' }}>
              <div>
                <span>{m.user?.name || m.user?.email}</span>
                <span className={`badge ${m.role}`} style={{ marginLeft: '0.5rem' }}>{m.role.replace('_', ' ')}</span>
              </div>
              {canManage && m.userId !== user?.id && (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                  style={{ background: 'var(--surface2)', color: 'inherit', padding: '0.35rem', borderRadius: 6 }}
                >
                  <option value="member">Member</option>
                  <option value="co_organizer">Co-organizer</option>
                  {isOrganizer && <option value="organizer">Organizer</option>}
                </select>
              )}
              {canManage && m.userId !== user?.id && m.role !== 'organizer' && (
                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={() => handleRemove(m.userId)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {inviteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setInviteOpen(false)}>
          <div className="card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Invite link</h3>
            <p style={{ color: 'var(--text-muted)' }}>Share this link. Anyone with the link can join the trip.</p>
            <input readOnly value={inviteUrl} style={{ width: '100%', padding: '0.5rem' }} />
            <button type="button" className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => { navigator.clipboard?.writeText(inviteUrl); }}>Copy</button>
            <button type="button" className="btn btn-ghost" onClick={() => setInviteOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {leaveConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setLeaveConfirm(false)}>
          <div className="card" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Leave trip?</h3>
            <p>You will no longer have access to this trip.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-danger" onClick={handleLeave}>Leave</button>
              <button type="button" className="btn btn-ghost" onClick={() => setLeaveConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDeleteConfirm(false)}>
          <div className="card" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Delete trip?</h3>
            <p>This cannot be undone. All itinerary, announcements, and data will be removed.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-danger" onClick={handleDeleteTrip}>Delete trip</button>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
