import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api';
import { useAuth } from '../AuthContext';

const verifyInFlight = new Set();

export default function Verify() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = search.get('token');
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing token');
      setStatus('error');
      return;
    }
    if (verifyInFlight.has(token)) return;
    verifyInFlight.add(token);
    authApi.verify(token)
      .then((data) => {
        login(data.token, data.user);
        setStatus('ok');
        const next = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('issavie_login_next') : null;
        if (next) sessionStorage.removeItem('issavie_login_next');
        navigate(next || search.get('next') || '/', { replace: true });
      })
      .catch((err) => {
        verifyInFlight.delete(token);
        setError(err.message || 'Invalid or expired link');
        setStatus('error');
      });
  }, [token, navigate, search, login]);

  if (status === 'ok') {
    return (
      <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>
        Signing you in...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container" style={{ maxWidth: 400, marginTop: '3rem' }}>
        <div className="card card-elevated">
          <h1 style={{ marginTop: 0 }}>Link invalid or expired</h1>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          <a href="/login" className="btn btn-primary">Request a new link</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>
      Verifying...
    </div>
  );
}
