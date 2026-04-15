import axios, { AUTH_BOOTSTRAP_TIMEOUT_MS } from '../api/axios';

const AUTH_USER_STORAGE_KEY = 'mototun.auth.user';
const LEGACY_USER_STORAGE_KEY = 'user';
const LEGACY_TOKEN_STORAGE_KEY = 'token';

const roleByValue = Object.freeze({
  1: 'Client',
  2: 'Revendeur',
  3: 'Fournisseur',
  4: 'Admin'
});

function normalizeRole(value) {
  if (typeof value === 'number') {
    return roleByValue[value] || null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numeric = Number(trimmed);
    if (Number.isInteger(numeric) && roleByValue[numeric]) {
      return roleByValue[numeric];
    }

    return trimmed;
  }

  return null;
}

function normalizeUserPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const profile = payload.profile && typeof payload.profile === 'object' ? payload.profile : {};
  const normalizedRole = normalizeRole(payload.role) || normalizeRole(profile.role);
  const { role: profileRole, ...profileWithoutRole } = profile;

  return {
    ...payload,
    ...profileWithoutRole,
    role: normalizedRole || payload.role,
    profile: profileRole === undefined
      ? profileWithoutRole
      : { ...profileWithoutRole, role: normalizeRole(profileRole) || profileRole }
  };
}

function getSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage;
}

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function clearLegacyStorage() {
  const local = getLocalStorage();
  if (!local) return;

  local.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  local.removeItem(LEGACY_USER_STORAGE_KEY);
}

function readStoredUser() {
  const session = getSessionStorage();
  if (session) {
    const sessionUser = session.getItem(AUTH_USER_STORAGE_KEY);
    if (sessionUser) {
      return sessionUser;
    }
  }

  const local = getLocalStorage();
  const legacyUser = local?.getItem(LEGACY_USER_STORAGE_KEY);
  if (!legacyUser) {
    return null;
  }

  if (session) {
    session.setItem(AUTH_USER_STORAGE_KEY, legacyUser);
  }
  clearLegacyStorage();
  return legacyUser;
}

function clearStoredSession() {
  const session = getSessionStorage();
  if (session) {
    session.removeItem(AUTH_USER_STORAGE_KEY);
  }

  clearLegacyStorage();
}

function storeUserSnapshot(payload) {
  const session = getSessionStorage();
  if (!session) {
    return payload;
  }

  session.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(payload));
  clearLegacyStorage();
  return payload;
}

function persistSession(payload) {
  const normalized = normalizeUserPayload(payload);
  if (!normalized) {
    throw new Error('Invalid user payload');
  }

  const { token: _token, ...userSnapshot } = normalized;
  return storeUserSnapshot(userSnapshot);
}

const authService = {
  // Register new user (Revendeur or Fournisseur only)
  register: async (userData) => {
    try {
      const response = await axios.post('/Auth/register', userData);
      if (response.data.success) {
        return persistSession(response.data.data);
      }
      throw new Error(response.data.message || 'Impossible de creer le compte.');
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Impossible de creer le compte.';
    }
  },

  // Login existing user (Revendeur or Fournisseur only)
  login: async (email, password, turnstileToken) => {
    try {
      const response = await axios.post('/Auth/login', { email, password, turnstileToken });
      if (response.data.success) {
        // Check if user is Client (not allowed to login)
        if (response.data.data.role === 'Client') {
          throw new Error('Les clients n ont pas besoin de se connecter ici. Utilisez le lien recu par SMS ou WhatsApp.');
        }

        return persistSession(response.data.data);
      }
      throw new Error(response.data.message || 'Impossible de se connecter.');
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Impossible de se connecter.';
    }
  },

  forgotPassword: async (email, turnstileToken) => {
    try {
      const response = await axios.post('/Auth/forgot-password', { email, turnstileToken });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Impossible d envoyer le lien.');
      }

      return response.data.message || 'Si cet email existe, vous allez recevoir les instructions.';
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Impossible d envoyer le lien.';
    }
  },

  resetPassword: async (token, newPassword, confirmPassword) => {
    try {
      const response = await axios.post('/Auth/reset-password', {
        token,
        newPassword,
        confirmPassword
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Impossible de changer le mot de passe.');
      }

      return response.data.message || 'Mot de passe mis a jour.';
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Impossible de changer le mot de passe.';
    }
  },

  // Logout
  logout: async () => {
    clearStoredSession();
    try {
      await axios.post('/Auth/logout', {}, { skipAuthRedirect: true });
    } catch {
      // ignore network/logout API failures on client-side session clear
    }
  },

  // Refresh session from HttpOnly auth cookie
  fetchCurrentUser: async () => {
    try {
      const response = await axios.get('/Auth/me', {
        skipAuthRedirect: true,
        timeout: AUTH_BOOTSTRAP_TIMEOUT_MS
      });
      if (response.data?.success && response.data?.data) {
        return persistSession(response.data.data);
      }

      clearStoredSession();
      return null;
    } catch {
      clearStoredSession();
      return null;
    }
  },

  // Get current user from session storage fallback
  getCurrentUser: () => {
    const userStr = readStoredUser();
    if (userStr) {
      try {
        return normalizeUserPayload(JSON.parse(userStr));
      } catch {
        clearStoredSession();
        return null;
      }
    }

    return null;
  },

  // Update user snapshot in session storage (for profile updates)
  updateCurrentUser: (patch) => {
    const current = authService.getCurrentUser();
    if (!current) return null;

    const patchObject = patch && typeof patch === 'object' ? patch : {};
    const mergedProfile = {
      ...(current.profile || {}),
      ...(patchObject.profile && typeof patchObject.profile === 'object' ? patchObject.profile : {})
    };

    const next = normalizeUserPayload({
      ...current,
      ...patchObject,
      profile: mergedProfile
    });

    if (!next) return null;

    return storeUserSnapshot(next);
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!authService.getCurrentUser();
  },

  hasStoredSession: () => {
    return Boolean(readStoredUser());
  },

  // Get user role
  getUserRole: () => {
    const user = authService.getCurrentUser();
    return user?.role || null;
  }
};

export default authService;
