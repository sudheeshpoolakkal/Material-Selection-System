// pages/Login.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

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
    padding: '2.8rem 2.2rem',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '420px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
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
    marginTop: '0.8rem',
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
  footer: {
    textAlign: 'center',
    marginTop: '1.8rem',
    fontSize: '0.9rem',
    color: '#6b7280',
  },
  link: {
    color: '#1a73e8',
    fontWeight: '600',
    textDecoration: 'none',
  },
};

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      login(data.token, {
        user_id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
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
          <p style={styles.subtitle}>Sign in to your engineering workspace</p>
        </div>

        {error && <div style={styles.bannerError}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your account password"
              required
            />
          </div>

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Create an Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
