import axios from 'axios';

const AUTH_USER_STORAGE_KEY = 'mototun.auth.user';
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();
const parsedDefaultTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const parsedUploadTimeout = Number(import.meta.env.VITE_API_UPLOAD_TIMEOUT_MS);

export const DEFAULT_API_TIMEOUT_MS = Number.isFinite(parsedDefaultTimeout) && parsedDefaultTimeout > 0
  ? parsedDefaultTimeout
  : 10000;
export const DEFAULT_UPLOAD_TIMEOUT_MS = Number.isFinite(parsedUploadTimeout) && parsedUploadTimeout > 0
  ? parsedUploadTimeout
  : 180000;
export const AUTH_BOOTSTRAP_TIMEOUT_MS = Math.min(DEFAULT_API_TIMEOUT_MS, 5000);

if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL must be configured for production builds.');
}

export const API_BASE_URL = configuredApiBaseUrl || '/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: DEFAULT_API_TIMEOUT_MS
});

// Normalize multipart uploads: let browser manage boundary.
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      const configuredTimeout = Number(config.timeout);
      if (!Number.isFinite(configuredTimeout) || configuredTimeout < DEFAULT_UPLOAD_TIMEOUT_MS) {
        config.timeout = DEFAULT_UPLOAD_TIMEOUT_MS;
      }
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
    if (error.code === 'ECONNABORTED' || /timeout/i.test(String(error.message || ''))) {
      error.message = 'L envoi prend trop de temps. Verifiez votre connexion puis reessayez.';
    }

    const shouldSkipAuthRedirect = Boolean(error.config?.skipAuthRedirect);
    const hasSession = Boolean(
      (typeof window !== 'undefined' && window.sessionStorage?.getItem(AUTH_USER_STORAGE_KEY))
      || (typeof window !== 'undefined' && window.localStorage?.getItem('user'))
      || (typeof window !== 'undefined' && window.localStorage?.getItem('token'))
    );

    if (error.response?.status === 401 && hasSession && !shouldSkipAuthRedirect) {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.removeItem(AUTH_USER_STORAGE_KEY);
        window.localStorage?.removeItem('token');
        window.localStorage?.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
