import React, { useState } from 'react';
import { FiFolder, FiPlus, FiSearch, FiUpload, FiTrash2, FiEdit2, FiEye } from 'react-icons/fi';
import './Pages.css';

function BOMs() {
  const [activeTab, setActiveTab] = useState('boms');
  
  const boms = [
    { id: 1, name: 'Project Alpha BOM', parts: 156, created: 'Dec 10, 2025', status: 'Active' },
    { id: 2, name: 'Power Supply Module', parts: 42, created: 'Dec 8, 2025', status: 'Active' },
    { id: 3, name: 'Sensor Board v2.1', parts: 89, created: 'Dec 5, 2025', status: 'Review' },
    { id: 4, name: 'Control Unit PCB', parts: 234, created: 'Dec 1, 2025', status: 'Active' },
  ];

  const projects = [
    { id: 1, name: 'Project Alpha', boms: 3, lastModified: 'Dec 12, 2025', owner: 'Harish M' },
    { id: 2, name: 'Sensor Development', boms: 2, lastModified: 'Dec 10, 2025', owner: 'Team Lead' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>BOMs / Projects</h1>
          <p>Manage your Bill of Materials and Projects</p>
        </div>
        <div className="page-actions">
          <button className="btn-secondary">
            <FiUpload size={18} />
            Import BOM
          </button>
          <button className="btn-primary">
            <FiPlus size={18} />
            New BOM
          </button>
        </div>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'boms' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('boms')}
        >
          BOMs
        </button>
        <button 
          className={`tab-btn ${activeTab === 'projects' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
      </div>

      <div className="search-filter-bar">
        <div className="search-box">
          <FiSearch size={18} />
          <input type="text" placeholder={`Search ${activeTab}...`} />
        </div>
      </div>

      {activeTab === 'boms' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>BOM Name</th>
                <th>Parts Count</th>
                <th>Created Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {boms.map(bom => (
                <tr key={bom.id}>
                  <td>
                    <div className="cell-with-icon">
                      <FiFolder className="cell-icon" />
                      <span className="link-text">{bom.name}</span>
                    </div>
                  </td>
                  <td>{bom.parts}</td>
                  <td>{bom.created}</td>
                  <td>
                    <span className={`status-badge status-${bom.status.toLowerCase()}`}>
                      {bom.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn" title="View">
                        <FiEye size={16} />
                      </button>
                      <button className="icon-btn" title="Edit">
                        <FiEdit2 size={16} />
                      </button>
                      <button className="icon-btn icon-btn-danger" title="Delete">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>BOMs</th>
                <th>Last Modified</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id}>
                  <td>
                    <div className="cell-with-icon">
                      <FiFolder className="cell-icon" />
                      <span className="link-text">{project.name}</span>
                    </div>
                  </td>
                  <td>{project.boms}</td>
                  <td>{project.lastModified}</td>
                  <td>{project.owner}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn" title="View">
                        <FiEye size={16} />
                      </button>
                      <button className="icon-btn" title="Edit">
                        <FiEdit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BOMs;

