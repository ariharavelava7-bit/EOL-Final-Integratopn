import React from 'react';
import { 
  FiGrid, 
  FiSearch, 
  FiFolder, 
  FiClock, 
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiShield
} from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import './Sidebar.css';

function Sidebar({ currentView, onViewChange, isAdmin }) {
  const { sidebarCollapsed, toggleSidebar, logout } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
    { id: 'find-parts', label: 'Find Parts', icon: FiSearch },
    { id: 'boms', label: 'BOMs/Projects', icon: FiFolder },
    { id: 'history', label: 'History', icon: FiClock },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ];

  // Add admin link for admin users
  if (isAdmin) {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: FiShield, isAdmin: true });
  }

  const handleLogout = () => {
    logout();
    onViewChange('logout');
  };

  return (
    <aside className={`app-sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${currentView === item.id ? 'sidebar-item-active' : ''} ${item.isAdmin ? 'admin-item' : ''}`}
              onClick={() => onViewChange(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon size={20} className="sidebar-icon" />
              {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button 
          className="sidebar-item sidebar-logout"
          onClick={handleLogout}
          title={sidebarCollapsed ? 'Logout' : undefined}
        >
          <FiLogOut size={20} className="sidebar-icon" />
          {!sidebarCollapsed && <span className="sidebar-label">Logout</span>}
        </button>
        
        <button 
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
          {!sidebarCollapsed && <span className="sidebar-label">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
