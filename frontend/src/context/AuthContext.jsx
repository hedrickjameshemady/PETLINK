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
      setUser(JSON.parse(saved)); // show something instantly

      // Then quietly re-fetch from the server so profile_photo is always up to date
      API.get('/auth/me')
        .then(({ data }) => {
          const fresh = {
            id: data.id,
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            role: data.role,
            profile_photo: data.profile_photo,
          };
          localStorage.setItem('petlink_user', JSON.stringify(fresh));
          setUser(fresh);
        })
        .catch(() => { /* offline or bad token — keep the cached copy */ })
        .finally(() => setLoading(false));
      return;
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

  // Merge updated fields into the logged-in user and persist them
  const updateUser = (fields) => {
    setUser(prev => {
      const merged = { ...prev, ...fields };
      localStorage.setItem('petlink_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading, API }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };

// One single place that decides what image to show for a person.
// If they uploaded a photo → use it. If not → auto-generate a nice initials circle.
export function avatarUrl(person) {
  if (!person) return '';
  if (person.profile_photo) return `http://localhost:5000${person.profile_photo}`;
  const name = `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.name || '?';
  return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=e5e7eb&color=374151&size=200';
}
