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
    background: '#f0f2f5',
  },
  card: {
    background: '#fff',
    padding: '2.5rem 2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  appTitle: { marginBottom: '0.25rem', textAlign: 'center', color: '#1a73e8', fontSize: '1.3rem', fontWeight: '700' },
  subtitle: { textAlign: 'center', color: '#777', marginBottom: '1.8rem', fontWeight: 'normal', fontSize: '1rem' },
  label: { display: 'block', marginBottom: '0.3rem', fontWeight: '600', color: '#555', fontSize: '0.9rem' },
  input: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    marginBottom: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
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
  error: {
    background: '#fdecea',
    color: '#c0392b',
    padding: '0.6rem 0.8rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    border: '1px solid #f5c6cb',
  },
  footer: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#777' },
  link: { color: '#1a73e8', fontWeight: '600', textDecoration: 'none' },
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
      const { data } = await axios.post('/api/auth/login', { email, password });
      login(data.token, {
        user_id: data.user_id,
        email: data.email,
        role: data.role,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.appTitle}>Material Optimization DBMS</h2>
        <h3 style={styles.subtitle}>Sign in to your account</h3>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label} htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />

          <label style={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
