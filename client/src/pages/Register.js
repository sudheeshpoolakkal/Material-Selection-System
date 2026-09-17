// pages/Register.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

// Password strength checker
const getStrength = (pw) => {
  if (!pw) return { label: '', color: '#ccc', width: '0%' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Too short', color: '#e53935', width: '15%' },
    { label: 'Weak',      color: '#e53935', width: '25%' },
    { label: 'Fair',      color: '#fb8c00', width: '55%' },
    { label: 'Good',      color: '#43a047', width: '75%' },
    { label: 'Strong',    color: '#1b5e20', width: '100%' },
  ];
  return map[score] || map[0];
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
    padding: '2rem 1rem',
  },
  card: {
    background: '#fff',
    padding: '2.5rem 2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '420px',
  },
  appTitle: { marginBottom: '0.25rem', textAlign: 'center', color: '#1a73e8', fontSize: '1.3rem', fontWeight: '700' },
  subtitle: { textAlign: 'center', color: '#777', marginBottom: '1.8rem', fontWeight: 'normal', fontSize: '1rem' },
  label: { display: 'block', marginBottom: '0.3rem', fontWeight: '600', color: '#555', fontSize: '0.9rem' },
  input: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    marginBottom: '0.25rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  inputError: { border: '1px solid #e53935' },
  select: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    marginBottom: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    background: '#fff',
    cursor: 'pointer',
  },
  fieldError: { color: '#e53935', fontSize: '0.8rem', marginBottom: '0.75rem', display: 'block' },
  strengthBar: {
    height: '4px',
    background: '#eee',
    borderRadius: '2px',
    marginBottom: '0.3rem',
    overflow: 'hidden',
  },
  strengthLabel: { fontSize: '0.78rem', marginBottom: '0.75rem', display: 'block' },
  button: {
    width: '100%',
    padding: '0.75rem',
    background: '#1a73e8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  buttonDisabled: { background: '#a0b9e4', cursor: 'not-allowed' },
  apiError: {
    background: '#fdecea',
    color: '#c0392b',
    padding: '0.6rem 0.8rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    border: '1px solid #f5c6cb',
  },
  roleHint: { fontSize: '0.78rem', color: '#999', marginBottom: '1rem', display: 'block' },
  footer: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#777' },
  link: { color: '#1a73e8', fontWeight: '600', textDecoration: 'none' },
  hashNote: {
    background: '#e8f5e9',
    color: '#2e7d32',
    padding: '0.5rem 0.8rem',
    borderRadius: '4px',
    fontSize: '0.82rem',
    marginBottom: '1.2rem',
    border: '1px solid #c8e6c9',
  },
};

const Register = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [role, setRole]             = useState('viewer');
  const [apiError, setApiError]     = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading]       = useState(false);

  const strength = getStrength(password);

  // Client-side validation
  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email is required.';
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
      // password is sent as plain text over HTTPS — the SERVER hashes it with bcrypt before storing
      const { data } = await axios.post('/api/auth/register', { email, password, role });
      // Backend returns a token on registration — auto-login the user
      login(data.token, {
        user_id: data.user_id,
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
        <h2 style={styles.appTitle}>Material Optimization DBMS</h2>
        <h3 style={styles.subtitle}>Create an account</h3>

        {/* Security note */}
        <div style={styles.hashNote}>
          🔒 Your password is hashed with <strong>bcrypt (10 rounds)</strong> on the server before it is stored. It is never saved in plain text.
        </div>

        {apiError && <div style={styles.apiError}>{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <label style={styles.label} htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            style={{ ...styles.input, ...(fieldErrors.email ? styles.inputError : {}) }}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: '' })); }}
            placeholder="you@example.com"
            required
            autoFocus
          />
          {fieldErrors.email && <span style={styles.fieldError}>{fieldErrors.email}</span>}

          {/* Password */}
          <label style={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            style={{ ...styles.input, ...(fieldErrors.password ? styles.inputError : {}) }}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: '' })); }}
            placeholder="At least 8 characters"
            required
          />
          {/* Strength bar */}
          {password && (
            <>
              <div style={styles.strengthBar}>
                <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'width 0.3s' }} />
              </div>
              <span style={{ ...styles.strengthLabel, color: strength.color }}>
                Strength: {strength.label}
              </span>
            </>
          )}
          {fieldErrors.password && <span style={styles.fieldError}>{fieldErrors.password}</span>}

          {/* Confirm Password */}
          <label style={styles.label} htmlFor="confirm">Confirm Password</label>
          <input
            id="confirm"
            type="password"
            style={{ ...styles.input, ...(fieldErrors.confirm ? styles.inputError : {}), marginBottom: '0.25rem' }}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setFieldErrors(f => ({ ...f, confirm: '' })); }}
            placeholder="Re-enter your password"
            required
          />
          {fieldErrors.confirm && <span style={styles.fieldError}>{fieldErrors.confirm}</span>}

          {/* Role */}
          <label style={{ ...styles.label, marginTop: '0.5rem' }} htmlFor="role">Role</label>
          <select
            id="role"
            style={styles.select}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="viewer">Viewer — read-only access</option>
            <option value="developer">Developer — can edit projects</option>
            <option value="admin">Admin — full access</option>
          </select>

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
