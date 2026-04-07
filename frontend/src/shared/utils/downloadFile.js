import { getFileExtension, getFileNameFromUrl, normalizeRemoteUrl, sanitizeFileName } from '@/shared/utils/fileUrl';

const MIME_EXTENSION_MAP = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

const getFileNameFromDisposition = (contentDisposition = '') => {
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);

  const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return asciiMatch?.[1] ? asciiMatch[1] : '';
};

const ensureFileExtension = (fileName = '', mimeType = '') => {
  if (getFileExtension(fileName)) return fileName;
  const extension = MIME_EXTENSION_MAP[mimeType] || '';
  return extension ? `${fileName}.${extension}` : fileName;
};

export async function downloadFile(url, fileName) {
  const normalizedUrl = normalizeRemoteUrl(url);
  if (!normalizedUrl) {
    throw new Error('No se proporcionó una URL válida para descargar el archivo.');
  }

  let objectUrl = '';

  try {
    const response = await fetch(normalizedUrl);
    if (!response.ok) {
      throw new Error(`No se pudo descargar el archivo. Código ${response.status}.`);
    }

    const blob = await response.blob();
    const headerFileName = getFileNameFromDisposition(response.headers.get('content-disposition') || '');
    const inferredFileName = fileName || headerFileName || getFileNameFromUrl(normalizedUrl, 'archivo');
    const finalFileName = sanitizeFileName(ensureFileExtension(inferredFileName, blob.type), 'archivo');

    objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = finalFileName;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    return {
      fileName: finalFileName,
      fileSize: blob.size,
      mimeType: blob.type,
    };
  } catch (error) {
    throw new Error(error?.message || 'Ocurrió un error al descargar el archivo.');
  } finally {
    if (objectUrl) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  }
}

export default downloadFile;
