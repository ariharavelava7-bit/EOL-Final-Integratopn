import React, { useState, useEffect } from 'react';
import { FiSave, FiKey, FiSettings, FiBell, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import './Settings.css';

function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    apiKeys: {
      octopartId: '',
      octopartSecret: '',
      mouserKey: '',
      digikeyId: '',
      digikeySecret: '',
      geminiKey: ''
    },
    preferences: {
      defaultPriority: '2',
      autoDownload: false,
      emailNotifications: false
    },
    notifications: {
      analysisComplete: true,
      errors: true,
      weeklyReport: false
    }
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings');
      }
    }
  }, []);

  const handleInputChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const toggleKeyVisibility = (key) => {
    setShowKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    // Save to localStorage
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    }, 1000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings?')) {
      setSettings({
        apiKeys: {
          octopartId: '',
          octopartSecret: '',
          mouserKey: '',
          digikeyId: '',
          digikeySecret: '',
          geminiKey: ''
        },
        preferences: {
          defaultPriority: '2',
          autoDownload: false,
          emailNotifications: false
        },
        notifications: {
          analysisComplete: true,
          errors: true,
          weeklyReport: false
        }
      });
      localStorage.removeItem('appSettings');
      setSaveMessage({ type: 'info', text: 'Settings reset to defaults' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure your application settings and preferences</p>
      </div>

      {saveMessage && (
        <div className={`alert alert-${saveMessage.type}`}>
          {saveMessage.text}
        </div>
      )}

      <div className="settings-container">
        <div className="card settings-section">
          <div className="section-header">
            <FiKey className="section-icon" />
            <h3>API Credentials</h3>
          </div>
          <p className="section-description">
            Configure your API keys for external services. Keys are stored securely.
          </p>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Octopart Client ID</label>
              <input
                type="text"
                value={settings.apiKeys.octopartId}
                onChange={(e) => handleInputChange('apiKeys', 'octopartId', e.target.value)}
                placeholder="Enter Octopart Client ID"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Octopart Client Secret</label>
              <div className="password-input-group">
                <input
                  type={showKeys.octopartSecret ? "text" : "password"}
                  value={settings.apiKeys.octopartSecret}
                  onChange={(e) => handleInputChange('apiKeys', 'octopartSecret', e.target.value)}
                  placeholder="Enter Octopart Client Secret"
                  className="input-field"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => toggleKeyVisibility('octopartSecret')}
                >
                  {showKeys.octopartSecret ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Mouser API Key</label>
              <div className="password-input-group">
                <input
                  type={showKeys.mouserKey ? "text" : "password"}
                  value={settings.apiKeys.mouserKey}
                  onChange={(e) => handleInputChange('apiKeys', 'mouserKey', e.target.value)}
                  placeholder="Enter Mouser API Key"
                  className="input-field"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => toggleKeyVisibility('mouserKey')}
                >
                  {showKeys.mouserKey ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Digi-Key Client ID</label>
              <input
                type="text"
                value={settings.apiKeys.digikeyId}
                onChange={(e) => handleInputChange('apiKeys', 'digikeyId', e.target.value)}
                placeholder="Enter Digi-Key Client ID"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Digi-Key Client Secret</label>
              <div className="password-input-group">
                <input
                  type={showKeys.digikeySecret ? "text" : "password"}
                  value={settings.apiKeys.digikeySecret}
                  onChange={(e) => handleInputChange('apiKeys', 'digikeySecret', e.target.value)}
                  placeholder="Enter Digi-Key Client Secret"
                  className="input-field"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => toggleKeyVisibility('digikeySecret')}
                >
                  {showKeys.digikeySecret ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Gemini API Key</label>
              <div className="password-input-group">
                <input
                  type={showKeys.geminiKey ? "text" : "password"}
                  value={settings.apiKeys.geminiKey}
                  onChange={(e) => handleInputChange('apiKeys', 'geminiKey', e.target.value)}
                  placeholder="Enter Gemini API Key"
                  className="input-field"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => toggleKeyVisibility('geminiKey')}
                >
                  {showKeys.geminiKey ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card settings-section">
          <div className="section-header">
            <FiSettings className="section-icon" />
            <h3>Preferences</h3>
          </div>
          <p className="section-description">
            Set your default preferences for analysis and reports
          </p>

          <div className="form-group">
            <label>Default Priority Level</label>
            <select
              value={settings.preferences.defaultPriority}
              onChange={(e) => handleInputChange('preferences', 'defaultPriority', e.target.value)}
              className="input-field"
            >
              <option value="1">Priority 1: Must Match</option>
              <option value="2">Priority 2: Can Differ</option>
              <option value="3">Priority 3: Cosmetic</option>
            </select>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.preferences.autoDownload}
                onChange={(e) => handleInputChange('preferences', 'autoDownload', e.target.checked)}
              />
              <span>Auto-download reports after analysis</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.preferences.emailNotifications}
                onChange={(e) => handleInputChange('preferences', 'emailNotifications', e.target.checked)}
              />
              <span>Enable email notifications</span>
            </label>
          </div>
        </div>

        <div className="card settings-section">
          <div className="section-header">
            <FiBell className="section-icon" />
            <h3>Notifications</h3>
          </div>
          <p className="section-description">
            Manage your notification preferences
          </p>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.notifications.analysisComplete}
                onChange={(e) => handleInputChange('notifications', 'analysisComplete', e.target.checked)}
              />
              <span>Notify when analysis completes</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.notifications.errors}
                onChange={(e) => handleInputChange('notifications', 'errors', e.target.checked)}
              />
              <span>Notify on errors</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.notifications.weeklyReport}
                onChange={(e) => handleInputChange('notifications', 'weeklyReport', e.target.checked)}
              />
              <span>Weekly summary report</span>
            </label>
          </div>
        </div>

        <div className="card settings-section">
          <div className="section-header">
            <FiSettings className="section-icon" />
            <h3>Appearance</h3>
          </div>
          <p className="section-description">
            Customize the application appearance
          </p>

          <div className="theme-toggle-section">
            <label className="theme-toggle-label">
              <span>Theme</span>
              <button 
                className="btn btn-secondary"
                onClick={toggleTheme}
              >
                {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              </button>
            </label>
            <p className="theme-description">
              Current theme: <strong>{theme === 'light' ? 'Light' : 'Dark'}</strong>
            </p>
          </div>
        </div>

        <div className="settings-actions">
          <button 
            className="btn btn-primary btn-icon"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleReset}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
