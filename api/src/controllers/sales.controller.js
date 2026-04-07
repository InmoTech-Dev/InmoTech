const fs = require('fs');
const path = require('path');
const saleService = require('../services/sales.service');
const personaService = require('../services/persona.service');
const logger = require('../utils/logger');
const { VentaAdjunto } = require('../models');
const cloudinary = require('../config/cloudinary');
const { apiBaseUrl } = require('../config/runtime');
const { uploadSingleAny } = require('./upload.controller');
const { normalizePagination } = require('../utils/pagination');

class SalesController {
  getLocalUploadsRoot() {
    return path.join(__dirname, '..', '..', 'public', 'uploads');
  }

  sanitizeAttachmentFileName(fileName = '') {
    const baseName = path.basename(String(fileName || '').trim() || 'adjunto');
    const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return sanitized || 'adjunto';
  }

  buildLocalAttachmentRelativePath(saleId, fileName) {
    return `/uploads/ventas/${saleId}/${fileName}`;
  }

  buildAttachmentPublicUrl(relativePath = '') {
    const normalizedPath = String(relativePath || '').trim();
    if (!normalizedPath) return '';
    const baseUrl = String(apiBaseUrl || '').replace(/\/+$/, '');
    return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
  }

  resolveLocalAttachmentFilePath(rawUrl = '') {
    const value = String(rawUrl || '').trim();
    if (!value) return null;

    let pathname = value;
    try {
      pathname = new URL(value).pathname;
    } catch (_error) {
      pathname = value;
    }

    const normalizedPath = pathname.replace(/\\/g, '/');
    if (!normalizedPath.startsWith('/uploads/')) {
      return null;
    }

    const relativePath = normalizedPath.replace(/^\/uploads\/+/, '');
    if (!relativePath) return null;

    return path.join(this.getLocalUploadsRoot(), ...relativePath.split('/'));
  }

  async saveAttachmentLocally(saleId, file) {
    const safeOriginalName = this.sanitizeAttachmentFileName(file?.originalname || 'adjunto');
    const fileName = `${Date.now()}-${safeOriginalName}`;
    const targetDir = path.join(this.getLocalUploadsRoot(), 'ventas', String(saleId));
    await fs.promises.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, fileName);
    await fs.promises.writeFile(targetPath, file.buffer);

