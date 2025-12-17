import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FiUser, FiSave, FiLock, FiCheck, FiAlertCircle } from 'react-icons/fi';
import './Pages.css';

// Use Vite proxy in dev (relative `/api`), or configure `VITE_API_BASE_URL` for prod.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function Profile() {
  const { user, token, loadUserData } = useApp();
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState({ searches: 0, reports: 0 });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        department: user.department || '',
        phone: user.phone || ''
      });
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      // Get search count
      const historyRes = await fetch(`${API_BASE_URL}/api/search-history?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const data = await historyRes.json();
        setStats(prev => ({ ...prev, searches: data.length }));
      }

      // Get reports count
      const reportsRes = await fetch(`${API_BASE_URL}/api/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setStats(prev => ({ ...prev, reports: data.length }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        loadUserData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }

    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }

    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <div className="page-container profile-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1>
            <FiUser className="page-icon" />
            Profile
          </h1>
          <p>Manage your account settings</p>
        </div>
      </div>

      {message.text && (
        <div className={`profile-message ${message.type}`}>
          {message.type === 'success' ? <FiCheck size={18} /> : <FiAlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            {getInitials(user.full_name)}
          </div>
          <h2>{user.full_name}</h2>
          <span className="role-badge">{user.role}</span>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{user.email}</p>
          
          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-value">{stats.searches}</div>
              <div className="stat-label">Searches</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.reports}</div>
              <div className="stat-label">Reports</div>
            </div>
          </div>
        </div>

        {/* Edit Forms */}
        <div className="profile-forms">
          {/* Edit Profile Form */}
          <div className="profile-form">
            <h2>Edit Profile</h2>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., Engineering"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., +91 9876543210"
                  />
                </div>
              </div>
              <button type="submit" className="save-btn" disabled={loading}>
                <FiSave size={16} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="profile-form" style={{ marginTop: 24 }}>
            <h2>Change Password</h2>
            <form onSubmit={handleChangePassword}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="save-btn" disabled={loading}>
                <FiLock size={16} />
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
