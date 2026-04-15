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

      throw new Error(response?.data?.message || 'Acces refuse.');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Code incorrect.'));
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

      throw new Error(response?.data?.message || 'Dossier introuvable.');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible d ouvrir le dossier.'));
    }
  },

  uploadDocument: async (invoiceId, code, documentType, file, options = {}) => {
    const formData = new FormData();
    formData.append('code', code);
    formData.append('documentType', String(documentType));
    formData.append('file', file);

    try {
      const response = await api.post(`/client-portal/${invoiceId}/documents`, formData, {
        skipAuthRedirect: true,
        onUploadProgress: typeof options.onProgress === 'function'
          ? (progressEvent) => {
            const total = Number(progressEvent.total);
            const loaded = Number(progressEvent.loaded);
            if (!Number.isFinite(total) || total <= 0) {
              options.onProgress(0, { loaded, total: null });
              return;
            }

            const percent = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
            options.onProgress(percent, { loaded, total });
          }
          : undefined
      });

      if (response?.data?.success) {
        return response.data.data;
      }

      throw new Error(response?.data?.message || 'Impossible d envoyer le document.');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible d envoyer le document.'));
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

      throw new Error(response?.data?.message || 'Document indisponible.');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Impossible d ouvrir le document.'));
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
