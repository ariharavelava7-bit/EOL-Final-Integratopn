import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiLayout, 
  FiSearch, 
  FiFileText, 
  FiClock, 
  FiSettings, 
  FiLogOut,
  FiUser
} from 'react-icons/fi';
import './Sidebar.css';

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiLayout },
    { path: '/analysis', label: 'Part Analysis', icon: FiSearch },
    { path: '/reports', label: 'Reports', icon: FiFileText },
    { path: '/history', label: 'History', icon: FiClock },
    { path: '/settings', label: 'Settings', icon: FiSettings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path} className="sidebar-item">
                  <Link
                    to={item.path}
                    className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon className="sidebar-icon" size={18} />
                    <span className="sidebar-label">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <FiLogOut className="sidebar-icon" size={18} />
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
