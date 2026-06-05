import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fetch current user details on app startup
  const fetchCurrentUser = async (showLoadingScreen = false) => {
    try {
      if (showLoadingScreen) setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/current-user`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok && data.success) {
          setUser(data.data);
        } else {
          setUser(null);
        }
      } else {
        // Fallback for non-JSON responses (like Render waking up HTML)
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user session:", err);
      setUser(null);
    } finally {
      if (showLoadingScreen) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser(true);
  }, []);

  // Register user (with avatar file upload)
  const register = async (formData) => {
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/register`, {
        method: 'POST',
        body: formData // Form data handles content-type boundary
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Login user
  const login = async (emailOrUsername, password) => {
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      setUser(data.data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Google Login
  const googleLogin = async (credential) => {
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Google authentication failed");
      }
      setUser(data.data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/users/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      theme,
      register,
      login,
      googleLogin,
      logout,
      toggleTheme,
      fetchCurrentUser,
      setError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
