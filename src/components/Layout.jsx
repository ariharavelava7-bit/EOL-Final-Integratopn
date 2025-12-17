import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import Dashboard from './Dashboard';
import Login from './Login';
import ComparisonPage from './ComparisonPage';
import BOMs from '../pages/BOMs';
import History from '../pages/History';
import Settings from '../pages/Settings';
import Profile from '../pages/Profile';
import Admin from '../pages/Admin';
import Notifications from '../pages/Notifications';
import './Layout.css';

function Layout() {
  const { isAuthenticated, sidebarCollapsed, addRecentPart, user } = useApp();
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  const handleSearch = () => {
    if (searchValue.trim()) {
      setSearchQuery(searchValue);
      addRecentPart(searchValue.trim());
      setCurrentView('find-parts');
    }
  };

  const handleNavigate = (view) => {
    if (view === 'logout') {
      // Logout is handled by the context
      return;
    }
    setCurrentView(view);
    // Clear comparison data when navigating away
    if (view !== 'comparison') {
      setComparisonData(null);
    }
  };

  const handleLogin = () => {
    setCurrentView('dashboard');
  };

  // Handle navigation to comparison page
  const handleCompare = (eolPart, alternates) => {
    setComparisonData({ eolPart, alternates });
    setCurrentView('comparison');
  };

  // Go back from comparison page
  const handleBackFromComparison = () => {
    setCurrentView('find-parts');
    setComparisonData(null);
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
      case 'find-parts':
        return (
          <Dashboard
            currentView={currentView}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            loading={loading}
            setLoading={setLoading}
            onCompare={handleCompare}
          />
        );
      case 'comparison':
        return (
          <ComparisonPage
            eolPart={comparisonData?.eolPart}
            alternates={comparisonData?.alternates}
            onBack={handleBackFromComparison}
          />
        );
      case 'boms':
        return <BOMs />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile />;
      case 'admin':
        return <Admin />;
      case 'notifications':
        return <Notifications />;
      default:
        return (
          <div className="placeholder-view">
            <h2>{currentView.replace('-', ' ').toUpperCase()}</h2>
            <p>This section is under development</p>
          </div>
        );
    }
  };

  // Full-page views without sidebar/header
  if (currentView === 'comparison') {
    return (
      <div className="app-layout comparison-layout">
        <ComparisonPage
          eolPart={comparisonData?.eolPart}
          alternates={comparisonData?.alternates}
          onBack={handleBackFromComparison}
        />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Header
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearch={handleSearch}
        onNavigate={handleNavigate}
        loading={loading}
      />
      
      <Sidebar
        currentView={currentView}
        onViewChange={handleNavigate}
        isAdmin={user?.role === 'admin'}
      />
      
      <main className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="main-content-wrapper">
          {renderView()}
        </div>
        <Footer />
      </main>
    </div>
  );
}

export default Layout;
