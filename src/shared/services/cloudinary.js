import { API_CONFIG } from './api.config';

/**
 * Sube un archivo a Cloudinary a través del backend.
 * @param {File|Blob} file - Archivo a subir.
 * @param {Object} options - Opciones adicionales (ej: folder).
 * @returns {Promise<Object>} Información del recurso subido.
 */
export async function uploadToCloudinary(file, options = {}) {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo para subir');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (options.folder) {
    formData.append('folder', options.folder);
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}/files/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || `Error ${response.status} al subir archivo`;
    throw new Error(message);
  }

  const body = await response.json();
  const data = body?.data || body;

  return {
    url: data?.url || data?.secure_url || '',
    secure_url: data?.secure_url || data?.url || '',
    public_id: data?.public_id || '',
    format: data?.format || '',
    bytes: data?.bytes || 0,
    raw: data,
  };
}

export default {
  uploadToCloudinary,
};
