import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const baseURL = (apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`) + '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
