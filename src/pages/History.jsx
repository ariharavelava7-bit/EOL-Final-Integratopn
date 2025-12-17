import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FiClock, FiSearch, FiFileText, FiDownload, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import './Pages.css';

// Use Vite proxy in dev (relative `/api`), or configure `VITE_API_BASE_URL` for prod.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function History() {
  const { token } = useApp();
  const [activeTab, setActiveTab] = useState('searches');
  const [searchHistory, setSearchHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load search history
      const historyRes = await fetch(`${API_BASE_URL}/api/search-history?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const data = await historyRes.json();
        setSearchHistory(data);
      }

      // Load reports
      const reportsRes = await fetch(`${API_BASE_URL}/api/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const filteredHistory = searchHistory.filter(item =>
    item.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.manufacturer && item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredReports = reports.filter(item =>
    item.report_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.part_number && item.part_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-container history-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1>
            <FiClock className="page-icon" />
            History
          </h1>
          <p>View your search history and generated reports</p>
        </div>
        <button className="refresh-btn" onClick={loadData} disabled={loading}>
          <FiRefreshCw className={loading ? 'spin' : ''} size={16} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="page-tabs">
        <button
          className={`tab-btn ${activeTab === 'searches' ? 'active' : ''}`}
          onClick={() => setActiveTab('searches')}
        >
          <FiSearch size={16} />
          Search History ({searchHistory.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FiFileText size={16} />
          Reports ({reports.length})
        </button>
      </div>

      {/* Search bar */}
      <div className="page-search">
        <FiSearch size={18} />
        <input
          type="text"
          placeholder={`Search ${activeTab === 'searches' ? 'history' : 'reports'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="page-content">
        {loading ? (
          <div className="loading-state">
            <FiRefreshCw className="spin" size={32} />
            <p>Loading...</p>
          </div>
        ) : activeTab === 'searches' ? (
          <div className="history-list">
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <FiSearch size={48} />
                <h3>No search history</h3>
                <p>Your part searches will appear here</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Manufacturer</th>
                    <th>Description</th>
                    <th>Alternates Found</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="part-number">{item.part_number}</td>
                      <td>{item.manufacturer || '-'}</td>
                      <td className="description-cell">{item.description || '-'}</td>
                      <td>{item.alternates_count}</td>
                      <td>{new Date(item.searched_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="reports-list">
            {filteredReports.length === 0 ? (
              <div className="empty-state">
                <FiFileText size={48} />
                <h3>No reports generated</h3>
                <p>Your generated reports will appear here</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Type</th>
                    <th>Part Number</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((item) => (
                    <tr key={item.id}>
                      <td className="report-name">{item.report_name}</td>
                      <td>
                        <span className={`type-badge ${item.report_type}`}>
                          {item.report_type}
                        </span>
                      </td>
                      <td className="part-number">{item.part_number || '-'}</td>
                      <td>{new Date(item.created_at).toLocaleString()}</td>
                      <td className="actions-cell">
                        <button className="action-btn download" title="Download">
                          <FiDownload size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
