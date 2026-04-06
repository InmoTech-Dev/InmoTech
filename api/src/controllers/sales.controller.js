const saleService = require('../services/sales.service');
const personaService = require('../services/persona.service');
const logger = require('../utils/logger');
const { VentaAdjunto } = require('../models');
const cloudinary = require('../config/cloudinary');
const { uploadSingleAny } = require('./upload.controller');
const { normalizePagination } = require('../utils/pagination');

class SalesController {
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
    const publicId = uploadResult?.public_id;
    if (!publicId) return uploadResult?.secure_url || '';

    const extension = uploadResult?.format || this.getFileExtension(originalFileName);
    return cloudinary.url(publicId, {
      resource_type: resourceType,
      type: 'upload',
      secure: true,
      format: extension || undefined,
    });
  }

  buildAlternativeAttachmentUrl(adjunto = {}) {
    const originalUrl = String(adjunto?.url || '').trim();
    if (!originalUrl) return '';

    const expectedResourceType = String(adjunto?.mime_type || '').toLowerCase().includes('pdf') ? 'raw' : 'image';
    const replacement =
      expectedResourceType === 'raw'
        ? originalUrl.replace('/image/upload/', '/raw/upload/')
        : originalUrl.replace('/raw/upload/', '/image/upload/');

    const extension = this.getFileExtension(adjunto?.nombre_archivo || '');
    if (!extension || replacement.toLowerCase().includes(`.${extension}`)) {
      return replacement;
    }

    return `${replacement}.${extension}`;
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

      // Subir a Cloudinary (alineado con el uploader general: PDF como raw)
      const folder = `inmotech/ventas/${saleId}`;
      const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: resourceType
          },
          (error, result) => {
            if (error) return reject(error);
            return resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const adjunto = await VentaAdjunto.create({
        id_venta: saleId,
        tipo,
        nombre_archivo: req.file.originalname || uploadResult.original_filename,
        url: this.buildCloudinaryAttachmentUrl(uploadResult, resourceType, req.file.originalname),
        mime_type: req.file.mimetype || uploadResult.resource_type,
        tamano_bytes: req.file.size || uploadResult.bytes
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

      let upstreamResponse = await fetch(adjunto.url);
      if (!upstreamResponse.ok) {
        const alternativeUrl = this.buildAlternativeAttachmentUrl(adjunto);
        if (alternativeUrl && alternativeUrl !== adjunto.url) {
          upstreamResponse = await fetch(alternativeUrl);
        }
      }

      if (!upstreamResponse.ok) {
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
