import api from '../api/axios';
import { getApiBaseUrl } from '../features/documents/documentPreview';

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
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/client-portal/${invoiceId}/documents/${documentId}/download?code=${encodeURIComponent(code)}`;
  },

  getInlinePreviewUrl: (invoiceId, documentId, code) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/client-portal/${invoiceId}/documents/${documentId}/inline?code=${encodeURIComponent(code)}`;
  },

  getDocumentAccessUrl: async (invoiceId, documentId, code) => {
    try {
      const response = await api.get(`/client-portal/${invoiceId}/documents/${documentId}/access-url`, {
        params: { code },
        skipAuthRedirect: true,
        timeout: 10000
      });

      if (response?.data?.success && response.data.data?.url) {
        return response.data.data;
      }

      throw new Error(response?.data?.message || 'Acces document indisponible');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible de preparer le document'));
    }
  },

  getInvoicePdfUrl: (invoiceId, code) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/client-portal/${invoiceId}/invoice-pdf?code=${encodeURIComponent(code)}`;
  },

  getInvoicePdfInlineUrl: (invoiceId, code) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/client-portal/${invoiceId}/invoice-pdf/inline?code=${encodeURIComponent(code)}`;
  }
};

export default clientPortalService;
