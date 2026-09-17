// pages/Profile.js
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
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    maxWidth: '500px',
    margin: '0 auto',
  },
  avatarWrap: { textAlign: 'center', marginBottom: '1.5rem' },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#1a73e8',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
  },
  emailText: { fontSize: '1.1rem', fontWeight: '600', color: '#333' },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '0.4rem',
  },
  divider: { borderTop: '1px solid #eee', margin: '1.5rem 0' },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.6rem 0',
    fontSize: '0.95rem',
    borderBottom: '1px solid #f0f0f0',
  },
  rowLabel: { color: '#888', fontWeight: '500' },
  rowValue: { color: '#333', fontWeight: '600' },
};

const Profile = () => {
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
          <Link to="/profile" style={{ ...styles.navLink, borderBottom: '2px solid #1a73e8' }}>Profile</Link>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Profile card */}
      <div style={styles.card}>
        <div style={styles.avatarWrap}>
          <div style={styles.avatar}>{initial}</div>
          <div style={styles.emailText}>{user?.email}</div>
          <div>
            <span style={{ ...styles.badge, ...roleStyle }}>{user?.role}</span>
          </div>
        </div>

        <div style={styles.divider} />

        <div>
          <div style={styles.row}>
            <span style={styles.rowLabel}>User ID</span>
            <span style={styles.rowValue}>#{user?.user_id ?? '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.rowLabel}>Email</span>
            <span style={styles.rowValue}>{user?.email ?? '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.rowLabel}>Role</span>
            <span style={styles.rowValue}>{user?.role ?? '—'}</span>
          </div>
          <div style={{ ...styles.row, borderBottom: 'none' }}>
            <span style={styles.rowLabel}>Session</span>
            <span style={{ ...styles.rowValue, color: '#388e3c' }}>Active</span>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.85rem' }}>
          Account management features (edit profile, change password) are coming soon.
        </div>
      </div>
    </div>
  );
};

export default Profile;
