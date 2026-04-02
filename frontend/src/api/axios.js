import axios from 'axios';

const AUTH_USER_STORAGE_KEY = 'mototun.auth.user';
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();

if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL must be configured for production builds.');
}

export const API_BASE_URL = configuredApiBaseUrl || '/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

// Normalize multipart uploads: let browser manage boundary.
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (logout)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const shouldSkipAuthRedirect = Boolean(error.config?.skipAuthRedirect);
    const hasSession = Boolean(
      sessionStorage.getItem(AUTH_USER_STORAGE_KEY)
      || localStorage.getItem('user')
      || localStorage.getItem('token')
    );

    if (error.response?.status === 401 && hasSession && !shouldSkipAuthRedirect) {
      sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
