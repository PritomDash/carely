import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('carelyToken');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

export default api;
export { API_BASE };
