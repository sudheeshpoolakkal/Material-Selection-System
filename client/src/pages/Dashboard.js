// pages/Dashboard.js
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const roleBadgeColor = {
  admin: { background: '#d32f2f', color: '#fff' },
  developer: { background: '#1565c0', color: '#fff' },
  viewer: { background: '#388e3c', color: '#fff' },
};

const styles = {
  page: { minHeight: '100vh', background: '#f0f2f5', padding: '2rem' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: { margin: 0, color: '#333' },
  nav: { display: 'flex', gap: '1rem', alignItems: 'center' },
  navLink: {
    textDecoration: 'none',
    color: '#1a73e8',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  logoutBtn: {
    padding: '0.4rem 1rem',
    background: '#e53935',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  welcomeCard: {
    background: '#fff',
    borderRadius: '8px',
    padding: '1.5rem 2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  avatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: '#1a73e8',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    fontWeight: '700',
    flexShrink: 0,
  },
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.78rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginLeft: '0.5rem',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' },
  statCard: {
    background: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  statNumber: { fontSize: '2.5rem', fontWeight: '700', color: '#1a73e8', margin: '0.5rem 0' },
  statLabel: { color: '#777', fontSize: '0.9rem' },
  placeholder: {
    background: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginTop: '1.5rem',
    textAlign: 'center',
    color: '#aaa',
  },
};

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = user?.email?.charAt(0).toUpperCase() || '?';
  const roleStyle = roleBadgeColor[user?.role] || roleBadgeColor.viewer;

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.header}>
        <h1 style={styles.title}>Material Optimization DBMS</h1>
        <div style={styles.nav}>
          <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
          <Link to="/profile" style={styles.navLink}>Profile</Link>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Welcome card */}
      <div style={styles.welcomeCard}>
        <div style={styles.avatar}>{initial}</div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
            Welcome back, {user?.email}
            <span style={{ ...styles.badge, ...roleStyle }}>{user?.role}</span>
          </div>
          <div style={{ color: '#777', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Here is an overview of your workspace.
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={styles.grid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Projects</div>
          <div style={styles.statNumber}>—</div>
          <div style={{ color: '#aaa', fontSize: '0.8rem' }}>Coming soon</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Collaborations</div>
          <div style={styles.statNumber}>—</div>
          <div style={{ color: '#aaa', fontSize: '0.8rem' }}>Coming soon</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Material Specs</div>
          <div style={styles.statNumber}>—</div>
          <div style={{ color: '#aaa', fontSize: '0.8rem' }}>Coming soon</div>
        </div>
      </div>

      {/* Projects placeholder */}
      <div style={styles.placeholder}>
        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📁 No projects yet</p>
        <p style={{ fontSize: '0.9rem' }}>
          Project management features are coming soon. The backend routes and schema are ready.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
