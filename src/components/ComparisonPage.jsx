import React, { useState, useEffect } from 'react';
import { 
  FiX, 
  FiEye, 
  FiDownload, 
  FiFileText,
  FiArrowLeft,
  FiChevronDown,
  FiChevronRight
} from 'react-icons/fi';
import './ComparisonPage.css';

// Use Vite proxy in dev (relative `/api`), or configure `VITE_API_BASE_URL` for prod.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function ComparisonPage({ eolPart, alternates, onBack }) {
  const [loading, setLoading] = useState(true);
  const [comparisonData, setComparisonData] = useState(null);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    technical: true,
    compliance: true,
    market: true
  });

  // Fetch comparison data from Octopart when page loads
  useEffect(() => {
    if (eolPart && alternates && alternates.length > 0) {
      fetchComparisonFromOctopart();
    }
  }, [eolPart, alternates]);

  const fetchComparisonFromOctopart = async () => {
    setLoading(true);
    
    try {
      const altPartNumbers = alternates.map(a => a.partNumber);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/compare_parts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eol_part_number: eolPart.partNumber,
          alternate_part_numbers: altPartNumbers
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
      } else {
        // Build local comparison data as fallback
        buildLocalComparisonData();
      }
    } catch (error) {
      console.error('Error fetching comparison from Octopart:', error);
      buildLocalComparisonData();
    } finally {
      setLoading(false);
    }
  };

  const buildLocalComparisonData = () => {
    const specs = eolPart.specs || [];
    const compSpecs = specs.map(s => ({
      parameter: s.parameter,
      eolValue: s.value,
      alternateValues: alternates.map(a => a[s.parameter] || 'N/A')
    }));
    
    setComparisonData({
      eolPart: { ManufacturerPartNumber: eolPart.partNumber },
      alternates: alternates,
      specs: compSpecs
    });
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
          eol_part_number: eolPart.partNumber,
          eol_specs: eolPart.specs || [],
          alternates: alternates
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EOL_Comparison_${eolPart.partNumber}_${new Date().toISOString().slice(0,10)}.xlsx`;
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filter specs based on "Only Differences" toggle
  const filteredSpecs = showOnlyDifferences && comparisonData?.specs
    ? comparisonData.specs.filter(spec => {
        const values = [spec.eolValue, ...spec.alternateValues].filter(v => v && v !== 'N/A');
        const uniqueValues = new Set(values);
        return uniqueValues.size > 1;
      })
    : comparisonData?.specs || [];

  // Group specs by category
  const groupedSpecs = {
    general: filteredSpecs.filter(s => 
      ['Manufacturer', 'ManufacturerPartNumber', 'Description', 'Category'].includes(s.parameter) ||
      s.parameter.toLowerCase().includes('description')
    ),
    technical: filteredSpecs.filter(s => 
      s.parameter.startsWith('SPEC_') || 
      ['Resistance', 'Tolerance', 'Power', 'Voltage', 'Temperature'].some(t => 
        s.parameter.toLowerCase().includes(t.toLowerCase())
      )
    ),
    compliance: filteredSpecs.filter(s => 
      ['RoHS', 'REACH', 'Lead', 'Halogen'].some(t => 
        s.parameter.toLowerCase().includes(t.toLowerCase())
      )
    ),
    market: filteredSpecs.filter(s => 
      ['Stock', 'Price', 'SKU', 'Availability', 'Quantity'].some(t => 
        s.parameter.toLowerCase().includes(t.toLowerCase())
      )
    )
  };

  // Add remaining specs to general
  const categorizedParams = new Set([
    ...groupedSpecs.general.map(s => s.parameter),
    ...groupedSpecs.technical.map(s => s.parameter),
    ...groupedSpecs.compliance.map(s => s.parameter),
    ...groupedSpecs.market.map(s => s.parameter)
  ]);
  
  const uncategorized = filteredSpecs.filter(s => !categorizedParams.has(s.parameter));
  groupedSpecs.general = [...groupedSpecs.general, ...uncategorized];

  if (loading) {
    return (
      <div className="comparison-page">
        <div className="comparison-loading">
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
          <p className="loading-text">Fetching detailed specifications from Octopart...</p>
        </div>
      </div>
    );
  }

  // Render spec table rows
  const renderSpecRows = (specs) => {
    return specs.map((spec, idx) => {
      const values = [spec.eolValue, ...(spec.alternateValues || [])];
      const nonEmptyValues = values.filter(v => v && v !== 'N/A');
      const hasDifference = new Set(nonEmptyValues).size > 1;
      
      return (
        <tr key={idx} className={hasDifference ? 'row-difference' : ''}>
          <td className="param-col">{spec.parameter.replace('SPEC_', '')}</td>
          <td className="value-col eol-col">{spec.eolValue || 'N/A'}</td>
          {(spec.alternateValues || []).map((val, valIdx) => {
            const isDifferent = hasDifference && val !== spec.eolValue && val !== 'N/A';
            return (
              <td 
                key={valIdx} 
                className={`value-col ${isDifferent ? 'diff-highlight' : 'same-opacity'}`}
              >
                {val || 'N/A'}
              </td>
            );
          })}
        </tr>
      );
    });
  };

  return (
    <div className="comparison-page">
      {/* Header */}
      <div className="comparison-page-header">
        <button className="back-btn" onClick={onBack}>
          <FiArrowLeft size={20} />
          Back to Part Details
        </button>
        <h1>Compare Parts</h1>
        <div className="header-actions">
          <button 
            className="btn-primary" 
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
          >
            <FiDownload size={16} />
            {downloadingExcel ? 'Downloading...' : 'Export to Excel'}
          </button>
        </div>
      </div>

      {/* Parts Cards Header */}
      <div className="parts-cards-row">
        <div className="only-diff-control">
          <button 
            className={`only-diff-btn ${showOnlyDifferences ? 'active' : ''}`}
            onClick={() => setShowOnlyDifferences(!showOnlyDifferences)}
          >
            <FiEye size={16} />
            ONLY DIFFERENCES
          </button>
        </div>
        
        {/* EOL Part Card */}
        <div className="part-card eol-part-card">
          <div className="part-card-image">
            <FiFileText size={28} />
          </div>
          <div className="part-card-details">
            <span className="part-card-pn">{eolPart?.partNumber}</span>
            <span className="part-card-desc">{eolPart?.description?.slice(0, 40) || 'Component'}...</span>
            <span className="part-card-mfr">{eolPart?.manufacturer}</span>
            <span className="part-badge badge-approved">Approved</span>
          </div>
        </div>

        {/* Alternate Parts Cards */}
        {alternates.map((alt, idx) => (
          <div key={idx} className="part-card">
            <button 
              className="remove-card-btn" 
              title="Remove from comparison"
            >
              <FiX size={14} />
            </button>
            <div className="part-card-image">
              <FiFileText size={28} />
            </div>
            <div className="part-card-details">
              <span className="part-card-pn">{alt.partNumber}</span>
              <span className="part-card-desc">{alt.description?.slice(0, 40) || 'Alternate'}...</span>
              <span className="part-card-mfr">{alt.manufacturer}</span>
              <span className="part-badge badge-approved">Approved</span>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="comparison-table-container">
        {/* General Information Section */}
        {groupedSpecs.general.length > 0 && (
          <div className="spec-section">
            <div 
              className="section-header-toggle" 
              onClick={() => toggleSection('general')}
            >
              {expandedSections.general ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
              <span>General information</span>
            </div>
            {expandedSections.general && (
              <table className="comparison-table">
                <tbody>
                  {renderSpecRows(groupedSpecs.general)}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Technical Specifications Section */}
        {groupedSpecs.technical.length > 0 && (
          <div className="spec-section">
            <div 
              className="section-header-toggle" 
              onClick={() => toggleSection('technical')}
            >
              {expandedSections.technical ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
              <span>Technical specifications</span>
            </div>
            {expandedSections.technical && (
              <table className="comparison-table">
                <tbody>
                  {renderSpecRows(groupedSpecs.technical)}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Compliance Section */}
        {groupedSpecs.compliance.length > 0 && (
          <div className="spec-section">
            <div 
              className="section-header-toggle" 
              onClick={() => toggleSection('compliance')}
            >
              {expandedSections.compliance ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
              <span>Compliance</span>
            </div>
            {expandedSections.compliance && (
              <table className="comparison-table">
                <tbody>
                  {renderSpecRows(groupedSpecs.compliance)}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Market Availability Section */}
        {groupedSpecs.market.length > 0 && (
          <div className="spec-section">
            <div 
              className="section-header-toggle" 
              onClick={() => toggleSection('market')}
            >
              {expandedSections.market ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
              <span>Market availability</span>
            </div>
            {expandedSections.market && (
              <table className="comparison-table">
                <tbody>
                  {renderSpecRows(groupedSpecs.market)}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* No Data Message */}
        {filteredSpecs.length === 0 && (
          <div className="no-specs-message">
            {showOnlyDifferences 
              ? 'No differences found between the selected parts.'
              : 'No specification data available for comparison.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default ComparisonPage;
