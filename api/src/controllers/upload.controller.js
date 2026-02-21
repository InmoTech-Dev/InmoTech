const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

const DEFAULT_UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const UPLOAD_MAX_BYTES = Number.parseInt(process.env.UPLOAD_MAX_BYTES || '', 10) || DEFAULT_UPLOAD_MAX_BYTES;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);
const DEFAULT_ALLOWED_FOLDERS = [
  'inmotech/inmuebles',
  'inmotech/perfiles',
  'inmotech/reportes'
];
const ALLOWED_UPLOAD_FOLDERS = (
  process.env.UPLOAD_ALLOWED_FOLDERS
    ? process.env.UPLOAD_ALLOWED_FOLDERS.split(',').map((value) => value.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_FOLDERS
);
const DEFAULT_UPLOAD_FOLDER = ALLOWED_UPLOAD_FOLDERS[0] || 'inmotech/inmuebles';

const resolveUploadFolder = (folderInput) => {
  const candidate = typeof folderInput === 'string' ? folderInput.trim() : '';
  if (!candidate) return DEFAULT_UPLOAD_FOLDER;
  if (!ALLOWED_UPLOAD_FOLDERS.includes(candidate)) {
    return null;
  }
  return candidate;
};

// Storage en memoria, con limites y validacion de tipo
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_MAX_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (!file || !ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      const invalidMimeTypeError = new Error('Tipo de archivo no permitido');
      invalidMimeTypeError.code = 'INVALID_FILE_TYPE';
      return cb(invalidMimeTypeError);
    }
    return cb(null, true);
  }
});

// Middleware de multer para una sola imagen con manejo controlado de errores
const uploadSingle = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `El archivo supera el limite permitido de ${Math.floor(UPLOAD_MAX_BYTES / (1024 * 1024))}MB`
      });
    }

    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no permitido'
      });
    }

    logger.error('Error en procesamiento de upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Error procesando archivo'
    });
  });
};

const subirImagen = async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      logger.error('Subida abortada: Cloudinary no está configurado correctamente');
      return res.status(500).json({ success: false, message: 'Servicio de imágenes no configurado' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se envió archivo' });
    }

    const requestedFolder =
      (req.body && req.body.folder) ||
      (req.query && req.query.folder) ||
      DEFAULT_UPLOAD_FOLDER;
    const folder = resolveUploadFolder(requestedFolder);
    if (!folder) {
      return res.status(400).json({
        success: false,
        message: 'Carpeta de destino no permitida'
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          return resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    return res.status(200).json({
      success: true,
      message: 'Imagen subida correctamente',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    logger.error('Error subiendo imagen a Cloudinary:', error);
    return res.status(500).json({
      success: false,
      message: 'Error subiendo imagen',
    });
  }
};

module.exports = {
  uploadSingle,
  subirImagen,
};
