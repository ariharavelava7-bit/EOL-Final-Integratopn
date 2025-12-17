import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FiBell, FiCheck, FiX, FiAlertCircle, FiInfo, FiCheckCircle, FiFilter } from 'react-icons/fi';
import './Notifications.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function Notifications() {
  const { token, notifications, markNotificationAsRead, markAllNotificationsAsRead, refreshNotifications } = useApp();
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, info, warning, success, alert

  useEffect(() => {
    if (token) {
      refreshNotifications();
    }
  }, [token]);

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread' && notif.is_read) return false;
    if (filter === 'read' && !notif.is_read) return false;
    if (typeFilter !== 'all' && notif.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning':
        return <FiAlertCircle size={20} />;
      case 'success':
        return <FiCheckCircle size={20} />;
      case 'info':
        return <FiInfo size={20} />;
      default:
        return <FiBell size={20} />;
    }
  };

  const getNotificationClass = (type) => {
    switch (type) {
      case 'warning':
        return 'notification-warning';
      case 'success':
        return 'notification-success';
      case 'info':
        return 'notification-info';
      case 'alert':
        return 'notification-alert';
      default:
        return 'notification-default';
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>Manage and view all your notifications</p>
        </div>
        {unreadCount > 0 && (
          <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
            <FiCheck size={18} />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="notifications-filters">
        <div className="filter-group">
          <label>Status:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button 
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button 
              className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn ${typeFilter === 'info' ? 'active' : ''}`}
              onClick={() => setTypeFilter('info')}
            >
              Info
            </button>
            <button 
              className={`filter-btn ${typeFilter === 'warning' ? 'active' : ''}`}
              onClick={() => setTypeFilter('warning')}
            >
              Warning
            </button>
            <button 
              className={`filter-btn ${typeFilter === 'success' ? 'active' : ''}`}
              onClick={() => setTypeFilter('success')}
            >
              Success
            </button>
            <button 
              className={`filter-btn ${typeFilter === 'alert' ? 'active' : ''}`}
              onClick={() => setTypeFilter('alert')}
            >
              Alert
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <FiBell size={64} />
            <h3>No notifications</h3>
            <p>
              {filter !== 'all' || typeFilter !== 'all' 
                ? 'No notifications match your filters' 
                : 'You\'re all caught up! No notifications to display.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`notification-card ${getNotificationClass(notif.type)} ${notif.is_read ? 'read' : 'unread'}`}
              onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
            >
              <div className="notification-icon-wrapper">
                {getNotificationIcon(notif.type)}
              </div>
              <div className="notification-content">
                <div className="notification-header">
                  <h3 className="notification-title">{notif.title}</h3>
                  {!notif.is_read && (
                    <span className="unread-badge">New</span>
                  )}
                </div>
                <p className="notification-message">{notif.message}</p>
                <div className="notification-footer">
                  <span className="notification-time">
                    {notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}
                  </span>
                  {notif.link && (
                    <a href={notif.link} className="notification-link" onClick={(e) => e.stopPropagation()}>
                      View Details →
                    </a>
                  )}
                </div>
              </div>
              {!notif.is_read && (
                <button 
                  className="mark-read-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notif.id);
                  }}
                  title="Mark as read"
                >
                  <FiCheck size={18} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications;

