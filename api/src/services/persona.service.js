const {
  Persona,
  Acceso,
  PersonasRol,
  Rol,
  PropiedadInmueble,
  Sale,
  Buyer,
  Renant,
  Lease,
  Payment,
  Receipt,
  Inmueble
} = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const bcryptUtils = require('../utils/bcrypt');
const logger = require('../utils/logger');
const sseService = require('./sse.service');
const realtimeAudienceService = require('./realtimeAudience.service');
const invitacionService = require('./invitacion.service');

const normalizeTipoDoc = (value = '') => {
  const t = value.toString().trim().toUpperCase();
  return (t === 'PAS' || t === 'PASAPORTE') ? 'Pasaporte' : t;
};

const splitFullName = (value = '') => {
  if (!value) {
    return { first: '', second: '' };
  }

  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0], second: '' };
  }

  return {
    first: parts.shift(),
    second: parts.join(' ')
  };
};

class PersonaService {
  async sincronizarPropietarioPorVenta(idVenta) {
    const saleId = Number.parseInt(idVenta, 10);
    if (!Number.isInteger(saleId) || saleId <= 0) {
      return { applied: false, reason: 'invalid_sale_id' };
    }

    return sequelize.transaction(async (t) => {
      const sale = await Sale.findByPk(saleId, {
        attributes: ['id_venta', 'id_inmueble', 'id_comprador', 'estado'],
        include: [
          {
            model: Buyer,
            as: 'comprador',
            attributes: ['id_comprador', 'id_persona'],
            include: [
              {
                model: Persona,
                as: 'persona',
                attributes: ['id_persona']
              }
            ]
          }
        ],
        transaction: t
      });

      if (!sale || sale.estado !== 'Finalizada') {
        return { applied: false, reason: 'sale_not_finalized' };
      }

      const inmuebleId = sale.id_inmueble;
      const buyerPersonaId =
        sale?.comprador?.persona?.id_persona ||
        sale?.comprador?.id_persona ||
        null;

      if (!inmuebleId || !buyerPersonaId) {
        return { applied: false, reason: 'missing_buyer_or_property' };
      }

      const previousOwners = await PropiedadInmueble.findAll({
        where: { id_inmueble: inmuebleId, es_propietario_actual: true },
        transaction: t
      });

      const previousOwnerIds = [
        ...new Set(
          previousOwners
            .map((item) => item.id_persona)
            .filter((idPersona) => idPersona && idPersona !== buyerPersonaId)
        )
      ];

      if (previousOwnerIds.length) {
        await PropiedadInmueble.update(
          {
            estado: 'Inactivo',
            es_propietario_actual: false,
            fecha_final: new Date()
          },
          {
            where: {
              id_inmueble: inmuebleId,
              id_persona: { [Op.in]: previousOwnerIds }
            },
            transaction: t
          }
        );
      }

      const buyerOwnership = await PropiedadInmueble.findOne({
        where: { id_inmueble: inmuebleId, id_persona: buyerPersonaId },
        transaction: t
      });

      if (buyerOwnership) {
        await buyerOwnership.update(
          {
            estado: 'Activo',
            es_propietario_actual: true,
            fecha_final: null,
            fecha_inicio: buyerOwnership.fecha_inicio || new Date(),
            porcentaje_propiedad: buyerOwnership.porcentaje_propiedad || 100
          },
          { transaction: t }
        );
      } else {
        await PropiedadInmueble.create(
          {
            id_inmueble: inmuebleId,
            id_persona: buyerPersonaId,
            fecha_inicio: new Date(),
            fecha_final: null,
            estado: 'Activo',
            es_propietario_actual: true,
            porcentaje_propiedad: 100
          },
          { transaction: t }
        );
      }

      await Persona.update(
        { estado: true },
        {
          where: { id_persona: buyerPersonaId },
          transaction: t
        }
      );

      for (const ownerId of previousOwnerIds) {
        const remainingProperties = await PropiedadInmueble.count({
          where: {
            id_persona: ownerId,
            es_propietario_actual: true,
            estado: 'Activo'
          },
          transaction: t
        });

        if (remainingProperties === 0) {
          await Persona.update(
            { estado: false },
            {
              where: { id_persona: ownerId },
              transaction: t
            }
          );
        }
      }

      return {
        applied: true,
        id_venta: saleId,
        id_inmueble: inmuebleId,
        comprador_id_persona: buyerPersonaId,
        propietarios_anteriores: previousOwnerIds
      };
    });
  }

