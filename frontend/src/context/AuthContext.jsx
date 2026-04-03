/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(() => !authService.hasStoredSession());

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const currentUser = await authService.fetchCurrentUser();
      if (!isMounted) return;

      setUser(currentUser);
      setLoading(false);
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password, turnstileToken) => {
    const userData = await authService.login(email, password, turnstileToken);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (userData) => {
    const newUser = await authService.register(userData);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await authService.logout();
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await authService.fetchCurrentUser();
    setUser(currentUser);
    return currentUser;
  }, []);

  const forgotPassword = useCallback(async (email, turnstileToken) => {
    return await authService.forgotPassword(email, turnstileToken);
  }, []);

  const resetPassword = useCallback(async (token, newPassword, confirmPassword) => {
    return await authService.resetPassword(token, newPassword, confirmPassword);
  }, []);

  const updateUser = useCallback((patch) => {
    const nextUser = authService.updateCurrentUser(patch);
    setUser(nextUser);
    return nextUser;
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    register,
    logout,
    refreshUser,
    forgotPassword,
    resetPassword,
    updateUser,
    isAuthenticated: !!user,
    loading
  }), [user, login, register, logout, refreshUser, forgotPassword, resetPassword, updateUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
