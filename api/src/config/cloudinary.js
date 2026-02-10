const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_URL } = process.env;

if (!CLOUDINARY_CLOUD_NAME && !CLOUDINARY_URL) {
  logger.error('Cloudinary no configurado: falta CLOUDINARY_CLOUD_NAME o CLOUDINARY_URL');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
  // CLOUDINARY_URL se usa como fallback si está definida
  ...(CLOUDINARY_URL ? { cloudinary_url: CLOUDINARY_URL } : {})
});

module.exports = cloudinary;
