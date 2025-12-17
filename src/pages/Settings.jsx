import React, { useState } from 'react';
import { FiSave, FiMoon, FiSun, FiBell, FiDatabase, FiKey, FiGlobe } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import './Pages.css';

function Settings() {
  const { theme, toggleTheme } = useApp();
  const darkMode = theme === 'dark';
  const [activeSection, setActiveSection] = useState('general');
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    obsolescenceAlerts: true,
    priceChangeAlerts: true,
    autoRefresh: true,
    refreshInterval: 30,
    defaultSearchLimit: 10,
    cacheExpiry: 24,
    apiTimeout: 30,
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const sections = [
    { id: 'general', label: 'General', icon: FiGlobe },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'data', label: 'Data & Cache', icon: FiDatabase },
    { id: 'api', label: 'API Settings', icon: FiKey },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your application preferences</p>
        </div>
        <button className="btn-primary">
          <FiSave size={18} />
          Save Changes
        </button>
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
        </div>

        <div className="settings-content">
          {activeSection === 'general' && (
            <div className="settings-section">
              <h2>General Settings</h2>
              
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Dark Mode</div>
                  <div className="setting-description">Enable dark theme for better visibility in low light</div>
                </div>
                <button 
                  className={`toggle-btn ${darkMode ? 'toggle-active' : ''}`}
                  onClick={toggleTheme}
                >
                  <span className="toggle-slider"></span>
                  {darkMode ? <FiMoon size={14} /> : <FiSun size={14} />}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Auto Refresh Data</div>
                  <div className="setting-description">Automatically refresh part data at regular intervals</div>
                </div>
                <button 
                  className={`toggle-btn ${settings.autoRefresh ? 'toggle-active' : ''}`}
                  onClick={() => handleToggle('autoRefresh')}
                >
                  <span className="toggle-slider"></span>
                </button>
              </div>

              {settings.autoRefresh && (
                <div className="setting-item setting-sub-item">
                  <div className="setting-info">
                    <div className="setting-label">Refresh Interval (minutes)</div>
                  </div>
                  <select 
                    value={settings.refreshInterval}
                    onChange={(e) => handleChange('refreshInterval', e.target.value)}
                    className="setting-select"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
              )}

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Default Search Results</div>
                  <div className="setting-description">Number of results to show per search</div>
                </div>
                <select 
                  value={settings.defaultSearchLimit}
                  onChange={(e) => handleChange('defaultSearchLimit', e.target.value)}
                  className="setting-select"
                >
                  <option value={5}>5 results</option>
                  <option value={10}>10 results</option>
                  <option value={20}>20 results</option>
                  <option value={50}>50 results</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Email Notifications</div>
                  <div className="setting-description">Receive important alerts via email</div>
                </div>
                <button 
                  className={`toggle-btn ${settings.emailNotifications ? 'toggle-active' : ''}`}
                  onClick={() => handleToggle('emailNotifications')}
                >
                  <span className="toggle-slider"></span>
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Push Notifications</div>
                  <div className="setting-description">Enable browser push notifications</div>
                </div>
                <button 
                  className={`toggle-btn ${settings.pushNotifications ? 'toggle-active' : ''}`}
                  onClick={() => handleToggle('pushNotifications')}
                >
                  <span className="toggle-slider"></span>
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Obsolescence Alerts</div>
                  <div className="setting-description">Get notified when parts become obsolete</div>
                </div>
                <button 
                  className={`toggle-btn ${settings.obsolescenceAlerts ? 'toggle-active' : ''}`}
                  onClick={() => handleToggle('obsolescenceAlerts')}
                >
                  <span className="toggle-slider"></span>
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Price Change Alerts</div>
                  <div className="setting-description">Get notified on significant price changes</div>
                </div>
                <button 
                  className={`toggle-btn ${settings.priceChangeAlerts ? 'toggle-active' : ''}`}
                  onClick={() => handleToggle('priceChangeAlerts')}
                >
                  <span className="toggle-slider"></span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="settings-section">
              <h2>Data & Cache Settings</h2>
              
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Cache Expiry (hours)</div>
                  <div className="setting-description">How long to keep cached data before refreshing</div>
                </div>
                <select 
                  value={settings.cacheExpiry}
                  onChange={(e) => handleChange('cacheExpiry', e.target.value)}
                  className="setting-select"
                >
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={168}>1 week</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Clear Cache</div>
                  <div className="setting-description">Remove all cached data and start fresh</div>
                </div>
                <button className="btn-danger-outline">Clear Cache</button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Export Data</div>
                  <div className="setting-description">Download all your data as JSON</div>
                </div>
                <button className="btn-secondary-sm">Export</button>
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div className="settings-section">
              <h2>API Configuration</h2>
              
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">API Timeout (seconds)</div>
                  <div className="setting-description">Maximum time to wait for API responses</div>
                </div>
                <select 
                  value={settings.apiTimeout}
                  onChange={(e) => handleChange('apiTimeout', e.target.value)}
                  className="setting-select"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                </select>
              </div>

              <div className="api-status-card">
                <h3>API Status</h3>
                <div className="api-status-list">
                  <div className="api-status-item">
                    <span>Digi-Key API</span>
                    <span className="status-badge status-active">Connected</span>
                  </div>
                  <div className="api-status-item">
                    <span>Octopart/Nexar API</span>
                    <span className="status-badge status-active">Connected</span>
                  </div>
                  <div className="api-status-item">
                    <span>Mouser API</span>
                    <span className="status-badge status-active">Connected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
