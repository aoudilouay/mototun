import axios from '../api/axios';

const authService = {
  // Register new user (Revendeur or Fournisseur only)
  register: async (userData) => {
    try {
      const response = await axios.post('/Auth/register', userData);
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        return response.data.data;
      }
      throw new Error(response.data.message || 'Registration failed');
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Registration failed';
    }
  },

  // Login existing user (Revendeur or Fournisseur only)
  login: async (email, password) => {
    try {
      const response = await axios.post('/Auth/login', { email, password });
      if (response.data.success) {
        // Check if user is Client (not allowed to login)
        if (response.data.data.role === 'Client') {
          throw new Error('Les clients n\'ont pas accès à cette page. Utilisez votre lien portal unique.');
        }
        
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        return response.data.data;
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Login failed';
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get user role
  getUserRole: () => {
    const user = authService.getCurrentUser();
    return user?.role || null;
  },
};

export default authService;
