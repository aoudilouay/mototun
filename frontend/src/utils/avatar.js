import { API_BASE_URL } from '../api/axios';

const backendOrigin = String(import.meta.env.VITE_BACKEND_ORIGIN || '').replace(/\/+$/, '');
const apiOrigin = String(API_BASE_URL || '').replace(/\/api\/?$/i, '').replace(/\/+$/, '');

export function resolveAvatarUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized) || /^data:image\//i.test(normalized)) {
    return normalized;
  }

  let relative = normalized.replace(/^\/+/, '');
  const storageMarkerIndex = relative.toLowerCase().indexOf('storage/');
  if (storageMarkerIndex > 0) {
    relative = relative.slice(storageMarkerIndex);
  }
  if (/^storage\//i.test(relative)) {
    relative = `Storage/${relative.slice('storage/'.length)}`;
  }
  if (!relative) return '';

  const assetOrigin = apiOrigin || backendOrigin;
  if (!assetOrigin) {
    return `/${relative}`;
  }

  return `${assetOrigin}/${relative}`;
}

export function hasAvatarImage(value) {
  return Boolean(resolveAvatarUrl(value));
}
