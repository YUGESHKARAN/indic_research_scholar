import React, { createContext, useContext, useEffect, useState } from 'react';
import axiosInstance, { setUnauthorizedHandler } from './instances/axiosInstance';

const AuthContext = createContext(null);

const AUTH_BASE = '/api/scholar';
const USER_STORAGE_KEY = 'scholar_user';

export function AuthProvider({ children }) {
  // Initialize from localStorage
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const saveUser = (userData) => {
    setUser(userData);

    if (userData) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const fetchMe = async () => {
    try {
      const res = await axiosInstance.get(`${AUTH_BASE}/me`);
      saveUser(res.data.user);
    } catch (err) {
      // Keep cached user if this is only a temporary network error
      if (err.response?.status === 401) {
        saveUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      saveUser(null);
    });

    fetchMe();
  }, []);

  const login = async (email, password) => {
    const res = await axiosInstance.post(`${AUTH_BASE}/login`, {
      email,
      password,
    });

    saveUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await axiosInstance.post(`${AUTH_BASE}/register`, {
      name,
      email,
      password,
    });

    saveUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await axiosInstance.post(`${AUTH_BASE}/logout`);
    } finally {
      saveUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return ctx;
}