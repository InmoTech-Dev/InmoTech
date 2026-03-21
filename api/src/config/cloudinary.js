const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');
const { isProduction } = require('./runtime');

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_URL } = process.env;
const hasCloudinaryUrl = Boolean(CLOUDINARY_URL);
const hasCloudinaryCredentials = Boolean(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
);
const isCloudinaryConfigured = () => hasCloudinaryUrl || hasCloudinaryCredentials;

if (!isCloudinaryConfigured()) {
  const logMethod = isProduction ? 'error' : 'warn';
  logger[logMethod](
    '[CLOUDINARY] Configuracion incompleta. Define CLOUDINARY_URL o CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.'
  );
}

if (hasCloudinaryUrl) {
  cloudinary.config(CLOUDINARY_URL);
  cloudinary.config({
    secure: true,
    disable_promise: true
  });
} else {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
    disable_promise: true
  });
}

cloudinary.isConfigured = isCloudinaryConfigured;

module.exports = cloudinary;
