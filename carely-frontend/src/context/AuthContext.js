import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('carelyUser');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  const login = async (email, password, isAdmin = false) => {
    const url = isAdmin ? '/api/admin/login' : '/api/auth/login';
    const res = await axios.post(url, { email, password });
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
