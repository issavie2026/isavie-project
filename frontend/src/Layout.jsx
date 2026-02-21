import React, { useState } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import NotificationsPanel from './NotificationsPanel';

const logoUrl = '/logo.png';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner container">
          <Link to="/" className="brand">
            <img
              src={logoUrl}
              alt="ISSAVIE"
              style={{ height: 28, width: 'auto', display: 'block' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span>ISSAVIE</span>
          </Link>
          <nav className="subnav" aria-label="Primary">
            <NavLink to="/trips" end>
              Trips
            </NavLink>
            <NavLink to="/trips/new">
              New trip
            </NavLink>
          </nav>
          <div className="topbar-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Notifications"
            >
              Notifications
            </button>
            <span className="pill">
              {user?.email}
            </span>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
