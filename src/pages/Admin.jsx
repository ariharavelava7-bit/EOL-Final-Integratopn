import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FiUsers, FiUserCheck, FiUserX, FiUserPlus, FiBell, FiSettings,
  FiCheck, FiX, FiAlertCircle, FiActivity, FiSearch, FiFilter,
  FiSend, FiTrash2, FiEdit, FiMoreVertical, FiRefreshCw
} from 'react-icons/fi';
import './Admin.css';

// Use Vite proxy in dev (relative `/api`), or configure `VITE_API_BASE_URL` for prod.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function Admin() {
  const { token, user } = useApp();
  const [activeTab, setActiveTab] = useState('pending');
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    userId: null
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (token && user?.role === 'admin') {
      loadData();
    }
  }, [token, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPendingUsers(),
        loadAllUsers(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadPendingUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/pending-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data);
      }
    } catch (error) {
      console.error('Error loading pending users:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleUserAction = async (userId, action) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, action })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `User ${action}d successfully` });
        await loadData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Action failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
    setActionLoading(null);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) {
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'User deleted successfully' });
        await loadData();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Delete failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
    setActionLoading(null);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSendNotification = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/notifications/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          notification_type: notification.type
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Notification sent successfully' });
        setShowNotificationModal(false);
        setNotification({ title: '', message: '', type: 'info', userId: null });
      } else {
        setMessage({ type: 'error', text: 'Failed to send notification' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Check if user is admin - render access denied after hooks
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-unauthorized">
        <FiAlertCircle size={48} />
        <h2>Access Denied</h2>
        <p>You don't have permission to access the admin panel.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'pending', label: 'Pending Approvals', icon: FiUserPlus, count: pendingUsers.length },
    { id: 'users', label: 'All Users', icon: FiUsers, count: users.length },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'stats', label: 'Statistics', icon: FiActivity }
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Admin Panel</h1>
          <p className="admin-subtitle">Manage users, notifications, and system settings</p>
        </div>
        <button className="refresh-btn" onClick={loadData} disabled={loading}>
          <FiRefreshCw className={loading ? 'spin' : ''} size={18} />
          Refresh
        </button>
      </div>

      {message.text && (
        <div className={`admin-message ${message.type}`}>
          {message.type === 'success' ? <FiCheck size={18} /> : <FiAlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon users-icon">
            <FiUsers size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats?.users?.total || 0}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending-icon">
            <FiUserPlus size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats?.users?.pending || 0}</span>
            <span className="stat-label">Pending Approval</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active-icon">
            <FiUserCheck size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats?.users?.active_this_week || 0}</span>
            <span className="stat-label">Active This Week</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon activity-icon">
            <FiActivity size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats?.activity?.total_searches || 0}</span>
            <span className="stat-label">Total Searches</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="tab-badge">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="admin-content">
        {loading ? (
          <div className="loading-state">
            <FiRefreshCw className="spin" size={32} />
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'pending' && (
              <div className="pending-section">
                <h2>Pending User Approvals</h2>
                {pendingUsers.length === 0 ? (
                  <div className="empty-state">
                    <FiUserCheck size={48} />
                    <h3>No pending approvals</h3>
                    <p>All user requests have been processed</p>
                  </div>
                ) : (
                  <div className="users-table-container">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Username</th>
                          <th>Department</th>
                          <th>Requested</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingUsers.map(u => (
                          <tr key={u.id}>
                            <td className="user-name">{u.full_name}</td>
                            <td>{u.email}</td>
                            <td>@{u.username}</td>
                            <td>{u.department || '-'}</td>
                            <td>{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="actions-cell">
                              <button 
                                className="action-btn approve-btn"
                                onClick={() => handleUserAction(u.id, 'approve')}
                                disabled={actionLoading === u.id}
                              >
                                <FiCheck size={16} />
                                Approve
                              </button>
                              <button 
                                className="action-btn reject-btn"
                                onClick={() => handleUserAction(u.id, 'reject')}
                                disabled={actionLoading === u.id}
                              >
                                <FiX size={16} />
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="users-section">
                <div className="users-header">
                  <h2>All Users</h2>
                  <div className="search-box">
                    <FiSearch size={18} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id}>
                          <td className="user-name">
                            {u.full_name}
                            <span className="username">@{u.username}</span>
                          </td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`role-badge role-${u.role}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge status-${u.status}`}>
                              {u.status}
                            </span>
                          </td>
                          <td>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                          <td className="actions-cell">
                            {u.status === 'approved' && u.role !== 'admin' && (
                              <button 
                                className="action-btn suspend-btn"
                                onClick={() => handleUserAction(u.id, 'suspend')}
                                disabled={actionLoading === u.id}
                                title="Suspend User"
                              >
                                <FiUserX size={16} />
                              </button>
                            )}
                            {u.status === 'suspended' && (
                              <button 
                                className="action-btn approve-btn"
                                onClick={() => handleUserAction(u.id, 'approve')}
                                disabled={actionLoading === u.id}
                                title="Reactivate User"
                              >
                                <FiUserCheck size={16} />
                              </button>
                            )}
                            <button 
                              className="action-btn notify-btn"
                              onClick={() => {
                                setNotification({ ...notification, userId: u.id });
                                setShowNotificationModal(true);
                              }}
                              title="Send Notification"
                            >
                              <FiBell size={16} />
                            </button>
                            {u.id !== user.id && u.role !== 'admin' && (
                              <button 
                                className="action-btn delete-btn"
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={actionLoading === u.id}
                                title="Delete User"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="notifications-section">
                <div className="notifications-header">
                  <h2>Send Notifications</h2>
                  <button 
                    className="send-all-btn"
                    onClick={() => {
                      setNotification({ title: '', message: '', type: 'info', userId: null });
                      setShowNotificationModal(true);
                    }}
                  >
                    <FiSend size={18} />
                    Send to All Users
                  </button>
                </div>
                <div className="notification-form-container">
                  <div className="notification-types">
                    <h3>Quick Send</h3>
                    <div className="type-cards">
                      <div className="type-card info" onClick={() => {
                        setNotification({ title: 'Information', message: '', type: 'info', userId: null });
                        setShowNotificationModal(true);
                      }}>
                        <FiBell size={24} />
                        <span>Info</span>
                      </div>
                      <div className="type-card warning" onClick={() => {
                        setNotification({ title: 'Warning', message: '', type: 'warning', userId: null });
                        setShowNotificationModal(true);
                      }}>
                        <FiAlertCircle size={24} />
                        <span>Warning</span>
                      </div>
                      <div className="type-card success" onClick={() => {
                        setNotification({ title: 'Success', message: '', type: 'success', userId: null });
                        setShowNotificationModal(true);
                      }}>
                        <FiCheck size={24} />
                        <span>Success</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="stats-section">
                <h2>System Statistics</h2>
                <div className="stats-grid">
                  <div className="stat-block">
                    <h3>User Statistics</h3>
                    <div className="stat-rows">
                      <div className="stat-row">
                        <span>Total Users</span>
                        <span>{stats?.users?.total || 0}</span>
                      </div>
                      <div className="stat-row">
                        <span>Approved Users</span>
                        <span>{stats?.users?.approved || 0}</span>
                      </div>
                      <div className="stat-row">
                        <span>Pending Approval</span>
                        <span>{stats?.users?.pending || 0}</span>
                      </div>
                      <div className="stat-row">
                        <span>Active This Week</span>
                        <span>{stats?.users?.active_this_week || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="stat-block">
                    <h3>Activity Statistics</h3>
                    <div className="stat-rows">
                      <div className="stat-row">
                        <span>Total Searches</span>
                        <span>{stats?.activity?.total_searches || 0}</span>
                      </div>
                      <div className="stat-row">
                        <span>Total Reports</span>
                        <span>{stats?.activity?.total_reports || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="stat-block wide">
                    <h3>Recent Searches</h3>
                    <div className="recent-list">
                      {stats?.recent_searches?.length > 0 ? (
                        stats.recent_searches.map((s, idx) => (
                          <div key={idx} className="recent-item">
                            <span className="part-num">{s.part_number}</span>
                            <span className="time">{new Date(s.searched_at).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="no-data">No recent searches</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Notification</h3>
              <button className="close-btn" onClick={() => setShowNotificationModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Recipient</label>
                <select
                  value={notification.userId || ''}
                  onChange={(e) => setNotification({ 
                    ...notification, 
                    userId: e.target.value ? parseInt(e.target.value) : null 
                  })}
                >
                  <option value="">All Users</option>
                  {users.filter(u => u.status === 'approved').map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={notification.type}
                  onChange={(e) => setNotification({ ...notification, type: e.target.value })}
                >
                  <option value="info">Information</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="alert">Alert</option>
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Notification title"
                  value={notification.title}
                  onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  placeholder="Notification message"
                  value={notification.message}
                  onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowNotificationModal(false)}>
                Cancel
              </button>
              <button 
                className="send-btn" 
                onClick={handleSendNotification}
                disabled={!notification.title || !notification.message}
              >
                <FiSend size={16} />
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
