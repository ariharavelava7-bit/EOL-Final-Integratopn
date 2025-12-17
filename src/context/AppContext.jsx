import React, { createContext, useContext, useState, useEffect } from 'react';

// In dev, Vite proxies `/api` to the backend (see `vite.config.js`).
// In prod, you can set `VITE_API_BASE_URL` to the backend origin (e.g. "https://api.example.com").
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentParts, setRecentParts] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);

  // Apply theme on mount and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check token and load user on mount
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
            await loadUserData();
          } else {
            // Token invalid
            logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  // Load user data (notifications, search history, etc.)
  const loadUserData = async () => {
    if (!token) return;

    try {
      // Load notifications
      const notifResponse = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notifResponse.ok) {
        const notifs = await notifResponse.json();
        const notifList = Array.isArray(notifs) ? notifs : [];
        setNotifications(notifList);
        setUnreadCount(notifList.filter(n => !n.is_read).length);
      }

      // Load search history
      const historyResponse = await fetch(`${API_BASE_URL}/api/search-history?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (historyResponse.ok) {
        const history = await historyResponse.json();
        const historyList = Array.isArray(history) ? history : [];
        setRecentParts(historyList.map(h => ({
          id: h.part_number,
          date: new Date(h.searched_at).toLocaleDateString()
        })));
      }

      // Load saved searches
      const savedResponse = await fetch(`${API_BASE_URL}/api/saved-searches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (savedResponse.ok) {
        const saved = await savedResponse.json();
        setSavedSearches(Array.isArray(saved) ? saved : []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.access_token);
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('token', data.access_token);
        await loadUserData();
        return { success: true };
      } else {
        return { success: false, error: data.detail || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.detail || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setNotifications([]);
    setRecentParts([]);
    setSavedSearches([]);
    localStorage.removeItem('token');
  };

  // Toggle theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  // Add to recent parts
  const addRecentPart = (partNumber) => {
    const newPart = {
      id: partNumber,
      date: new Date().toLocaleDateString()
    };
    setRecentParts(prev => {
      const filtered = prev.filter(p => p.id !== partNumber);
      return [newPart, ...filtered].slice(0, 10);
    });
  };

  // Save a search
  const saveSearch = async (name, partNumber, notes = '') => {
    if (!token) return { success: false };

    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-searches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, part_number: partNumber, notes })
      });

      if (response.ok) {
        const data = await response.json();
        setSavedSearches(prev => [{ id: data.id, name, part_number: partNumber, notes }, ...prev]);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  };

  // Delete saved search
  const deleteSavedSearch = async (searchId) => {
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/api/saved-searches/${searchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSavedSearches(prev => prev.filter(s => s.id !== searchId));
    } catch (error) {
      console.error('Error deleting saved search:', error);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Refresh notifications
  const refreshNotifications = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const notifs = await response.json();
        const notifList = Array.isArray(notifs) ? notifs : [];
        setNotifications(notifList);
        setUnreadCount(notifList.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  };

  // API helper function with auth
  const apiCall = async (endpoint, options = {}) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired');
    }

    return response;
  };

  const value = {
    // Auth
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    
    // Theme
    theme,
    toggleTheme,
    
    // Sidebar
    sidebarCollapsed,
    toggleSidebar,
    
    // Notifications
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshNotifications,
    
    // Search history
    recentParts,
    addRecentPart,
    savedSearches,
    saveSearch,
    deleteSavedSearch,
    
    // API helper
    apiCall,
    loadUserData
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="lt-loader-wrapper">
          <img src="/LT.png" alt="L&T Logo loading" className="lt-loader-img" />
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
