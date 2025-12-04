import React, { useState, useEffect } from 'react';
import './Reports.css';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    // Simulate loading reports
    setTimeout(() => {
      const mockReports = [
        {
          id: 1,
          partNumber: 'EE-SX4070',
          date: '2025-11-10',
          status: 'Completed',
          fileName: 'EOL_Alternatives_EE-SX4070_20251110_232712.xlsx'
        },
        {
          id: 2,
          partNumber: 'MCP73831T',
          date: '2025-11-10',
          status: 'Completed',
          fileName: 'EOL_Alternatives_MCP73831T_20251110_232254.xlsx'
        },
        {
          id: 3,
          partNumber: 'C2472A',
          date: '2025-11-09',
          status: 'Completed',
          fileName: 'EOL_Alternatives_C2472A_20251109_143022.xlsx'
        }
      ];
      setReports(mockReports);
      setLoading(false);
    }, 500);
  }, []);

  const handleDownload = (fileName) => {
    // In real app, this would download from server
    alert(`Downloading ${fileName}`);
  };

  const handleView = (report) => {
    setSelectedReport(report);
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h2>Analysis Reports</h2>
        <p>View and manage your generated analysis reports</p>
      </div>

      {loading ? (
        <div className="card">
          <p>Loading reports...</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="reports-table-container">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="part-number">{report.partNumber}</td>
                      <td>{new Date(report.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge status-${report.status.toLowerCase()}`}>
                          {report.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleView(report)}
                          >
                            View
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleDownload(report.fileName)}
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedReport && (
            <div className="card report-details">
              <h3>Report Details</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Part Number:</label>
                  <span>{selectedReport.partNumber}</span>
                </div>
                <div className="detail-item">
                  <label>Date:</label>
                  <span>{new Date(selectedReport.date).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`status-badge status-${selectedReport.status.toLowerCase()}`}>
                    {selectedReport.status}
                  </span>
                </div>
                <div className="detail-item">
                  <label>File Name:</label>
                  <span>{selectedReport.fileName}</span>
                </div>
              </div>
              <div className="detail-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => handleDownload(selectedReport.fileName)}
                >
                  Download Report
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Reports;
