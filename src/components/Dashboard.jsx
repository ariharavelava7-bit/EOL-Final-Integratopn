import React, { useMemo, useState } from 'react';
import {
  FiDatabase,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiDownload
} from 'react-icons/fi';
import './Dashboard.css';

const API_BASE_URL = 'http://localhost:8001';

function Dashboard() {
  const [partNumber, setPartNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [eolSpecs, setEolSpecs] = useState([]);
  const [priorityMap, setPriorityMap] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const statsCards = useMemo(() => ([
    {
      title: 'Specs Loaded',
      value: eolSpecs.length,
      helper: eolSpecs.length ? 'Specifications ready' : 'Awaiting lookup',
      icon: FiDatabase,
      status: eolSpecs.length ? 'active' : undefined,
    },
    {
      title: 'Priorities Set',
      value: priorityMap.length,
      helper: priorityMap.length ? 'Ready for export' : 'Pending config',
      icon: FiTrendingUp,
      status: priorityMap.length ? 'ready' : undefined,
    },
    {
      title: 'Status',
      value: priorityMap.length ? 'Ready' : 'Setup Required',
      helper: 'Configure priorities to export',
      icon: FiCheckCircle,
      status: priorityMap.length ? 'complete' : undefined,
    },
  ]), [eolSpecs.length, priorityMap.length]);

  const checklistItems = useMemo(() => ([
    { label: 'Lookup EOL specifications', done: eolSpecs.length > 0 },
    { label: 'Set FFF priorities', done: priorityMap.length > 0 },
    { label: 'Download color-coded Excel report', done: false },
  ]), [eolSpecs.length, priorityMap.length]);

  const handleLookup = async () => {
    if (!partNumber.trim()) {
      setError('Please enter a part number');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setEolSpecs([]);
    setPriorityMap([]);

    try {
      // Build URL with manufacturer if provided
      let url = `${API_BASE_URL}/api/v1/lookup_eol_specs/${encodeURIComponent(partNumber)}`;
      if (manufacturer.trim()) {
        url += `?manufacturer=${encodeURIComponent(manufacturer.trim())}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch specs: ${response.statusText}`);
      }

      const data = await response.json();
      const specs = data?.specs ?? [];
      setEolSpecs(Array.isArray(specs) ? specs : []);

      const initialPriorities = (Array.isArray(specs) ? specs : []).map(spec => ({
        parameter: spec.parameter,
        priority: 2
      }));
      setPriorityMap(initialPriorities);
      const mfrText = manufacturer.trim() ? ` (${manufacturer.trim()})` : '';
      setSuccessMessage(`✓ Found ${specs.length} specifications for ${partNumber}${mfrText}`);
    } catch (err) {
      setError(err.message || 'Failed to fetch part specifications');
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = (parameter, priority) => {
    setPriorityMap(prev =>
      prev.map(item =>
        item.parameter === parameter
          ? { ...item, priority: parseInt(priority) }
          : item
      )
    );
  };

  const handleDownloadReport = async () => {
    if (priorityMap.length === 0) {
      setError('Please lookup part specifications first');
      return;
    }

    setDownloading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/download_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eol_part_number: partNumber,
          ...(manufacturer.trim() && { manufacturer: manufacturer.trim() }),
          priority_map: priorityMap,
        }),
      });

      if (!response.ok) {
        // Try to extract backend error message for better debugging
        let message = `Report generation failed: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            message = `Report generation failed: ${errorData.detail}`;
          }
        } catch {
          // ignore JSON parse errors and keep default message
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Color_Coded_FFF_${partNumber}_${new Date().toISOString().slice(0,10)}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMessage('✓ Color-coded Excel report downloaded successfully!');
    } catch (err) {
      setError(err.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      1: 'Must Match',
      2: 'Can Differ',
      3: 'Cosmetic'
    };
    return labels[priority] || 'Unknown';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      1: '#10b981',  // Priority 1 (Must Match) = Green
      2: '#f59e0b',  // Priority 2 (Can Differ) = Orange
      3: '#ef4444'   // Priority 3 (Cosmetic) = Red
    };
    return colors[priority] || '#94a3b8';
  };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h2>End of Life Part Replacer</h2>
        <p>Simplified workflow: Lookup → Set Priorities → Download Color-Coded Excel</p>
      </div>

      <div className="stats-cards">
        {statsCards.map(({ title, value, helper, icon: Icon, status }, index) => (
          <div className={`stats-card ${status ? `stats-card-${status}` : ''}`} key={index}>
            <div className="stats-card-header">
              <span className="stats-icon">
                <Icon size={20} />
              </span>
              <span>{title}</span>
            </div>
            <div className="stats-value">{value}</div>
            <p className="stats-helper">{helper}</p>
          </div>
        ))}
      </div>

      <div className="workflow-grid">
        <div className="workflow-main">

          {/* Step 1: Lookup */}
          <div className="card">
            <div className="card-heading">
              <h3>1. Lookup Part Specifications</h3>
              <p className="card-subtitle">Enter EOL part number and manufacturer (optional) to fetch from Octopart</p>
            </div>

            <div className="input-group">
              <div className="input-row">
                <div className="input-field-wrapper">
                  <label htmlFor="part-number">Part Number *</label>
                  <input
                    id="part-number"
                    type="text"
                    placeholder="Enter part number (e.g., LM317, MCP73831T)"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                    className="input-primary"
                    disabled={loading}
                  />
                </div>
                <div className="input-field-wrapper">
                  <label htmlFor="manufacturer">Manufacturer (Optional)</label>
                  <input
                    id="manufacturer"
                    type="text"
                    placeholder="e.g., Texas Instruments, STMicroelectronics"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                    className="input-primary"
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                onClick={handleLookup}
                disabled={loading || !partNumber.trim()}
                className="btn btn-primary btn-lookup"
              >
                <FiSearch size={18} />
                {loading ? 'Searching...' : 'Lookup Specs'}
              </button>
            </div>
          </div>

          {/* Step 2: Set Priorities */}
          {eolSpecs.length > 0 && (
            <div className="card">
              <div className="card-heading">
                <h3>2. Set Priority for Each Parameter</h3>
                <p className="card-subtitle">
                  Priority 1 = Must Match (Critical) | Priority 2 = Can Differ | Priority 3 = Cosmetic
                </p>
              </div>

              <div className="table-container-wrapper">
                <div className="custom-table">
                  <div className="table-header">
                    <div className="col-param">Parameter</div>
                    <div className="col-value">Value</div>
                    <div className="col-priority">Priority</div>
                  </div>

                  <div className="table-body-scroll">
                    {eolSpecs.map((spec, index) => {
                      const priorityItem = priorityMap.find(p => p.parameter === spec.parameter);
                      const currentPriority = priorityItem?.priority || 2;

                      return (
                        <div key={index} className="table-row">
                          <div className="col-param">{spec.parameter}</div>
                          <div className="col-value">{spec.value}</div>
                          <div className="col-priority">
                            <select
                              value={currentPriority}
                              onChange={(e) => handlePriorityChange(spec.parameter, e.target.value)}
                              className="priority-select"
                              style={{
                                borderColor: getPriorityColor(currentPriority),
                                color: getPriorityColor(currentPriority),
                                fontWeight: 600
                              }}
                            >
                              <option value={1}>Priority 1: Must Match</option>
                              <option value={2}>Priority 2: Can Differ</option>
                              <option value={3}>Priority 3: Cosmetic</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                <button
                  onClick={handleDownloadReport}
                  disabled={downloading}
                  className="btn btn-success btn-large"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}
                >
                  <FiDownload size={20} />
                  {downloading ? 'Generating Report...' : 'Download Color-Coded Excel Report'}
                </button>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="alert alert-success">
              <FiCheckCircle size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <FiAlertCircle size={20} />
              <span><strong>Error:</strong> {error}</span>
            </div>
          )}

        </div>

        <div className="workflow-side">
          <div className="card side-card">
            <h3>Session Status</h3>
            <ul className="session-metrics">
              <li>
                <span>Part Number</span>
                <strong>{partNumber || '-'}</strong>
              </li>
              <li>
                <span>Manufacturer</span>
                <strong>{manufacturer || '-'}</strong>
              </li>
              <li>
                <span>Specs Loaded</span>
                <strong>{eolSpecs.length}</strong>
              </li>
              <li>
                <span>Export Ready</span>
                <strong>{priorityMap.length > 0 ? 'Yes' : 'No'}</strong>
              </li>
            </ul>
          </div>

          <div className="card side-card">
            <h3>Workflow Checklist</h3>
            <ul className="checklist">
              {checklistItems.map((item, index) => (
                <li key={index} className={item.done ? 'checklist-done' : ''}>
                  <span className="checklist-marker">{item.done ? '✓' : index + 1}</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card side-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <h3 style={{ color: 'white' }}>Excel Features</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0 0' }}>
              <li style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                🟨 Yellow headers
              </li>
              <li style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                ⬜ Gray attributes
              </li>
              <li style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                🟢 Green = Match
              </li>
              <li style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                🟠 Orange = Variation
              </li>
              <li style={{ padding: '0.5rem 0' }}>
                🔴 Red = Missing/Critical
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
