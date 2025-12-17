import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiMoon, FiSun, FiBell, FiChevronDown, FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import './Header.css';

function Header({ searchValue, onSearchChange, onSearch, onNavigate }) {
  const { 
    theme,
    toggleTheme,
    user, 
    logout,
    notifications, 
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    savedSearches,
    saveSearch
  } = useApp();

  // Defensive: prevent white-screen if any API ever returns an unexpected shape.
  const safeSavedSearches = Array.isArray(savedSearches) ? savedSearches : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const darkMode = theme === 'dark';

  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const savedSearchRef = useRef(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (savedSearchRef.current && !savedSearchRef.current.contains(e.target)) {
        setShowSavedSearches(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      // Save search with same name and part number
      saveSearch(searchValue.trim(), searchValue.trim());
      onSearch();
    }
  };

  const handleSavedSearchClick = (query) => {
    onSearchChange(query);
    setShowSavedSearches(false);
    setTimeout(() => onSearch(), 100);
  };

  const handleLogout = () => {
    logout();
    onNavigate('logout');
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-logo" onClick={() => onNavigate('dashboard')}>
          <div className="logo-circle">
            <img src="/LT.png" alt="L&T Logo" className="header-logo-img" />
          </div>
          <div className="brand-text">
            <div className="brand-name">L&T-CORe</div>
            <div className="brand-tagline">Component Obsolescence & Resilience Engine</div>
          </div>
        </div>
      </div>

      <div className="header-center">
        <form onSubmit={handleSearchSubmit} className="header-search">
          <FiSearch className="search-icon-header" size={20} />
          <input
            type="text"
            placeholder="Search Parts"
            className="header-search-input"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </form>
        
        <div className="saved-searches-container" ref={savedSearchRef}>
          <button 
            className="saved-searches-btn"
            onClick={() => setShowSavedSearches(!showSavedSearches)}
          >
            Saved Searches
            <FiChevronDown size={16} className={showSavedSearches ? 'rotate' : ''} />
          </button>
          
          {showSavedSearches && (
            <div className="dropdown-menu saved-searches-dropdown">
              <div className="dropdown-header">Recent Searches</div>
              {safeSavedSearches.length > 0 ? (
                safeSavedSearches.map((item) => {
                  const label = item.name || item.part_number;
                  const value = item.part_number || item.name;
                  return (
                  <button 
                    key={item.id} 
                    className="dropdown-item"
                    onClick={() => handleSavedSearchClick(value)}
                  >
                    <FiSearch size={14} />
                    {label}
                  </button>
                  );
                })
              ) : (
                <div className="dropdown-empty">No saved searches</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <button 
          className="header-icon-btn" 
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
          onClick={toggleTheme}
        >
          {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>
        
        <div className="notifications-container" ref={notifRef}>
              <button 
                className="header-icon-btn header-alerts" 
                title="Notifications"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="alert-badge">{unreadCount}</span>
                )}
              </button>
          
          {showNotifications && (
            <div className="dropdown-menu notifications-dropdown">
              <div className="dropdown-header">
                Notifications
                {unreadCount > 0 && (
                  <button 
                    className="mark-all-read"
                    onClick={markAllNotificationsAsRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {safeNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
                  onClick={() => markNotificationAsRead(notif.id)}
                >
                  <div className={`notification-icon notif-${notif.type}`}>
                    {notif.type === 'warning' && '⚠️'}
                    {notif.type === 'info' && 'ℹ️'}
                    {notif.type === 'success' && '✅'}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">
                      {notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
              ))}
              <button 
                className="dropdown-footer-btn"
                onClick={() => {
                  setShowNotifications(false);
                  onNavigate('notifications');
                }}
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
        
        <button className="header-icon-btn" title="Help">?</button>
        
        <div className="user-menu-container" ref={userMenuRef}>
          <button 
            className="user-profile"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <span className="user-initials">
              {user?.full_name
                ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : 'U'}
            </span>
            <span className="user-name">{user?.full_name || 'User'}</span>
            <FiChevronDown size={14} className={showUserMenu ? 'rotate' : ''} />
          </button>
          
          {showUserMenu && (
            <div className="dropdown-menu user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-avatar">
                  {user?.full_name
                    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : 'U'}
                </div>
                <div className="user-info">
                  <div className="user-fullname">{user?.full_name || 'User'}</div>
                  <div className="user-email">{user?.email || ''}</div>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button 
                className="dropdown-item"
                onClick={() => { setShowUserMenu(false); onNavigate('profile'); }}
              >
                <FiUser size={16} />
                Edit Profile
              </button>
              <button 
                className="dropdown-item"
                onClick={() => { setShowUserMenu(false); onNavigate('settings'); }}
              >
                <FiSettings size={16} />
                Settings
              </button>
              <div className="dropdown-divider"></div>
              <button 
                className="dropdown-item dropdown-item-danger"
                onClick={handleLogout}
              >
                <FiLogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
