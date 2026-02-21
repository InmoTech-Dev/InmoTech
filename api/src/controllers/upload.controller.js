const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

// Storage en memoria, no escribimos a disco
const upload = multer({ storage: multer.memoryStorage() });

// Middleware de multer para una sola imagen
const uploadSingle = upload.single('file');

const subirImagen = async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      logger.error('Subida abortada: Cloudinary no está configurado correctamente');
      return res.status(500).json({ success: false, message: 'Servicio de imágenes no configurado' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se envió archivo' });
    }

    const folder =
      (req.body && req.body.folder) ||
      (req.query && req.query.folder) ||
      'inmotech/inmuebles';

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto', // permite pdf/imágenes
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
