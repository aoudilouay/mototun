import api from '../api/axios';

export const PartnershipStatus = Object.freeze({
  Pending: 0,
  Accepted: 1,
  Rejected: 2,
  Blocked: 3
});

export const UserRole = Object.freeze({
  Client: 1,
  Revendeur: 2,
  Fournisseur: 3,
  Admin: 4
});

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

const partnershipService = {
  getFournisseurDirectory: async () => {
    try {
      const response = await api.get('/partnership-requests/directory/fournisseurs');
      return unwrapResponse(response, 'Impossible de charger les fournisseurs');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de charger les fournisseurs'));
    }
  },

  getRevendeurDirectory: async () => {
    try {
      const response = await api.get('/partnership-requests/directory/revendeurs');
      return unwrapResponse(response, 'Impossible de charger les revendeurs');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de charger les revendeurs'));
    }
  },

  getSentRequests: async () => {
    try {
      const response = await api.get('/partnership-requests/sent');
      return unwrapResponse(response, 'Impossible de charger les demandes envoyees');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de charger les demandes envoyees'));
    }
  },

  getReceivedRequests: async () => {
    try {
      const response = await api.get('/partnership-requests/received');
      return unwrapResponse(response, 'Impossible de charger les demandes recues');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de charger les demandes recues'));
    }
  },

  createRequest: async (payload) => {
    try {
      const response = await api.post('/partnership-requests', payload);
      return unwrapResponse(response, 'Impossible de creer la demande');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de creer la demande'));
    }
  },

  acceptRequest: async (requestId) => {
    try {
      const response = await api.post(`/partnership-requests/${requestId}/accept`);
      return unwrapResponse(response, 'Impossible daccepter la demande');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible daccepter la demande'));
    }
  },

  rejectRequest: async (requestId, reason) => {
    try {
      const response = await api.post(`/partnership-requests/${requestId}/reject`, { reason });
      return unwrapResponse(response, 'Impossible de refuser la demande');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de refuser la demande'));
    }
  },

  blockConnection: async (requestId, reason) => {
    try {
      const response = await api.post(`/partnership-requests/${requestId}/block`, { reason });
      return unwrapResponse(response, 'Impossible de bloquer ce partenaire');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de bloquer ce partenaire'));
    }
  },

  removeConnection: async (requestId) => {
    try {
      const response = await api.delete(`/partnership-requests/${requestId}`);
      return unwrapResponse(response, 'Impossible de supprimer ce partenaire');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de supprimer ce partenaire'));
    }
  }
};

export default partnershipService;
