import api from '../api/axios';

function getApiErrorMessage(error, fallbackMessage) {
  const apiMessage = error?.response?.data?.message || error?.response?.data?.Message;
  if (apiMessage) return apiMessage;

  const validationErrors = error?.response?.data?.errors;
  if (validationErrors && typeof validationErrors === 'object') {
    const first = Object.values(validationErrors).flat?.()?.[0];
    if (first) return String(first);
  }

  const detail = error?.response?.data?.detail || error?.response?.data?.title;
  if (detail) return String(detail);

  return fallbackMessage;
}

function unwrapResponse(response, fallbackMessage) {
  if (response?.data?.success) {
    return response.data.data;
  }

  throw new Error(response?.data?.message || fallbackMessage);
}

const profileService = {
  getMyProfile: async () => {
    try {
      const response = await api.get('/profile/me');
      return unwrapResponse(response, 'Impossible de charger le profil');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de charger le profil'));
    }
  },

  updateMyProfile: async (payload) => {
    try {
      const response = await api.put('/profile/me', payload);
      return unwrapResponse(response, 'Impossible de mettre a jour le profil');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de mettre a jour le profil'));
    }
  },

  uploadMyAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/profile/me/avatar', formData);
      return unwrapResponse(response, 'Impossible de mettre a jour la photo de profil');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de mettre a jour la photo de profil'));
    }
  }
};

export default profileService;
