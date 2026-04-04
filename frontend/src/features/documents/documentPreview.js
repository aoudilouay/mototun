import api from '../../api/axios';

export function getApiBaseUrl() {
  const base = api?.defaults?.baseURL || '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export function buildApiUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function resolveDocumentPreviewKind(contentType, fileName) {
  const type = String(contentType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();

  if (type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|avif|heic|heif|jfif)$/.test(name)) {
    return 'image';
  }

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return 'pdf';
  }

  return 'other';
}

export function buildPdfPreviewUrl(url) {
  if (!url) return '';
  return `${url}${url.includes('#') ? '&' : '#'}toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
}

export function startBrowserDownload(url) {
  if (!url) return;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function logDocumentPreviewMetric(label, payload) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info(`[document-preview] ${label}`, payload);
}
