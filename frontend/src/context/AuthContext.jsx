import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('petlink_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('petlink_token');
    const saved = localStorage.getItem('petlink_user');
    if (token && saved) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('petlink_token', data.token);
    localStorage.setItem('petlink_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    localStorage.setItem('petlink_token', data.token);
    localStorage.setItem('petlink_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('petlink_token');
    localStorage.removeItem('petlink_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, API }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
