import React, { useEffect, useState } from 'react';
import { albums as albumsApi } from '../api';

export default function TripMemories({ tripId, canEdit }) {
  const [albums, setAlbums] = useState([]);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    albumsApi.list(tripId)
      .then(setAlbums)
      .catch((e) => setError(e.message || 'Failed to load albums'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tripId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    try {
      await albumsApi.add(tripId, url.trim(), label.trim());
      setUrl('');
      setLabel('');
      load();
    } catch (e) {
      setError(e.message || 'Failed to add album');
    }
  };

  const handleDelete = async (id) => {
    try {
      await albumsApi.delete(tripId, id);
      setAlbums((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e.message || 'Failed to delete album');
    }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading memories...</p>;

  return (
    <div className="card" style={{ maxWidth: '42rem' }}>
      <h3 style={{ marginTop: 0 }}>Memories</h3>
      <p className="muted">Save links to shared photo albums for the group.</p>

      {canEdit && (
        <form onSubmit={handleAdd} style={{ marginBottom: '1rem' }}>
          <div className="input-row">
            <input placeholder="Album label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input placeholder="Album URL" value={url} onChange={(e) => setUrl(e.target.value)} required />
            <button type="submit" className="btn btn-primary">Add</button>
          </div>
        </form>
      )}

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {albums.length === 0 ? (
        <p className="muted">No albums yet.</p>
      ) : (
        <ul className="clean-list">
          {albums.map((album) => (
            <li key={album.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <strong>{album.label || 'Album'}</strong>
                <div>
                  <a href={album.url} target="_blank" rel="noopener noreferrer">{album.url}</a>
                </div>
              </div>
              {canEdit && (
                <button type="button" className="btn btn-ghost" onClick={() => handleDelete(album.id)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
