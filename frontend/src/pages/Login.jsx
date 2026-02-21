import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auth as authApi } from '../api';

const NEXT_KEY = 'issavie_login_next';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search] = useSearchParams();

  React.useEffect(() => {
    const next = search.get('next');
    if (next) sessionStorage.setItem(NEXT_KEY, next);
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.magicLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-shell">
        <div className="auth-card card">
          <p className="eyebrow">Check your inbox</p>
          <h1 style={{ marginTop: 0 }}>Magic link sent</h1>
          <p>We sent a sign-in link to <strong>{email}</strong>.</p>
          <p className="muted">Open the link from your email within 15 minutes.</p>
          <button type="button" className="btn btn-secondary" onClick={() => { setSent(false); setEmail(''); }}>
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <section className="auth-spotlight">
        <p className="eyebrow">ISSAVIE</p>
        <h1>Calm group travel planning.</h1>
        <p>One place for itinerary, updates, and decisions. No booking clutter.</p>
      </section>
      <div className="auth-card card">
        <h2 style={{ marginTop: 0 }}>Sign in</h2>
        <p className="muted">Enter your email and we will send a magic link.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
      </div>
    </div>
  );
}
