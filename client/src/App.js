import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';

// --- Placeholder Components ---
const Login = () => {
  const { login } = useContext(AuthContext);
  
  const handleFakeLogin = () => {
    // In a real app, this data comes from the backend /api/auth/login response
    login('fake-jwt-token-12345', { id: 1, email: 'test@example.com', role: 'admin' });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Login Page</h2>
      <button onClick={handleFakeLogin}>Mock Login</button>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Dashboard (Protected Route)</h2>
      <p>Welcome, {user?.email}!</p>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const Navbar = () => (
  <nav style={{ padding: '1rem', background: '#eee' }}>
    <h1>Material Optimization DBMS</h1>
  </nav>
);

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const { token } = useContext(AuthContext);
  
  // If not authenticated, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// --- Main App Component ---
function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
