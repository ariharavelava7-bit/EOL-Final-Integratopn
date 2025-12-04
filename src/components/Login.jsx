import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('Harish M');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate login (replace with actual authentication)
    setTimeout(() => {
      if (username && password) {
        let displayName = username.trim();
        if (!displayName) {
          displayName = 'Harish M';
        } else if (displayName.toLowerCase() === 'harish') {
          displayName = 'Harish M';
        }

        // Store auth state (in real app, use proper auth system)
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', displayName);
        navigate('/dashboard');
      } else {
        setError('Please enter both username and password');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-badge">
            <img src="/LT.png" alt="L&T Logo" className="login-logo-img" />
          </div>
          <h1>L&T-CORe</h1>
          <p className="login-subtitle">Component Obsolescence & Resilience Engine</p>
          <p className="login-description">
            An intelligent system that automates FFF analysis to prevent costly line-down situations 
            and redesigns by managing End-of-Life component risks.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="login-footer-text">
            <p>Demo credentials are pre-filled for Harish M.</p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
