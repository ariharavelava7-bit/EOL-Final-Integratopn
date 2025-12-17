import React, { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Auth Context
export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Theme Context
export const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : { name: 'Harish M', initials: 'HM', email: 'harish.m@lt.com' };
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/dashboard');
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated }}>
      <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
        <Layout />
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;

