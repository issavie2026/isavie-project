import React, { useEffect, useState } from 'react';
import { polls as pollsApi } from '../api';

export default function TripPolls({ tripId, canEdit }) {
  const [polls, setPolls] = useState([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('single_choice');
  const [optionsText, setOptionsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    pollsApi.list(tripId)
      .then((res) => setPolls(res || []))
      .catch((e) => setError(e.message || 'Failed to load polls'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tripId]);

  const createPoll = async (e) => {
    e.preventDefault();
    const opts = optionsText.split('\n').map((o) => o.trim()).filter(Boolean);
    if (!title.trim() || opts.length < 2) {
      setError('Add a title and at least two options.');
      return;
    }
    setError('');
    try {
      await pollsApi.create(tripId, { title: title.trim(), type, options: opts });
      setTitle('');
      setOptionsText('');
      load();
    } catch (e) {
      setError(e.message || 'Failed to create poll');
    }
  };

  const vote = async (pollId, optionId) => {
    try {
      await pollsApi.vote(tripId, pollId, { optionId });
      load();
    } catch (e) {
      setError(e.message || 'Failed to vote');
    }
  };

  const close = async (pollId) => {
    try {
      await pollsApi.close(tripId, pollId);
      load();
    } catch (e) {
      setError(e.message || 'Failed to close poll');
    }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading polls...</p>;

  return (
    <div className="card" style={{ maxWidth: '42rem' }}>
      <h3 style={{ marginTop: 0 }}>Polls</h3>
      <p className="muted">Quick decisions for the group.</p>

      {canEdit && (
        <form onSubmit={createPoll} style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="single_choice">Single choice</option>
              <option value="multi_choice">Multi choice</option>
            </select>
          </div>
          <div className="form-group">
            <label>Options (one per line)</label>
            <textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={4} />
          </div>
          <button type="submit" className="btn btn-primary">Create poll</button>
        </form>
      )}

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {polls.length === 0 ? (
        <p className="muted">No polls yet.</p>
      ) : (
        <div>
          {polls.map((poll) => (
            <div key={poll.id} className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <strong>{poll.title}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>{poll.status}</div>
                </div>
                {canEdit && poll.status === 'open' && (
                  <button type="button" className="btn btn-ghost" onClick={() => close(poll.id)}>Close</button>
                )}
              </div>
              <ul className="clean-list">
                {(poll.options || []).map((opt) => (
                  <li key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <span>{opt.text}</span>
                    {poll.status === 'open' && (
                      <button type="button" className="btn btn-secondary" onClick={() => vote(poll.id, opt.id)}>
                        Vote
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
