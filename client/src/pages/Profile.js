// pages/Profile.js
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const roleBadgeColor = {
  admin: { background: '#ef4444', color: '#ffffff' },
  developer: { background: '#3b82f6', color: '#ffffff' },
  viewer: { background: '#10b981', color: '#ffffff' },
};

const getStrength = (pw) => {
  if (!pw) return { label: '', color: '#e0e0e0', width: '0%' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { label: 'Too short', color: '#ef4444', width: '20%' },
    { label: 'Weak', color: '#f97316', width: '40%' },
    { label: 'Fair', color: '#eab308', width: '65%' },
    { label: 'Good', color: '#22c55e', width: '85%' },
    { label: 'Strong', color: '#15803d', width: '100%' },
  ];
  return levels[score];
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '2rem 1.5rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    maxWidth: '900px',
    margin: '0 auto 2.5rem',
    padding: '0 0.5rem',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  brandIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  title: {
    margin: 0,
    color: '#0f172a',
    fontSize: '1.35rem',
    fontWeight: '700',
  },
  nav: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'center',
  },
  navLink: {
    textDecoration: 'none',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '0.92rem',
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    transition: 'color 0.2s',
  },
  navLinkActive: {
    color: '#1a73e8',
    background: '#eff6ff',
  },
  logoutBtn: {
    padding: '0.45rem 1.1rem',
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1.6fr',
    gap: '2rem',
  },
  userCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    height: 'fit-content',
  },
  avatar: {
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.4rem',
    fontWeight: '700',
    marginBottom: '1rem',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
  },
  userName: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 0.25rem',
  },
  userEmail: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: '0 0 0.75rem',
  },
  badge: {
    display: 'inline-block',
    padding: '0.3rem 0.85rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  infoList: {
    marginTop: '1.8rem',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '1.2rem',
    textAlign: 'left',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.65rem 0',
    fontSize: '0.88rem',
    borderBottom: '1px solid #f8fafc',
  },
  infoLabel: {
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    color: '#0f172a',
    fontWeight: '600',
  },
  formsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  sectionCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    margin: '0 0 0.4rem',
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionDesc: {
    margin: '0 0 1.5rem',
    fontSize: '0.88rem',
    color: '#64748b',
  },
  formGroup: {
    marginBottom: '1.2rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontWeight: '600',
    color: '#334155',
    fontSize: '0.88rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#ffffff',
  },
  inputDisabled: {
    background: '#f1f5f9',
    color: '#94a3b8',
    cursor: 'not-allowed',
  },
  button: {
    padding: '0.75rem 1.5rem',
    background: '#1a73e8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(26, 115, 232, 0.2)',
    transition: 'background 0.2s',
  },
  buttonDisabled: {
    background: '#93c5fd',
    cursor: 'not-allowed',
  },
  successBanner: {
    background: '#f0fdf4',
    color: '#166534',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.2rem',
    fontSize: '0.88rem',
    border: '1px solid #bbf7d0',
  },
  errorBanner: {
    background: '#fef2f2',
    color: '#b91c1c',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.2rem',
    fontSize: '0.88rem',
    border: '1px solid #fecaca',
  },
  strengthTrack: {
    height: '4px',
    background: '#edf2f7',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '0.4rem',
  },
  strengthFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
};

const Profile = () => {
  const { user, token, updateUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Personal Info Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordStrength = getStrength(newPassword);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Submit Profile Changes
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileLoading(true);

    try {
      const { data } = await axios.put(
        '/api/auth/profile',
        { name, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      updateUser({
        name: data.user.name,
        email: data.user.email,
      });

      setProfileSuccess(data.message || 'Profile information updated successfully!');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { data } = await axios.put(
        '/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPasswordSuccess(data.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const roleStyle = roleBadgeColor[user?.role] || roleBadgeColor.viewer;

  return (
    <div style={styles.page}>
      {/* Navigation Header */}
      <div style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>⚙️</div>
          <h1 style={styles.title}>Material Optimization DBMS</h1>
        </div>
        <div style={styles.nav}>
          <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
          <Link to="/profile" style={{ ...styles.navLink, ...styles.navLinkActive }}>Profile</Link>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.container}>
        {/* Left Column: User Summary Card */}
        <div style={styles.userCard}>
          <div style={styles.avatar}>{initial}</div>
          <h2 style={styles.userName}>{displayName}</h2>
          <p style={styles.userEmail}>{user?.email}</p>
          <span style={{ ...styles.badge, ...roleStyle }}>{user?.role}</span>

          <div style={styles.infoList}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>User ID</span>
              <span style={styles.infoValue}>#{user?.user_id}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Account Status</span>
              <span style={{ ...styles.infoValue, color: '#16a34a' }}>● Active</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Permissions</span>
              <span style={styles.infoValue}>
                {user?.role === 'admin' ? 'Full Control' : user?.role === 'developer' ? 'Read / Write' : 'Read Only'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Account Management Forms */}
        <div style={styles.formsColumn}>
          {/* Section 1: Profile Details */}
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Account Details</h3>
            <p style={styles.sectionDesc}>Update your display name and registered email address.</p>

            {profileSuccess && <div style={styles.successBanner}>✓ {profileSuccess}</div>}
            {profileError && <div style={styles.errorBanner}>{profileError}</div>}

            <form onSubmit={handleProfileSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  type="text"
                  style={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="profile-email">Email Address</label>
                <input
                  id="profile-email"
                  type="email"
                  style={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <input
                  type="text"
                  style={{ ...styles.input, ...styles.inputDisabled }}
                  value={user?.role?.toUpperCase() || ''}
                  disabled
                />
              </div>

              <button
                type="submit"
                style={{ ...styles.button, ...(profileLoading ? styles.buttonDisabled : {}) }}
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          {/* Section 2: Security & Password */}
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Change Password</h3>
            <p style={styles.sectionDesc}>Ensure your workspace account is secured with a strong password.</p>

            {passwordSuccess && <div style={styles.successBanner}>✓ {passwordSuccess}</div>}
            {passwordError && <div style={styles.errorBanner}>{passwordError}</div>}

            <form onSubmit={handlePasswordSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="current-pw">Current Password</label>
                <input
                  id="current-pw"
                  type="password"
                  style={styles.input}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="new-pw">New Password</label>
                <input
                  id="new-pw"
                  type="password"
                  style={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
                {newPassword && (
                  <div style={styles.strengthTrack}>
                    <div
                      style={{
                        ...styles.strengthFill,
                        width: passwordStrength.width,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="confirm-pw">Confirm New Password</label>
                <input
                  id="confirm-pw"
                  type="password"
                  style={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <button
                type="submit"
                style={{ ...styles.button, ...(passwordLoading ? styles.buttonDisabled : {}) }}
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
