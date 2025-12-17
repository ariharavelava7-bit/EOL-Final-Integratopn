import React, { useState, useEffect } from 'react';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiPackage,
  FiAlertTriangle,
  FiSearch
} from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import PartDetails from './PartDetails';
import './Dashboard.css';

// Use Vite proxy in dev (relative `/api`), or configure `VITE_API_BASE_URL` for prod.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function Dashboard({ currentView, searchQuery, onSearch, loading, setLoading, onCompare }) {
  const { recentParts, user, apiCall } = useApp();
  const [partData, setPartData] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Mock alerts data
  const alerts = [
    {
      id: 1,
      type: 'material',
      title: '0814788 by PHOENIX CONTACT',
      subtitle: 'Labeling,Materials',
      icon: FiPackage
    },
    {
      id: 2,
      type: 'obsolescence',
      title: 'SFH229FA by ams OSRAM',
      subtitle: 'Obsolescence Notices,Removed from Cost...',
      icon: FiAlertTriangle
    }
  ];

  // Fetch part data when searchQuery changes
  useEffect(() => {
    if (searchQuery && currentView === 'find-parts') {
      handleLookup(searchQuery);
    }
  }, [searchQuery, currentView]);

  const handleLookup = async (partNumber) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setPartData(null);

    try {
      // Use authenticated API helper so the Authorization header is included.
      const response = await apiCall(`/api/v1/lookup_eol_specs/${encodeURIComponent(partNumber)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to fetch specs: ${response.statusText}`);
      }

      const data = await response.json();
      setPartData(data);
      
      const specCount = data.specs?.length || 0;
      const altCount = data.alternates?.length || 0;
      setSuccessMessage(`Found ${specCount} specifications, ${altCount} alternate packagings`);
    } catch (err) {
      setError(err.message || 'Failed to fetch part specifications');
    } finally {
      setLoading(false);
    }
  };

  // Render Dashboard Home View
  if (currentView === 'dashboard') {
    return (
      <div className="dashboard-home">
        <div className="welcome-header">
          <h1>Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
        </div>

        <div className="dashboard-grid">
          {/* Recent Section */}
          <div className="dashboard-card">
            <div className="card-header-tabs">
              <h2 className="card-title">Recent</h2>
              <div className="tabs">
                <button className="tab tab-active">Parts</button>
                <button className="tab">BOMs</button>
              </div>
            </div>
            <div className="recent-list">
              {recentParts.length > 0 ? (
                recentParts.slice(0, 6).map((part, idx) => (
                  <div key={idx} className="recent-item" onClick={() => onSearch(part.id)}>
                    <div className="recent-icon">
                      <FiPackage size={16} />
                    </div>
                    <span className="recent-id">{part.id}</span>
                    <span className="recent-date">{part.date}</span>
                  </div>
                ))
              ) : (
                <div className="empty-message">No recent parts. Start by searching!</div>
              )}
            </div>
          </div>

          {/* Alerts Section */}
          <div className="dashboard-card">
            <div className="card-header-simple">
              <h2 className="card-title">Alerts</h2>
            </div>
            <div className="alerts-list">
              {alerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <div key={alert.id} className="alert-item">
                    <div className={`alert-icon alert-icon-${alert.type}`}>
                      <Icon size={20} />
                    </div>
                    <div className="alert-content">
                      <div className="alert-title">{alert.title}</div>
                      <div className="alert-subtitle">{alert.subtitle}</div>
                    </div>
                  </div>
                );
              })}
              <button className="see-all-btn">See All</button>
            </div>
          </div>

          {/* Parts Match Status */}
          <div className="dashboard-card">
            <div className="card-header-simple">
              <h2 className="card-title">Parts Match Status</h2>
            </div>
            <div className="status-chart">
              <div className="pie-chart-container">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle circle-green" strokeDasharray="63, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle circle-red" strokeDasharray="35, 100" strokeDashoffset="-63" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <div className="status-legend">
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#10b981' }}></span>
                  <span>Match [37,611]</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#ef4444' }}></span>
                  <span>No Match [20,910]</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#6366f1' }}></span>
                  <span>Ignored [827]</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Site Statistics */}
        <div className="dashboard-card stats-card">
          <h2 className="card-title">Site Statistics</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">0</div>
              <div className="stat-label">Site Admin</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">59,348</div>
              <div className="stat-label">Parts in BOMs</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">414</div>
              <div className="stat-label">BOMs</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">2</div>
              <div className="stat-label">Projects</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">1</div>
              <div className="stat-label">Company Admin</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">7,821 / 15k</div>
              <div className="stat-label">Used Parts</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">1 / 5</div>
              <div className="stat-label">Logged-in Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">65</div>
              <div className="stat-label">Users</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Find Parts View - Using PartDetails component
  if (currentView === 'find-parts') {
    return (
      <div className="find-parts-view">
        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && !loading && partData && (
          <div className="alert alert-success">
            <FiCheckCircle size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="lt-logo-loader">
              <div className="lt-letters">
                <span className="lt-l">L</span>
                <span className="lt-ampersand">&</span>
                <span className="lt-t">T</span>
              </div>
              <div className="loading-ring"></div>
              <div className="loading-ring ring-2"></div>
              <div className="loading-ring ring-3"></div>
            </div>
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        {!loading && partData && (
          <PartDetails 
            partNumber={searchQuery}
            partData={partData}
            onClose={() => setPartData(null)}
            onCompare={onCompare}
          />
        )}

        {!loading && !partData && !error && (
          <div className="empty-state">
            <div className="empty-icon">
              <FiSearch size={64} />
            </div>
            <h2>Search for Parts</h2>
            <p>Enter a part number in the search bar above to find product details and alternate packagings from Digi-Key</p>
          </div>
        )}
      </div>
    );
  }

  // Placeholder for other views
  return (
    <div className="placeholder-view">
      <h2>{currentView.replace('-', ' ').toUpperCase()}</h2>
      <p>This section is under development</p>
    </div>
  );
}

export default Dashboard;
