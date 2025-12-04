import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiSun, FiMoon, FiUser } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

function Header({ onMenuClick, sidebarOpen }) {
  const username = useMemo(() => {
    const defaultName = 'Harish M';
    const storedName = localStorage.getItem('username');
    if (!storedName) {
      localStorage.setItem('username', defaultName);
      return defaultName;
    }
    return storedName;
  }, []);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${sidebarOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        <div className="header-logo" aria-hidden="true">
          <img src="/LT.png" alt="L&T" className="header-logo-img" />
        </div>
        <div className="header-title">
          <h1>L&T-CORe</h1>
          <span className="header-subtitle">Component Obsolescence & Resilience Engine</span>
        </div>
      </div>
      <div className="header-right">
        <button 
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
        </button>
        <Link to="/profile" className="user-info-link">
          <div className="user-info">
            <span className="username">{username}</span>
            <div className="user-avatar" title={username}>
              <FiUser size={18} />
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}

export default Header;