    const relativePath = this.buildLocalAttachmentRelativePath(saleId, fileName);
    return {
      nombreArchivo: safeOriginalName,
      url: this.buildAttachmentPublicUrl(relativePath),
      filePath: targetPath,
    };
  }

  buildContentDisposition(fileName, disposition = 'inline') {
    const safeName = String(fileName || 'archivo').replace(/["\r\n]/g, '').trim() || 'archivo';
    const encodedName = encodeURIComponent(safeName);
    return `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
  }

  getFileExtension(fileName = '') {
    const match = String(fileName || '').trim().match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  buildCloudinaryAttachmentUrl(uploadResult, resourceType, originalFileName = '') {
    if (uploadResult?.secure_url) {
      return uploadResult.secure_url;
    }

    const publicId = uploadResult?.public_id;
    if (!publicId) return '';

    const extension = uploadResult?.format || this.getFileExtension(originalFileName);
    return cloudinary.url(publicId, {
      resource_type: resourceType,
      type: 'upload',
      secure: true,
      format: extension || undefined,
    });
  }

  buildAlternativeAttachmentUrls(adjunto = {}) {
    const originalUrl = String(adjunto?.url || '').trim();
    if (!originalUrl) return [];

    const expectedResourceType = String(adjunto?.mime_type || '').toLowerCase().includes('pdf') ? 'raw' : 'image';
    const candidates = new Set();
    candidates.add(originalUrl);

    const replacement =
      expectedResourceType === 'raw'
        ? originalUrl.replace('/image/upload/', '/raw/upload/')
        : originalUrl.replace('/raw/upload/', '/image/upload/');

    const extension = this.getFileExtension(adjunto?.nombre_archivo || '');
    if (replacement && replacement !== originalUrl) {
      candidates.add(replacement);
      if (extension && !replacement.toLowerCase().includes(`.${extension}`)) {
        candidates.add(`${replacement}.${extension}`);
      }
    }

    // Compatibilidad con adjuntos viejos generados manualmente como /upload/v1/...
    if (originalUrl.includes('/upload/v1/')) {
      candidates.add(originalUrl.replace('/upload/v1/', '/upload/'));
    }
    if (replacement && replacement.includes('/upload/v1/')) {
      candidates.add(replacement.replace('/upload/v1/', '/upload/'));
    }

    return Array.from(candidates).filter(Boolean);
  }

  async createSale(req, res, next) {
    try {
      const data = req.validatedData || req.body;
      const newSale = await saleService.createSale(data);
      return res.status(201).json({ 
        success: true, 
        message: 'Venta creada exitosamente',
        data: newSale 
      });
    } catch (error) {
      if (error.message.includes('no encontrado')) {
        return res.status(400).json({ 
          success: false, 
          message: error.message 
        });
      }
      next(error);
    }
  }

  async getAllSales(req, res, next) {
    try {
      const filters = {};

      if (req.query.estado) {
        filters.estado = req.query.estado;
      }

      if (req.query.tipo_compra) {
        filters.tipo_compra = req.query.tipo_compra;
      }

      if (req.query.id_persona) {
        filters.id_persona = parseInt(req.query.id_persona);
      }

      if (req.query.fecha_inicio && req.query.fecha_fin) {
        filters.fecha_inicio = req.query.fecha_inicio;
        filters.fecha_fin = req.query.fecha_fin;
      }

      if (req.query.search) {
        filters.search = req.query.search;
      }

      filters.pagination = normalizePagination(req.query, { defaultLimit: 5, maxLimit: 5 });

      const result = await saleService.getAllSales(filters);

      return res.status(200).json({
        success: true,
        message: 'Ventas obtenidas exitosamente',
        data: result.data,
        total: result.pagination.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getSaleById(req, res, next) {
    try {
      const { id } = req.params;
      const sale = await saleService.getSaleById(parseInt(id));

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Venta obtenida exitosamente',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSale(req, res, next) {
    try {
      const { id } = req.params;
      const sale = await saleService.updateSale(parseInt(id), req.validatedData || req.body);

      return res.status(200).json({
        success: true,
        message: 'Venta actualizada exitosamente',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelSale(req, res, next) {
    try {
      const { id } = req.params;
      const sale = await saleService.cancelSale(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Venta cancelada exitosamente',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { id } = req.params;
      const result = await saleService.changeStatus(
        parseInt(id),
        req.validatedData || req.body,
        req.user || {}
      );

      await personaService.sincronizarPropietarioPorVenta(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Estado de venta actualizado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async finalizeSale(req, res, next) {
    try {
      const { id } = req.params;
      const sale = await saleService.finalizeSale(parseInt(id));
      await personaService.sincronizarPropietarioPorVenta(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Venta finalizada exitosamente',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }

  async addTracking(req, res, next) {
    try {
      const { id } = req.params;
      const trackingData = req.validatedData || req.body;
      const tracking = await saleService.addTracking(parseInt(id), trackingData);

      return res.status(201).json({
        success: true,
        message: 'Seguimiento agregado exitosamente',
        data: tracking
      });
    } catch (error) {
      next(error);
    }
  }

  async getTracking(req, res, next) {
    try {
      const { id } = req.params;
      const tracking = await saleService.getTracking(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Seguimientos obtenidos exitosamente',
        data: tracking,
        total: tracking.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatusCatalog(req, res, next) {
    try {
      const estados = await saleService.getStatusCatalog();
      return res.status(200).json({
        success: true,
        message: 'Estados de venta obtenidos exitosamente',
        data: estados
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const statistics = await saleService.getSalesStatistics();

      return res.status(200).json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  // Adjuntar comprobante/contrato a una venta
  attachMiddleware() {
    return uploadSingleAny;
  }

  async addAttachment(req, res, next) {
    try {
      const { id } = req.params;
      const saleId = parseInt(id);
      const { tipo } = req.body;
      if (!['comprobante', 'contrato'].includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: "El tipo debe ser 'comprobante' o 'contrato'"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Debe enviar un archivo en el campo file'
        });
      }

      const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
      let attachmentUrl = '';
      let originalFileName = req.file.originalname;

      if (typeof cloudinary.isConfigured === 'function' && cloudinary.isConfigured()) {
        try {
          const folder = `inmotech/ventas/${saleId}`;
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder,
                resource_type: resourceType,
                timeout: 120000,
              },
              (error, result) => {
                if (error) return reject(error);
                return resolve(result);
              }
            );
            stream.end(req.file.buffer);
          });

          attachmentUrl = this.buildCloudinaryAttachmentUrl(uploadResult, resourceType, req.file.originalname);
          originalFileName = req.file.originalname || uploadResult.original_filename || originalFileName;
        } catch (uploadError) {
          logger.warn(`Cloudinary no disponible para adjunto de venta ${saleId}. Se usa almacenamiento local. Motivo: ${uploadError.message}`);
        }
      }

      if (!attachmentUrl) {
        const localFile = await this.saveAttachmentLocally(saleId, req.file);
        attachmentUrl = localFile.url;
        originalFileName = req.file.originalname || localFile.nombreArchivo;
      }

      const adjunto = await VentaAdjunto.create({
        id_venta: saleId,
        tipo,
        nombre_archivo: originalFileName,
        url: attachmentUrl,
        mime_type: req.file.mimetype || null,
        tamano_bytes: req.file.size || null
      });

      return res.status(201).json({
        success: true,
        message: 'Adjunto guardado correctamente',
        data: adjunto
      });
    } catch (error) {
      logger.error(`Error al subir adjunto de venta: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'No se pudo guardar el adjunto'
      });
    }
  }

  async listAttachments(req, res, next) {
    try {
      const saleId = parseInt(req.params.id);
      const adjuntos = await VentaAdjunto.findAll({
        where: { id_venta: saleId },
        order: [['fecha_creacion', 'DESC']]
      });
      return res.status(200).json({
        success: true,
        data: adjuntos,
        total: adjuntos.length
      });
    } catch (error) {
      next(error);
    }
  }

  async streamAttachment(req, res) {
    try {
      const saleId = parseInt(req.params.id, 10);
      const adjuntoId = parseInt(req.params.adjuntoId, 10);
      const disposition = String(req.query.download || '').trim() === '1' ? 'attachment' : 'inline';

      const adjunto = await VentaAdjunto.findOne({
        where: { id_venta: saleId, id_adjunto: adjuntoId }
      });

      if (!adjunto?.url) {
        return res.status(404).json({
          success: false,
          message: 'Adjunto no encontrado'
        });
      }

      const localFilePath = this.resolveLocalAttachmentFilePath(adjunto.url);
      if (localFilePath) {
        try {
          const buffer = await fs.promises.readFile(localFilePath);
          const fileName = adjunto.nombre_archivo || `adjunto-${adjuntoId}`;

          res.setHeader('Content-Type', adjunto.mime_type || 'application/octet-stream');
          res.setHeader('Content-Disposition', this.buildContentDisposition(fileName, disposition));
          res.setHeader('Cache-Control', 'private, max-age=300');
          res.setHeader('Content-Length', buffer.length);

          return res.status(200).send(buffer);
        } catch (localError) {
          logger.error(`Error leyendo adjunto local de venta ${adjuntoId}: ${localError.message}`);
          return res.status(404).json({
            success: false,
            message: 'El archivo adjunto no existe en el almacenamiento local'
          });
        }
      }

      const candidateUrls = this.buildAlternativeAttachmentUrls(adjunto);
      let upstreamResponse = null;

      for (const candidateUrl of candidateUrls) {
        upstreamResponse = await fetch(candidateUrl);
        if (upstreamResponse.ok) {
          break;
        }
      }

      if (!upstreamResponse || !upstreamResponse.ok) {
        return res.status(502).json({
          success: false,
          message: 'No se pudo obtener el archivo remoto'
        });
      }

      const contentType =
        upstreamResponse.headers.get('content-type') ||
        adjunto.mime_type ||
        'application/octet-stream';
      const contentLength = upstreamResponse.headers.get('content-length');
      const fileName = adjunto.nombre_archivo || `adjunto-${adjuntoId}`;
      const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', this.buildContentDisposition(fileName, disposition));
      res.setHeader('Cache-Control', 'private, max-age=300');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      return res.status(200).send(buffer);
    } catch (error) {
      logger.error(`Error al servir adjunto de venta: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'No se pudo visualizar el adjunto'
      });
    }
  }

  async deleteAttachment(req, res, next) {
    try {
      const saleId = parseInt(req.params.id);
      const adjuntoId = parseInt(req.params.adjuntoId);
      const deleted = await VentaAdjunto.destroy({
        where: { id_venta: saleId, id_adjunto: adjuntoId }
      });
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Adjunto no encontrado'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Adjunto eliminado'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SalesController();
