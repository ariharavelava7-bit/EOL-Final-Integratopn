import React, { useState, useEffect } from 'react';
import { 
  FiEye, 
  FiDownload, 
  FiExternalLink,
  FiFileText,
  FiBell,
  FiZap,
  FiCopy,
  FiMoreHorizontal,
  FiInfo,
  FiRefreshCw,
  FiAlertCircle
} from 'react-icons/fi';
import './PartDetails.css';

// Use Vite proxy in dev (relative `/api`), or configure `VITE_API_BASE_URL` for prod.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function PartDetails({ partNumber, partData, onClose, onCompare }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [loadingCrosses, setLoadingCrosses] = useState(false);
  const [crossesLoaded, setCrossesLoaded] = useState(false);
  const [alternatesData, setAlternatesData] = useState([]);
  const [crossesError, setCrossesError] = useState(null);

  // Use data from props
  const specs = partData?.specs || [];
  const lifecycle = partData?.lifecycle || {};
  const compliance = partData?.compliance || {};
  const marketAvailability = partData?.marketAvailability || {};

  // Initialize alternates from partData
  useEffect(() => {
    if (partData?.alternates) {
      setAlternatesData(partData.alternates);
      if (partData.alternates.length > 0) {
        setCrossesLoaded(true);
      }
    }
  }, [partData]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'crosses', label: `Crosses${alternatesData.length > 0 ? ` (${alternatesData.length})` : ''}` },
    { id: 'technical', label: 'Technical' },
    { id: 'pcns', label: 'PCNs' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'actions', label: 'Actions' },
  ];

  // Fetch crosses when tab is clicked
  const handleTabChange = async (tabId) => {
    setActiveTab(tabId);
    
    if (tabId === 'crosses' && !crossesLoaded && !loadingCrosses) {
      await fetchCrosses();
    }
  };

  // Fetch alternate parts from Digi-Key
  const fetchCrosses = async () => {
    setLoadingCrosses(true);
    setCrossesError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/lookup_eol_specs/${encodeURIComponent(partNumber)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.alternates && data.alternates.length > 0) {
          setAlternatesData(data.alternates);
          setCrossesLoaded(true);
        } else {
          setCrossesError('No alternate parts found');
        }
      } else {
        setCrossesError('Failed to fetch alternate parts');
      }
    } catch (error) {
      console.error('Error fetching crosses:', error);
      setCrossesError('Network error. Please try again.');
    } finally {
      setLoadingCrosses(false);
    }
  };

  // Handle Compare button click - navigates to full comparison page
  const handleCompareTop = () => {
    if (alternatesData.length === 0) {
      return;
    }
    
    // Build the EOL part data object
    const eolPartData = {
      partNumber: partNumber,
      manufacturer: partData?.manufacturer,
      description: partData?.description,
      specs: specs
    };
    
    // Get top alternates (up to 5)
    const topAlternates = alternatesData.slice(0, 5);
    
    // Call onCompare to navigate to comparison page
    if (onCompare) {
      onCompare(eolPartData, topAlternates);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/download_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eol_part_number: partNumber,
          eol_specs: specs,
          alternates: alternatesData.slice(0, 5)
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EOL_Comparison_${partNumber}_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Render the Top 5 Crosses table
  const renderCrossesTable = () => (
    <div className="crosses-section">
      <div className="section-header">
        <h3>Top 5 Crosses</h3>
      </div>
      
      {loadingCrosses ? (
        <div className="loading-crosses">
          <div className="lt-logo-loader-small">
            <div className="lt-letters-small">
              <span className="lt-l">L</span>
              <span className="lt-ampersand">&</span>
              <span className="lt-t">T</span>
            </div>
            <div className="loading-ring-small"></div>
            <div className="loading-ring-small ring-2"></div>
          </div>
          <div className="loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      ) : crossesError ? (
        <div className="crosses-error">
          <FiAlertCircle size={24} />
          <p>{crossesError}</p>
          <button className="btn-outline" onClick={fetchCrosses}>
            <FiRefreshCw size={16} />
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="crosses-table-container">
            <table className="crosses-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Part</th>
                  <th>Manufacturer</th>
                  <th>Cross Type</th>
                  <th>ACL</th>
                  <th>Y-To-EOL</th>
                  <th>Inventory</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {alternatesData.length > 0 ? (
                  alternatesData.slice(0, 5).map((alt, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="pdf-icon">
                          <FiFileText size={18} />
                        </div>
                      </td>
                      <td><span className="link-text">{alt.partNumber}</span></td>
                      <td><span className="link-text">{alt.manufacturer}</span></td>
                      <td>{alt.crossType || 'SF'}</td>
                      <td>{alt.acl || 'No'}</td>
                      <td>{alt.yearsToEOL || '0.0 years'}</td>
                      <td>{alt.quantityAvailable?.toLocaleString() || '--'}</td>
                      <td>{alt.difference || '--'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No alternate parts found. Click "Refresh" to fetch from Digi-Key.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {alternatesData.length > 0 && (
            <div className="crosses-actions">
              <button className="btn-compare" onClick={handleCompareTop}>
                <FiRefreshCw size={16} />
                Compare top {Math.min(5, alternatesData.length)}
              </button>
              <button className="btn-outline">
                View all {alternatesData.length} crosses
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="part-details-container">
      {/* Part Header */}
      <div className="part-header">
        <div className="part-header-left">
          <div className="part-image-placeholder">
            <FiFileText size={32} />
          </div>
          <div className="part-header-info">
            <h1 className="part-mpn">{partNumber}</h1>
            <div className="part-manufacturer">
              <span className="manufacturer-name">{partData?.manufacturer || 'Unknown'}</span>
              <span className="verified-badge">Verified</span>
              <span className="last-checked">Last Checked: {partData?.lastChecked || 'N/A'}</span>
              <FiInfo size={14} />
            </div>
            <span className="part-status-badge status-approved">
              {partData?.status || 'Active'}
            </span>
          </div>
        </div>
        <div className="part-header-actions">
          <button className="action-btn action-btn-outline">
            <FiCopy size={16} />
            Request data
          </button>
          <button className="action-btn-icon"><FiZap size={18} /></button>
          <button className="action-btn-icon"><FiBell size={18} /></button>
          <button className="action-btn-icon"><FiExternalLink size={18} /></button>
          <button className="action-btn-icon"><FiCopy size={18} /></button>
          <button className="action-btn-icon"><FiMoreHorizontal size={18} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="part-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`part-tab ${activeTab === tab.id ? 'part-tab-active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="part-content">
        {activeTab === 'overview' && (
          <>
            {/* Info Cards Row */}
            <div className="info-cards-grid">
              {/* Lifecycle Card */}
              <div className="info-card">
                <div className="info-card-header">
                  <h3>Lifecycle <FiInfo size={14} /></h3>
                </div>
                <div className="info-card-body">
                  <div className="lifecycle-status">
                    <span className="status-pill status-active">{lifecycle.status || 'Active'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Years to EOL</span>
                    <span className="info-value">{lifecycle.yearsToEOL || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Introduced</span>
                    <span className="info-value">{lifecycle.introduced || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Lifecycle Source</span>
                    <span className="info-value link-text">{lifecycle.source || 'Digi-Key'}</span>
                  </div>
                </div>
                <button className="see-all-link">See All</button>
              </div>

              {/* Compliance Card */}
              <div className="info-card">
                <div className="info-card-header">
                  <h3>Compliance</h3>
                </div>
                <div className="info-card-body">
                  <div className="info-row">
                    <span className="info-label">RoHs <FiInfo size={12} /></span>
                    <span className="info-value">
                      <span className="compliance-check">Yes</span>
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">REACH SVHC</span>
                    <span className="info-value">{compliance.reachSvhc || 'Unknown'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">TSCA PBT</span>
                    <span className="info-value">{compliance.tscaPbt || 'Unknown'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Global PFAS</span>
                    <span className="info-value">{compliance.globalPfas || 'Unknown'}</span>
                  </div>
                </div>
                <button className="see-all-link">See All</button>
              </div>

              {/* Market Availability Card */}
              <div className="info-card">
                <div className="info-card-header">
                  <h3>Market Availability</h3>
                </div>
                <div className="info-card-body">
                  <div className="market-highlight">
                    <span className="highlight-number">{marketAvailability.distributors || 1}</span>
                    <span className="highlight-label">Distributors</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Avail. Quantity</span>
                    <span className="info-value">{marketAvailability.availQty || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Min Price</span>
                    <span className="info-value">{marketAvailability.minPrice || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Min Leadtime</span>
                    <span className="info-value">{marketAvailability.minLeadtime || 'N/A'}</span>
                  </div>
                </div>
                <button className="see-all-link">See All</button>
              </div>
            </div>

            {/* Top 5 Crosses Section in Overview */}
            {renderCrossesTable()}
          </>
        )}

        {activeTab === 'crosses' && (
          <div className="crosses-full-view">
            {/* Top 5 Crosses Section */}
            {renderCrossesTable()}
            
            {/* PCNs, Alerts, Actions tabs below */}
            <div className="sub-tabs">
              <button className="sub-tab sub-tab-active">
                <FiFileText size={16} />
                PCNs
              </button>
              <button className="sub-tab">
                <FiBell size={16} />
                ALERTS
              </button>
              <button className="sub-tab">
                <FiZap size={16} />
                ACTIONS
              </button>
            </div>
            
            <div className="pcns-section">
              <p className="pcns-label">Five most-recent PCNs for this Part</p>
              <table className="pcns-table">
                <thead>
                  <tr>
                    <th>PCN Number</th>
                    <th>Notification</th>
                    <th>Type Of Change</th>
                    <th>Description</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5" className="no-data">No PCNs available</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="technical-specs">
            <h3>Technical Specifications</h3>
            <div className="specs-grid">
              {specs.map((spec, idx) => (
                <div key={idx} className="spec-row">
                  <span className="spec-label">{spec.parameter}</span>
                  <span className="spec-value">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'pcns' || activeTab === 'alerts' || activeTab === 'actions') && (
          <div className="placeholder-content">
            <p>This section is under development</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PartDetails;
