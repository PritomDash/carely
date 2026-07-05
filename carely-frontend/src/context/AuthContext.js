import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const readStoredUser = () => {
  const stored = localStorage.getItem('carelyUser');
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    const syncFromStorage = () => setUser(readStoredUser());
    window.addEventListener('carely-auth-changed', syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener('carely-auth-changed', syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const login = async (email, password, isAdmin = false) => {
    const url = isAdmin ? '/api/admin/login' : '/api/auth/login';
    const res = await api.post(url, { email, password });
    const loggedUser = res.data.user || res.data.admin;
    const token = res.data.token;
    localStorage.setItem('carelyUser', JSON.stringify(loggedUser));
    localStorage.setItem('carelyToken', token);
    if (isAdmin) localStorage.setItem('adminToken', token);
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = () => {
    localStorage.removeItem('carelyUser');
    localStorage.removeItem('carelyToken');
    localStorage.removeItem('adminToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
