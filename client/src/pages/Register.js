// pages/Register.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

// Password strength evaluator
const getStrength = (pw) => {
  if (!pw) return { label: '', score: 0, color: '#e0e0e0', width: '0%' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { label: 'Too short', color: '#e53935', width: '20%' },
    { label: 'Weak', color: '#f4511e', width: '40%' },
    { label: 'Fair', color: '#fb8c00', width: '65%' },
    { label: 'Good', color: '#43a047', width: '85%' },
    { label: 'Strong', color: '#2e7d32', width: '100%' },
  ];
  return { ...levels[score], score };
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '2rem 1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: '#ffffff',
    padding: '2.5rem 2.2rem',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '460px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.8rem',
  },
  logoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '54px',
    height: '54px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)',
    color: '#fff',
    fontSize: '1.6rem',
    marginBottom: '0.75rem',
    boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)',
  },
  appTitle: {
    margin: '0 0 0.35rem',
    color: '#1a202c',
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  subtitle: {
    margin: 0,
    color: '#718096',
    fontSize: '0.95rem',
  },
  formGroup: {
    marginBottom: '1.2rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontWeight: '600',
    color: '#374151',
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
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    background: '#ffffff',
    cursor: 'pointer',
    outline: 'none',
  },
  inputError: {
    borderColor: '#e53935',
  },
  errorText: {
    color: '#e53935',
    fontSize: '0.8rem',
    marginTop: '0.3rem',
    display: 'block',
  },
  strengthContainer: {
    marginTop: '0.5rem',
  },
  strengthTrack: {
    height: '5px',
    background: '#edf2f7',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  strengthLabel: {
    fontSize: '0.78rem',
    marginTop: '0.25rem',
    display: 'block',
    fontWeight: '600',
  },
  roleDescription: {
    fontSize: '0.78rem',
    color: '#718096',
    marginTop: '0.35rem',
    display: 'block',
  },
  button: {
    width: '100%',
    padding: '0.85rem',
    background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem',
    boxShadow: '0 4px 12px rgba(26, 115, 232, 0.25)',
    transition: 'transform 0.1s ease',
  },
  buttonDisabled: {
    background: '#93c5fd',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  bannerError: {
    background: '#fef2f2',
    color: '#b91c1c',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.2rem',
    fontSize: '0.88rem',
    border: '1px solid #fecaca',
  },
  securityNote: {
    background: '#f0fdf4',
    color: '#166534',
    padding: '0.65rem 0.9rem',
    borderRadius: '8px',
    fontSize: '0.82rem',
    marginBottom: '1.2rem',
    border: '1px solid #bbf7d0',
    lineHeight: '1.4',
  },
  footer: {
    textAlign: 'center',
    marginTop: '1.6rem',
    fontSize: '0.9rem',
    color: '#6b7280',
  },
  link: {
    color: '#1a73e8',
    fontWeight: '600',
    textDecoration: 'none',
  },
};

const Register = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);

  const roleDescriptions = {
    viewer: 'Viewer: Can view projects and material specs in read-only mode.',
    developer: 'Developer: Can create projects, add material specifications, and collaborate.',
    admin: 'Admin: Full administrative control over all workspace projects and users.',
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Full name is required.';
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please provide a valid email address.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }
    if (!confirm) {
      errs.confirm = 'Please confirm your password.';
    } else if (password !== confirm) {
      errs.confirm = 'Passwords do not match.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      // Auto login user with token and details
      login(data.token, {
        user_id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
      });

      navigate('/dashboard');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoBadge}>⚙️</div>
          <h2 style={styles.appTitle}>Material Optimization DBMS</h2>
          <p style={styles.subtitle}>Create your engineering workspace account</p>
        </div>

        <div style={styles.securityNote}>
          🛡️ <strong>Secure Storage:</strong> Passwords are cryptographically hashed using <strong>bcrypt (10 rounds)</strong> on the server before storage.
        </div>

        {apiError && <div style={styles.bannerError}>{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              style={{ ...styles.input, ...(fieldErrors.name ? styles.inputError : {}) }}
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors(f => ({ ...f, name: '' })); }}
              placeholder="e.g. Alex Mercer"
              required
              autoFocus
            />
            {fieldErrors.name && <span style={styles.errorText}>{fieldErrors.name}</span>}
          </div>

          {/* Email */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              style={{ ...styles.input, ...(fieldErrors.email ? styles.inputError : {}) }}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: '' })); }}
              placeholder="you@company.com"
              required
            />
            {fieldErrors.email && <span style={styles.errorText}>{fieldErrors.email}</span>}
          </div>

          {/* Role */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="role">Workspace Role</label>
            <select
              id="role"
              style={styles.select}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="developer">Developer (Default)</option>
              <option value="admin">Administrator</option>
              <option value="viewer">Viewer (Read-only)</option>
            </select>
            <span style={styles.roleDescription}>{roleDescriptions[role]}</span>
          </div>

          {/* Password */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              style={{ ...styles.input, ...(fieldErrors.password ? styles.inputError : {}) }}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: '' })); }}
              placeholder="Minimum 8 characters"
              required
            />
            {password && (
              <div style={styles.strengthContainer}>
                <div style={styles.strengthTrack}>
                  <div
                    style={{
                      ...styles.strengthFill,
                      width: strength.width,
                      backgroundColor: strength.color,
                    }}
                  />
                </div>
                <span style={{ ...styles.strengthLabel, color: strength.color }}>
                  Password Strength: {strength.label}
                </span>
              </div>
            )}
            {fieldErrors.password && <span style={styles.errorText}>{fieldErrors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              style={{ ...styles.input, ...(fieldErrors.confirm ? styles.inputError : {}) }}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setFieldErrors(f => ({ ...f, confirm: '' })); }}
              placeholder="Re-enter your password"
              required
            />
            {fieldErrors.confirm && <span style={styles.errorText}>{fieldErrors.confirm}</span>}
          </div>

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