  /**
   * Busca o crea una persona por documento
   */
  async buscarOCrearPersona(personaData) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const {
          tipo_documento,
          numero_documento,
          nombre_completo,
          apellido_completo,
          correo,
          telefono
        } = personaData;

        let persona = await Persona.findOne({
          where: { tipo_documento, numero_documento },
          transaction: t
        });

        if (persona) {
          const datosActualizados = {};
          if (correo && correo !== persona.correo) datosActualizados.correo = correo;
          if (telefono && telefono !== persona.telefono) datosActualizados.telefono = telefono;

          if (Object.keys(datosActualizados).length > 0) {
            await persona.update(datosActualizados, { transaction: t });
            logger.info(`Persona actualizada: ${tipo_documento} ${numero_documento}`);
          }
        } else {
          persona = await Persona.create({
            tipo_documento,
            numero_documento,
            nombre_completo,
            apellido_completo,
            correo,
            telefono,
            tiene_cuenta: false,
            estado: true
          }, { transaction: t });

          logger.info(`Nueva persona creada: ${tipo_documento} ${numero_documento}`);
        }

        return persona;
      } catch (error) {
        logger.error('Error en buscarOCrearPersona:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Busca personas por documento
   */
  async buscarPorDocumento(tipoDocumento, numeroDocumento) {
    try {
      const rows = await sequelize.query(
        'EXEC sp_BuscarPersonaPorDocumento @tipo_documento = :tipo, @numero_documento = :numero',
        {
          replacements: {
            tipo: normalizeTipoDoc(tipoDocumento),
            numero: (numeroDocumento || '').trim()
          },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (!rows || rows.length === 0) return [];

      return rows.map((r) => ({
        id_persona: r.id_persona,
        tipo_documento: r.tipo_documento,
        numero_documento: r.numero_documento,
        nombre_completo: r.nombre_completo,
        apellido_completo: r.apellido_completo,
        correo: r.correo,
        telefono: r.telefono,
        tiene_cuenta: r.tiene_cuenta,
        estado: r.estado_persona ?? r.estado ?? true,

        // Flags para front
        es_comprador: r.es_comprador ?? (r.id_comprador ? 1 : 0),
        es_arrendatario: r.es_arrendatario ?? (r.id_arrendatario ? 1 : 0),

        // Datos comprador (si existen)
        id_comprador: r.id_comprador || null,
        registro_comprador: r.registro_comprador || null,
        tipo_comprador: r.tipo_comprador || null,
        estado_comprador: r.estado_comprador || null,

        // Datos arrendatario (si existen)
        id_arrendatario: r.id_arrendatario || null,
        registro_arrendatario: r.registro_arrendatario || null,
        tipo_arrendatario: r.tipo_arrendatario || null,
        estado_arrendatario: r.estado_arrendatario || null,

        raw: r
      }));
    } catch (error) {
      logger.error('Error buscando por documento:', error);
      throw error;
    }
  }

  /**
   * Obtiene el perfil de una persona
   */
  async obtenerPerfil(personaId) {
    try {
      const persona = await Persona.findOne({
        where: { id_persona: personaId, estado: true },
        include: [
          {
            model: Rol,
            as: 'roles',
            through: {
              attributes: ['estado'],
              where: { estado: true }
            },
            attributes: ['id_rol', 'nombre_rol', 'descripcion'],
            where: { estado: true }
          }
        ]
      });

      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      // Traer inmuebles asociados como propietario.
      let inmuebles = [];
      try {
        const [meta] = await sequelize.query(`
          SELECT COL_LENGTH('dbo.Propiedad_inmueble', 'es_propietario_actual') AS has_es_propietario_actual
        `);

        const hasCurrentOwnerColumn = Boolean(meta?.[0]?.has_es_propietario_actual);
        const whereOwnerClause = hasCurrentOwnerColumn
          ? `(pi.es_propietario_actual = 1 OR pi.estado = 'Activo')`
          : `pi.estado = 'Activo'`;

        const rows = await sequelize.query(
          `
          SELECT
            pi.id_inmueble,
            i.titulo,
            i.registro_inmobiliario,
            i.direccion,
            i.ciudad,
            i.departamento,
            i.pais,
            i.operacion,
            i.categoria,
            i.precio_venta,
            i.precio_arriendo,
            i.estado,
            i.estado_frontend
          FROM Propiedad_inmueble pi
          INNER JOIN Inmuebles i ON pi.id_inmueble = i.id_inmueble
          WHERE ${whereOwnerClause}
            AND pi.id_persona = :id
          `,
          {
            replacements: { id: personaId },
            type: sequelize.QueryTypes.SELECT
          }
        );

        inmuebles = Array.isArray(rows) ? rows : [];
      } catch (propError) {
        logger.warn(`No se pudieron cargar inmuebles para persona ${personaId}: ${propError.message}`);
      }

      return {
        id_persona: persona.id_persona,
        tipo_documento: persona.tipo_documento,
        numero_documento: persona.numero_documento,
        nombre_completo: persona.nombre_completo,
        apellido_completo: persona.apellido_completo,
        correo: persona.correo,
        telefono: persona.telefono,
        tiene_cuenta: persona.tiene_cuenta,
        estado: persona.estado,
        fecha_registro: persona.fecha_registro,
        foto_perfil_url: persona.foto_perfil_url,
        foto_public_id: persona.foto_public_id,
        roles: persona.roles || [],
        inmuebles
      };
    } catch (error) {
      logger.error('Error obteniendo perfil:', error);
      throw error;
    }
  }

  /**
   * Obtiene facturas/cobros del arrendatario autenticado
   */
  async obtenerResumenArrendatario(personaId) {
    try {
      const persona = await Persona.findOne({
        where: { id_persona: personaId, estado: true },
        attributes: [
          'id_persona',
          'tipo_documento',
          'numero_documento',
          'nombre_completo',
          'apellido_completo',
          'correo',
          'telefono'
        ]
      });

      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      const arrendatario = await Renant.findOne({
        where: { id_persona: personaId },
        attributes: ['id_arrendatario', 'registro_arrendatario', 'tipo_arrendatario', 'estado']
      });

      if (!arrendatario) {
        return {
          arrendatario: null,
          resumen: {
            total_facturas: 0,
            facturas_pagadas: 0,
            facturas_pendientes: 0,
            facturas_vencidas: 0,
            total_valor: 0,
            total_pagado: 0,
            total_pendiente: 0
          },
          facturas: []
        };
      }

      const leases = await Lease.findAll({
        where: { id_cliente: arrendatario.id_arrendatario },
        attributes: ['id_arrendamiento', 'fecha_inicio', 'fecha_finalizacion', 'valor_mensual', 'estado'],
        include: [
          {
            model: Inmueble,
            as: 'inmueble',
            attributes: [
              'id_inmueble',
              'titulo',
              'registro_inmobiliario',
              'direccion',
              'ciudad',
              'categoria'
            ]
          },
          {
            model: Payment,
            as: 'cobros',
            attributes: [
              'id_cobro',
              'fecha_cobro',
              'fecha_limite',
              'valor_pago',
              'estado',
              'fecha_pago',
              'fecha_creacion'
            ],
            include: [
              {
                model: Receipt,
                as: 'comprobante',
                attributes: [
                  'id_comprobante',
                  'url_comprobante',
                  'entidad_bancaria',
                  'referencia_bancaria',
                  'monto_pagado',
                  'estado',
                  'fecha_pago',
                  'fecha_creacion',
                  'observaciones'
                ]
              }
            ],
            required: false
          }
        ],
        order: [
          [{ model: Payment, as: 'cobros' }, 'fecha_cobro', 'DESC']
        ]
      });

      const facturas = [];

      leases.forEach((lease) => {
        const inmueble = lease.inmueble || {};
        const cobros = Array.isArray(lease.cobros) ? lease.cobros : [];
        cobros.forEach((cobro) => {
          const valorPago = Number(cobro.valor_pago) || 0;
          const valorComprobante = Number(cobro?.comprobante?.monto_pagado) || null;

          facturas.push({
            id_cobro: cobro.id_cobro,
            id_arrendamiento: lease.id_arrendamiento,
            estado: cobro.estado,
            fecha_cobro: cobro.fecha_cobro,
            fecha_limite: cobro.fecha_limite,
            fecha_pago: cobro.fecha_pago,
            valor_pago: valorPago,
            inmueble: {
              id_inmueble: inmueble.id_inmueble || null,
              titulo: inmueble.titulo || null,
              registro_inmobiliario: inmueble.registro_inmobiliario || null,
              direccion: inmueble.direccion || null,
              ciudad: inmueble.ciudad || null,
              categoria: inmueble.categoria || null
            },
            arrendamiento: {
              id_arrendamiento: lease.id_arrendamiento,
              fecha_inicio: lease.fecha_inicio,
              fecha_finalizacion: lease.fecha_finalizacion,
              valor_mensual: Number(lease.valor_mensual) || valorPago,
              estado: lease.estado
            },
            comprobante: cobro.comprobante ? {
              id_comprobante: cobro.comprobante.id_comprobante,
              url_comprobante: cobro.comprobante.url_comprobante,
              entidad_bancaria: cobro.comprobante.entidad_bancaria,
              referencia_bancaria: cobro.comprobante.referencia_bancaria,
              monto_pagado: valorComprobante,
              estado: cobro.comprobante.estado,
              fecha_pago: cobro.comprobante.fecha_pago,
              fecha_creacion: cobro.comprobante.fecha_creacion,
              observaciones: cobro.comprobante.observaciones
            } : null
          });
        });
      });

      const resumen = facturas.reduce((acc, factura) => {
        const valor = Number(factura.valor_pago) || 0;
        acc.total_facturas += 1;
        acc.total_valor += valor;

        if (factura.estado === 'Pagado') {
          acc.facturas_pagadas += 1;
          acc.total_pagado += valor;
        } else if (factura.estado === 'Vencido') {
          acc.facturas_vencidas += 1;
          acc.total_pendiente += valor;
        } else if (factura.estado === 'Pendiente') {
          acc.facturas_pendientes += 1;
          acc.total_pendiente += valor;
        }

        return acc;
      }, {
        total_facturas: 0,
        facturas_pagadas: 0,
        facturas_pendientes: 0,
        facturas_vencidas: 0,
        total_valor: 0,
        total_pagado: 0,
        total_pendiente: 0
      });

      return {
        arrendatario: {
          id_arrendatario: arrendatario.id_arrendatario,
          id_persona: persona.id_persona,
          registro_arrendatario: arrendatario.registro_arrendatario,
          tipo_arrendatario: arrendatario.tipo_arrendatario,
          estado: arrendatario.estado,
          nombre_completo: persona.nombre_completo,
          apellido_completo: persona.apellido_completo,
          correo: persona.correo,
          telefono: persona.telefono,
          tipo_documento: persona.tipo_documento,
          numero_documento: persona.numero_documento
        },
        resumen,
        facturas
      };
    } catch (error) {
      logger.error('Error obteniendo resumen arrendatario:', error);
      throw error;
    }
  }

  /**
   * Actualiza el perfil de una persona
   */
  async actualizarPerfil(personaId, updateData, updatedBy = null) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const persona = await Persona.findOne({
          where: { id_persona: personaId, estado: true },
          transaction: t
        });

        if (!persona) {
          throw new Error('Persona no encontrada');
        }

        const mappedData = { ...updateData };
        if (mappedData.primer_nombre || mappedData.segundo_nombre) {
          mappedData.nombre_completo = `${mappedData.primer_nombre || ''} ${mappedData.segundo_nombre || ''}`.trim();
          delete mappedData.primer_nombre;
          delete mappedData.segundo_nombre;
        }
        if (mappedData.primer_apellido || mappedData.segundo_apellido) {
          mappedData.apellido_completo = `${mappedData.primer_apellido || ''} ${mappedData.segundo_apellido || ''}`.trim();
          delete mappedData.primer_apellido;
          delete mappedData.segundo_apellido;
        }

        const prevCorreo = (persona.correo || '').trim().toLowerCase();
        const personaData = { ...mappedData };

        if (personaData.correo) {
          const nuevoCorreo = personaData.correo.trim().toLowerCase();
          if (nuevoCorreo !== prevCorreo) {
            personaData.correo = nuevoCorreo;

            if (persona.tiene_cuenta === false) {
              personaData.correo_verificado = false;
              personaData.tiene_cuenta = false;
              try {
                // Obtener roles de la persona para determinar el tipo de invitacion
                const roles = await persona.getRoles({ transaction: t });
                const nombreRoles = roles.map(r => r.nombre_rol);
                const esAdmin = nombreRoles.some(r => ['Administrador', 'Super Administrador', 'Empleado', 'Agente'].includes(r));

                await invitacionService.crearInvitacion({
                  id_persona: personaId,
                  creado_por: updatedBy || null,
                  tipo: esAdmin ? 'admin_invite' : 'user_invite',
                  rol_asignado: nombreRoles[0] || (esAdmin ? 'Administrativo' : 'Usuario')
                });
                logger.info(`Invitacion [${esAdmin ? 'administrativa' : 'de usuario'}] regenerada por cambio de correo para persona ${personaId}`);
              } catch (inviteError) {
                logger.warn(`No se pudo regenerar invitacion de persona ${personaId}: ${inviteError.message}`);
              }
            }
          }
        }

        if (Object.keys(personaData).length > 0) {
          await persona.update(personaData, { transaction: t });
        }

        logger.info(`Perfil actualizado para persona ID: ${personaId}`);

        return {
          id_persona: persona.id_persona,
          tipo_documento: persona.tipo_documento,
          numero_documento: persona.numero_documento,
          nombre_completo: personaData.nombre_completo || persona.nombre_completo,
          apellido_completo: personaData.apellido_completo || persona.apellido_completo,
          correo: personaData.correo || persona.correo,
          telefono: personaData.telefono || persona.telefono,
          tiene_cuenta: personaData.tiene_cuenta ?? persona.tiene_cuenta,
          correo_verificado: personaData.correo_verificado ?? persona.correo_verificado,
          fecha_registro: persona.fecha_registro,
          foto_perfil_url: personaData.foto_perfil_url || persona.foto_perfil_url,
          foto_public_id: personaData.foto_public_id || persona.foto_public_id
        };
      } catch (error) {
        logger.error('Error actualizando perfil:', {
          message: error.message,
          sql: error.original?.sql || error.parent?.sql || null,
          code: error.parent?.code || error.original?.code || null
        });
        throw error;
      }
    });

    return result;
  }

  async verificarCorreoExistente(email) {
    try {
      const persona = await Persona.findOne({
        where: { correo: email.trim().toLowerCase(), estado: true },
        attributes: ['id_persona']
      });
      return !!persona;
    } catch (error) {
      logger.error('Error verificando correo existente:', error);
      throw error;
    }
  }

  async verificarDocumentoExistente(tipo, numero) {
    try {
      const persona = await Persona.findOne({
        where: {
          tipo_documento: tipo,
          numero_documento: numero.trim(),
          estado: true
        },
        attributes: ['id_persona']
      });
      return !!persona;
    } catch (error) {
      logger.error('Error verificando documento existente:', error);
      throw error;
    }
  }

  /**
   * Lista personas con filtros
   */
  async listarPersonas(filtros = {}, opciones = {}) {
    try {
      const parseBooleanFilter = (value) => {
        if (value === undefined || value === null || value === '') return undefined;
        if (typeof value === 'boolean') return value;
        const normalized = String(value).trim().toLowerCase();
        if (['true', '1', 'si', 'activo'].includes(normalized)) return true;
        if (['false', '0', 'no', 'inactivo'].includes(normalized)) return false;
        return undefined;
      };

      const {
        tipo_documento,
        numero_documento,
        nombre,
        busqueda,
        search,
        correo,
        tiene_cuenta,
        estado
      } = filtros;
      const rolFiltro = filtros.rol || filtros.rol_nombre || null;
      const cantidadFiltro = String(filtros.cantidad_inmuebles || filtros.cantidad || '').trim();

      const {
        pagina = 1,
        limite = 20,
        ordenarPor = 'nombre_completo',
        orden = 'ASC'
      } = opciones;

      const offset = (pagina - 1) * limite;
      const whereClausePersona = {};

      const estadoFiltro = parseBooleanFilter(estado);
      if (estadoFiltro !== undefined) whereClausePersona.estado = estadoFiltro;
      if (tipo_documento) whereClausePersona.tipo_documento = tipo_documento;
      if (numero_documento) whereClausePersona.numero_documento = { [sequelize.Op.like]: `%${numero_documento}%` };
      if (correo) whereClausePersona.correo = { [sequelize.Op.like]: `%${correo}%` };
      const tieneCuentaFiltro = parseBooleanFilter(tiene_cuenta);
      if (tieneCuentaFiltro !== undefined) whereClausePersona.tiene_cuenta = tieneCuentaFiltro;

      if (nombre) {
        whereClausePersona[sequelize.Op.or] = [
          { nombre_completo: { [sequelize.Op.like]: `%${nombre}%` } },
          { apellido_completo: { [sequelize.Op.like]: `%${nombre}%` } }
        ];
      }

      const allPersonsResult = await Persona.findAll({
        where: whereClausePersona,
        include: [
          {
            model: Rol,
            as: 'roles',
            through: {
              attributes: ['estado'],
              where: { estado: true }
            },
            attributes: ['id_rol', 'nombre_rol'],
            where: { estado: true },
            required: false
          },
          {
            model: PropiedadInmueble,
            as: 'propiedades',
            required: false,
            where: rolFiltro === 'Propietario' ? { es_propietario_actual: true } : undefined,
            attributes: ['id_inmueble', 'es_propietario_actual']
          }
        ],
        order: [[ordenarPor, orden]],
        distinct: false,
        logging: false
      });

      const validPersons = allPersonsResult.filter(p => p != null);

      const normalize = (value = '') =>
        String(value || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();

      const rawSearch = String(busqueda || search || '').trim();
      const searchTerms = rawSearch
        .split(/\s+/)
        .map((term) => normalize(term))
        .filter(Boolean);

      const matchesCantidadFilter = (cantidad) => {
        if (!cantidadFiltro || cantidadFiltro === 'Todas las cantidades') return true;
        if (cantidadFiltro === '1') return cantidad === 1;
        if (cantidadFiltro === '2-3') return cantidad >= 2 && cantidad <= 3;
        if (cantidadFiltro === '4+') return cantidad >= 4;
        return true;
      };

      const personasFiltradas = validPersons.filter(persona => {
        const roles = persona.roles || [];
        const propiedades = Array.isArray(persona.propiedades) ? persona.propiedades : [];

        if (rolFiltro === 'Propietario') {
          const esPorRol = roles.some(rol => rol.nombre_rol === 'Propietario');
          const esPorPropiedad = propiedades.length > 0;
          if (!esPorRol && !esPorPropiedad) return false;
        }

        if (rolFiltro === 'Usuario') {
          const esUsuario = roles.some(rol => rol.nombre_rol === 'Usuario');
          if (!esUsuario) return false;
        }

        if (rolFiltro === 'Propietario' && !matchesCantidadFilter(propiedades.length)) {
          return false;
        }

        if (searchTerms.length) {
          const dynamicRegistro = `prop-${new Date().getFullYear()}-${String(persona.id_persona || 0).padStart(3, '0')}`;
          const searchableValues = [
            persona.nombre_completo,
            persona.apellido_completo,
            `${persona.nombre_completo || ''} ${persona.apellido_completo || ''}`.trim(),
            persona.numero_documento,
            persona.tipo_documento,
            persona.correo,
            persona.telefono,
            dynamicRegistro
          ]
            .map((value) => normalize(value))
            .filter(Boolean);

          const matchesSearch = searchTerms.every((term) =>
            searchableValues.some((value) => value.includes(term))
          );

          if (!matchesSearch) return false;
        }

        return true;
      });

      const totalPersonasFiltradas = personasFiltradas.length;
      const personasPaginadas = personasFiltradas.slice(offset, offset + limite);

      let propiedadesPorPersona = {};
      if (rolFiltro === 'Propietario' && personasPaginadas.length > 0) {
        const personasIds = personasPaginadas.map((p) => p.id_persona);
        try {
          const [rows] = await sequelize.query(
            `
            SELECT
              pi.id_persona,
              i.id_inmueble,
              i.titulo,
              i.registro_inmobiliario,
              i.direccion,
              i.ciudad,
              i.departamento,
              i.pais,
              i.operacion,
              i.precio_venta,
              i.precio_arriendo,
              i.estado
            FROM Propiedad_inmueble pi
            INNER JOIN Inmuebles i ON pi.id_inmueble = i.id_inmueble
            WHERE pi.es_propietario_actual = 1
              AND pi.id_persona IN (:ids)
            `,
            {
              replacements: { ids: personasIds },
              type: sequelize.QueryTypes.SELECT
            }
          );

          propiedadesPorPersona = rows.reduce((acc, row) => {
            const key = row.id_persona;
            if (!acc[key]) acc[key] = [];
            acc[key].push({
              id_inmueble: row.id_inmueble,
              titulo: row.titulo,
              registro_inmobiliario: row.registro_inmobiliario,
              direccion: row.direccion,
              ciudad: row.ciudad,
              departamento: row.departamento,
              pais: row.pais,
              operacion: row.operacion,
              precio_venta: row.precio_venta,
              precio_arriendo: row.precio_arriendo,
              estado: row.estado
            });
            return acc;
          }, {});
        } catch (propError) {
          logger.warn('No se pudieron cargar inmuebles de propietarios:', propError.message);
        }
      }

      return {
        personas: personasPaginadas.map(persona => ({
          id_persona: persona.id_persona,
          tipo_documento: persona.tipo_documento,
          numero_documento: persona.numero_documento,
          nombre_completo: persona.nombre_completo,
          apellido_completo: persona.apellido_completo,
          correo: persona.correo,
          telefono: persona.telefono,
          tiene_cuenta: persona.tiene_cuenta,
          correo_verificado: persona.correo_verificado,
          estado: persona.estado,
          fecha_registro: persona.fecha_registro,
          roles: persona.roles || [],
          inmuebles: propiedadesPorPersona[persona.id_persona] || []
        })),
        paginacion: {
          total: totalPersonasFiltradas,
          pagina,
          limite,
          paginas_totales: Math.ceil(totalPersonasFiltradas / limite)
        }
      };
    } catch (error) {
      logger.error('Error listando personas:', error);
      const paginaSafe = opciones?.pagina || 1;
      const limiteSafe = opciones?.limite || 20;

      return {
        personas: [],
        paginacion: {
          total: 0,
          pagina: paginaSafe,
          limite: limiteSafe,
          paginas_totales: 0
        }
      };
    }
  }

  /**
   * Crea una persona desde panel administrativo sin acceso directo.
   */
  async crearPersonaAdmin(personaData) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const datosPersona = {
          ...personaData,
          tiene_cuenta: false,
          estado: personaData.estado ?? true,
          correo_verificado: false
        };

        const persona = await this.crearOActualizar(datosPersona, t);

        const rolDestino = personaData.rol || 'Usuario';
        const rolModelo = await Rol.findOne({
          where: { nombre_rol: rolDestino },
          transaction: t
        });

        if (rolModelo) {
          const yaTieneRol = await PersonasRol.findOne({
            where: { id_persona: persona.id_persona, id_rol: rolModelo.id_rol },
            transaction: t
          });

          if (!yaTieneRol) {
            await PersonasRol.create({
              id_persona: persona.id_persona,
              id_rol: rolModelo.id_rol
            }, { transaction: t });
          }
        }

        logger.info(`Persona administrativa creada (pendiente de activacion, con rol ${rolDestino}): ${persona.nombre_completo}`);

        return persona;

      } catch (error) {
        logger.error('Error creando persona administrativa:', error);
        return {
          ...personaData,
          id_persona: null
        };
      }
    });

    return result;
  }

  async crearOActualizar(datosPersona, transaction = null) {
    const transaccionExterna = transaction !== null;
    const t = transaction || await sequelize.transaction();

    try {
      const { tipo_documento, numero_documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, ...restoDatos } = datosPersona;

      const mappedData = { ...restoDatos };
      if (primer_nombre || segundo_nombre) {
        mappedData.nombre_completo = `${primer_nombre || ''} ${segundo_nombre || ''}`.trim();
      }
      if (primer_apellido || segundo_apellido) {
        mappedData.apellido_completo = `${primer_apellido || ''} ${segundo_apellido || ''}`.trim();
      }

      const personaExistente = await Persona.findOne({
        where: {
          tipo_documento,
          numero_documento: numero_documento.trim()
        },
        transaction: t
      });

      let persona;

      if (personaExistente) {
        await personaExistente.update(
          {
            ...mappedData,
            fecha_registro: personaExistente.fecha_registro
          },
          { transaction: t }
        );
        persona = personaExistente;
        logger.info(`Persona actualizada: ${tipo_documento} ${numero_documento}`);
      } else {
        const ahora = new Date();
        persona = await Persona.create(
          {
            tipo_documento,
            numero_documento: numero_documento.trim(),
            ...mappedData,
            tiene_cuenta: mappedData.tiene_cuenta ?? false,
            estado: mappedData.estado ?? true,
            fecha_registro: ahora
          },
          { transaction: t }
        );
        logger.info(`Nueva persona creada: ${tipo_documento} ${numero_documento}`);
      }

      if (!transaccionExterna) {
        await t.commit();
      }

      return persona;
    } catch (error) {
      if (!transaccionExterna && t && !t.finished) {
        try {
          await t.rollback();
        } catch (rollbackError) {
          logger.error('Error al hacer rollback:', rollbackError.message);
        }
      }
      logger.error('Error al crear o actualizar persona:', error.message);
      throw error;
    }
  }

  async obtenerPorId(id_persona) {
    try {
      const persona = await Persona.findByPk(id_persona);
      return persona;
    } catch (error) {
      logger.error('Error al obtener persona por ID:', error);
      throw error;
    }
  }

  /**
   * Cambia el estado de una persona (activar/desactivar cuenta)
   */
  async cambiarEstadoPersona(personaId, estado) {
    try {
      const persona = await Persona.findOne({
        where: { id_persona: personaId },
        include: [
          {
            model: Rol,
            as: 'roles',
            through: {
              attributes: ['estado'],
              where: { estado: true }
            },
            attributes: ['id_rol', 'nombre_rol'],
            where: { estado: true },
            required: false
          }
        ]
      });

      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      const isSuperAdminOrAdmin = persona.roles?.some(rol =>
        rol.nombre_rol === 'Super Administrador' || rol.nombre_rol === 'Administrador'
      );

      if (isSuperAdminOrAdmin) {
        throw new Error('No se puede cambiar el estado de un Super Administrador o Administrador');
      }

      await persona.update({ estado });

      if (!estado) {
        sseService.notifyUserDisabled(personaId);
        logger.info(`SSE: Notificacion enviada - Usuario deshabilitado ${personaId}`);
      }

      const adminIds = await realtimeAudienceService.obtenerAdministrativosActivosIds();
      sseService.emitUserChanged({
        action: estado ? 'enabled' : 'disabled',
        userId: personaId,
        affectedUserIds: [personaId],
        audienceUserIds: adminIds
      });

      logger.info(`Estado de persona actualizado: ID ${personaId}, estado: ${estado}`);
      return persona;
    } catch (error) {
      logger.error('Error cambiando estado de persona:', error);
      throw error;
    }
  }
  /**
   * Cambia la contraseña de una persona (solo para administradores)
   */
  async cambiarContrasenaPersona(personaId, nuevaPassword) {
    try {
      const persona = await Persona.findOne({
        where: { id_persona: personaId },
        include: [
          {
            model: Rol,
            as: 'roles',
            through: {
              attributes: ['estado'],
              where: { estado: true }
            },
            attributes: ['id_rol', 'nombre_rol'],
            where: { estado: true },
            required: false
          }
        ]
      });

      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      const isSuperAdminOrAdmin = persona.roles?.some(rol =>
        rol.nombre_rol === 'Super Administrador' || rol.nombre_rol === 'Administrador'
      );

      if (isSuperAdminOrAdmin) {
        throw new Error('No se puede cambiar la contraseña de un Super Administrador o Administrador');
      }

      const hashedPassword = await bcryptUtils.hashPassword(nuevaPassword);
      await Acceso.update({
        contrasena: hashedPassword,
        ultimo_cambio_password: new Date()
      }, {
        where: { id_persona: personaId }
      });

      sseService.notifyPasswordChanged(personaId);
      logger.info(`SSE: Notificación enviada - Contraseña cambiada para usuario ${personaId}`);
      logger.info(`Contraseña cambiada para persona ID: ${personaId}`);
      return true;
    } catch (error) {
      logger.error('Error cambiando contraseña de persona:', error);
      throw error;
    }
  }
}

module.exports = new PersonaService();

