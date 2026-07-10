import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// 15s: long enough for Render's free-tier cold start / a slow BD mobile
// connection, short enough that a request that's genuinely stuck doesn't
// leave the UI hanging silently for 30s+ with no feedback.
const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('carelyToken');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

// Only a request that actually carried a token counts as a session expiry -
// a 401 from a public endpoint (e.g. wrong password on /auth/login) must
// not clear storage or redirect, since that would wipe out the login page's
// own "Invalid email or password" handling.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = !!error.config?.headers?.Authorization;
    if (error.response?.status === 401 && hadToken) {
      localStorage.removeItem('carelyToken');
      localStorage.removeItem('carelyUser');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
