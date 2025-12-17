import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import './Login.css';

function Login({ onLogin }) {
  const { login, register } = useApp();

  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Signup form state (simplified for enterprise flow)
  const [signupForm, setSignupForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await login(loginForm.email, loginForm.password);

    if (result.success) {
      onLogin();
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!signupForm.full_name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    // Derive a reasonable username for the backend
    const derivedUsername =
      signupForm.email.split('@')[0] ||
      signupForm.full_name.trim().replace(/\s+/g, '.').toLowerCase();

    const result = await register({
      email: signupForm.email,
      username: derivedUsername,
      full_name: signupForm.full_name,
      password: signupForm.password,
      department: null,
      phone: null
    });

    if (result.success) {
      setSuccess(result.message);
      setIsSignup(false);
      setSignupForm({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left side - Branding */}
        <div className="login-branding">
          <div className="brand-content">
            <div className="logo-badge">
              <img src="/LT.png" alt="L&T Logo" />
            </div>
            <h1 className="brand-title">L&T CORe</h1>
            <p className="brand-subtitle">Component Obsolescence & Resilience Engine</p>
            <div className="brand-features">
              <div className="feature-item">
                <span>Real-time component lifecycle tracking</span>
              </div>
              <div className="feature-item">
                <span>Alternate part recommendations</span>
              </div>
              <div className="feature-item">
                <span>Compliance and risk management</span>
              </div>
              <div className="feature-item">
                <span>Detailed comparison reports</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="login-form-section">
          <div className="form-container">
            <div className="form-header">
              <h2>{isSignup ? 'Request Access' : 'Welcome Back'}</h2>
              <p>
                {isSignup
                  ? 'Create your CORe account and wait for admin approval.'
                  : 'Sign in to continue to CORe'}
              </p>
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <span>{success}</span>
              </div>
            )}

            {!isSignup ? (
              <>
                {/* Login Form */}
                <form onSubmit={handleLoginSubmit} className="auth-form">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="you@company.com"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                      required
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                <div className="form-footer">
                  <p>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => {
                        setIsSignup(true);
                        setError('');
                        setSuccess('');
                      }}
                    >
                      Request access
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Signup / Request Access Form */}
                <form onSubmit={handleSignupSubmit} className="auth-form">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Jane Doe"
                      value={signupForm.full_name}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, full_name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Work Email</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="you@company.com"
                      value={signupForm.email}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Min. 6 characters"
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, password: e.target.value })
                      }
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Re-enter password"
                      value={signupForm.confirmPassword}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          confirmPassword: e.target.value
                        })
                      }
                      required
                      minLength={6}
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Submitting…' : 'Submit Request'}
                  </button>
                </form>

                <div className="form-footer">
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => {
                        setIsSignup(false);
                        setError('');
                        setSuccess('');
                      }}
                    >
                      Back to sign in
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
