const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif'];
const PDF_EXTENSION = 'pdf';

export const normalizeRemoteUrl = (url = '') => {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return '';
  if (rawUrl.startsWith('//')) return `https:${rawUrl}`;
  return rawUrl;
};

export const sanitizeFileName = (fileName = '', fallback = 'archivo') => {
  const trimmed = String(fileName || '').trim();
  const normalized = trimmed || fallback;
  return normalized.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').slice(0, 180);
};

const getPathName = (url = '') => {
  try {
    const baseOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';

    return new URL(normalizeRemoteUrl(url), baseOrigin).pathname || '';
  } catch (_error) {
    return '';
  }
};

export const getFileExtension = (value = '') => {
  const candidate = String(value || '').split('.').pop()?.toLowerCase() || '';
  return candidate.includes('/') ? '' : candidate;
};

export const getFileNameFromUrl = (url = '', fallback = 'archivo') => {
  const pathName = getPathName(url);
  const rawName = decodeURIComponent(pathName.split('/').pop() || '').trim();
  return sanitizeFileName(rawName, fallback);
};

export const isPdfUrl = (url = '', fileName = '') => {
  const pathExtension = getFileExtension(getPathName(url));
  const fileNameExtension = getFileExtension(fileName);
  return pathExtension === PDF_EXTENSION || fileNameExtension === PDF_EXTENSION;
};

export const isImageUrl = (url = '', fileName = '') => {
  const pathExtension = getFileExtension(getPathName(url));
  const fileNameExtension = getFileExtension(fileName);
  return IMAGE_EXTENSIONS.includes(pathExtension) || IMAGE_EXTENSIONS.includes(fileNameExtension);
};
