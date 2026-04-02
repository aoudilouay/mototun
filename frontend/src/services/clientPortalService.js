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

function getBaseUrl() {
  const base = api?.defaults?.baseURL || '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

const clientPortalService = {
  accessByCode: async (code) => {
    try {
      const response = await api.post(
        '/client-portal/access',
        { code },
        { skipAuthRedirect: true }
      );

      if (response?.data?.success) {
        return response.data.data;
      }

      throw new Error(response?.data?.message || 'Acces refuse');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Code invalide'));
    }
  },

  getDossier: async (invoiceId, code) => {
    try {
      const response = await api.get(`/client-portal/${invoiceId}`, {
        params: { code },
        skipAuthRedirect: true
      });

      if (response?.data?.success) {
        return response.data.data;
      }

      throw new Error(response?.data?.message || 'Dossier introuvable');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de charger le dossier'));
    }
  },

  uploadDocument: async (invoiceId, code, documentType, file) => {
    const formData = new FormData();
    formData.append('code', code);
    formData.append('documentType', String(documentType));
    formData.append('file', file);

    try {
      const response = await api.post(`/client-portal/${invoiceId}/documents`, formData, {
        skipAuthRedirect: true
      });

      if (response?.data?.success) {
        return response.data.data;
      }

      throw new Error(response?.data?.message || 'Echec upload');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de charger le document'));
    }
  },

  getDownloadUrl: (invoiceId, documentId, code) => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/client-portal/${invoiceId}/documents/${documentId}/download?code=${encodeURIComponent(code)}`;
  },

  getInvoicePdfUrl: (invoiceId, code) => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/client-portal/${invoiceId}/invoice-pdf?code=${encodeURIComponent(code)}`;
  }
};

export default clientPortalService;
