import api from '../api/axios';

function getApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.response?.data?.Message || fallbackMessage;
}

function extractData(response, fallback = null) {
  if (response?.data?.data !== undefined) return response.data.data;
  return fallback;
}

const supportService = {
  listTickets: async (params = {}) => {
    try {
      const response = await api.get('/support/tickets', { params });
      return extractData(response, []);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de charger les tickets support.'));
    }
  },

  getTicket: async (ticketId) => {
    try {
      const response = await api.get(`/support/tickets/${ticketId}`);
      return extractData(response, null);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de charger ce ticket.'));
    }
  },

  createTicket: async (payload) => {
    try {
      const response = await api.post('/support/tickets', payload);
      return extractData(response, null);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de creer le ticket.'));
    }
  },

  sendMessage: async (ticketId, message) => {
    try {
      const response = await api.post(`/support/tickets/${ticketId}/messages`, { message });
      return extractData(response, null);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible d envoyer le message.'));
    }
  },

  updateStatus: async (ticketId, status) => {
    try {
      const response = await api.patch(`/support/tickets/${ticketId}/status`, { status });
      return extractData(response, null);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de mettre a jour le statut.'));
    }
  }
};

export default supportService;
