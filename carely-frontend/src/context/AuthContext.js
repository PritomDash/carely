import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const readStoredUser = () => {
  const stored = localStorage.getItem('carelyUser');
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
};

export const AuthProvider = ({ children }) => {
  // user is hydrated synchronously from localStorage via the lazy useState
  // initializer, so it's never null-then-populated for an already-logged-in
  // visitor - but consumers like RootRedirect still need an explicit
  // "have we checked yet" signal for the very first render, otherwise a
  // route decision could theoretically run before this provider mounts.
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);

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
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
