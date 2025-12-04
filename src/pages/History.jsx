import React, { useState, useEffect } from 'react';
import './History.css';

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Simulate loading history
    setTimeout(() => {
      const mockHistory = [
        {
          id: 1,
          partNumber: 'EE-SX4070',
          action: 'Analysis Completed',
          timestamp: '2025-11-10 23:27:12',
          status: 'success',
          details: 'Generated Excel report with 3 recommendations'
        },
        {
          id: 2,
          partNumber: 'MCP73831T',
          action: 'Analysis Completed',
          timestamp: '2025-11-10 23:22:54',
          status: 'success',
          details: 'Generated Excel report with 4 recommendations'
        },
        {
          id: 3,
          partNumber: 'C2472A',
          action: 'Lookup Failed',
          timestamp: '2025-11-09 14:30:22',
          status: 'error',
          details: 'Part number not found in database'
        },
        {
          id: 4,
          partNumber: 'LM358',
          action: 'Analysis Started',
          timestamp: '2025-11-08 10:15:33',
          status: 'pending',
          details: 'Analysis in progress...'
        }
      ];
      setHistory(mockHistory);
      setLoading(false);
    }, 500);
  }, []);

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(item => item.status === filter);

  return (
    <div className="history-page">
      <div className="page-header">
        <h2>Analysis History</h2>
        <p>View your analysis activity and history</p>
      </div>

      <div className="card filters-card">
        <div className="filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'success' ? 'active' : ''}`}
            onClick={() => setFilter('success')}
          >
            Success
          </button>
          <button 
            className={`filter-btn ${filter === 'error' ? 'active' : ''}`}
            onClick={() => setFilter('error')}
          >
            Errors
          </button>
          <button 
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p>Loading history...</p>
        </div>
      ) : (
        <div className="card">
          <div className="history-list">
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <p>No history found for selected filter.</p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div key={item.id} className={`history-item history-${item.status}`}>
                  <div className="history-icon">
                    {item.status === 'success' && '✓'}
                    {item.status === 'error' && '✗'}
                    {item.status === 'pending' && '○'}
                  </div>
                  <div className="history-content">
                    <div className="history-header">
                      <span className="history-part">{item.partNumber}</span>
                      <span className="history-time">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="history-action">{item.action}</div>
                    <div className="history-details">{item.details}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default History;
