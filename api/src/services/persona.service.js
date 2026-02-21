const { Persona, Acceso, PersonasRol, Rol, PropiedadInmueble } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const bcryptUtils = require('../utils/bcrypt');
const logger = require('../utils/logger');
const sseService = require('./sse.service');
const realtimeAudienceService = require('./realtimeAudience.service');
const invitacionService = require('./invitacion.service');

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

const normalizeDocumentValue = (value = '') =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');

const isPlaceholderDocument = (value = '') => {
  const normalized = normalizeDocumentValue(value);
  return !normalized || /^TEMP[0-9A-Z]*$/.test(normalized);
};

const buildNormalizedCorreoWhere = (correoNormalizado) =>
  sequelize.where(
    sequelize.fn(
      'LOWER',
      sequelize.fn('LTRIM', sequelize.fn('RTRIM', sequelize.col('correo')))
    ),
    correoNormalizado
  );

class PersonaService {
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
      const personas = await Persona.findAll({
        where: {
          tipo_documento: tipoDocumento,
          numero_documento: { [Op.like]: `%${numeroDocumento}%` },
          estado: true
        },
        include: [
          {
            model: Rol,
            as: 'roles',
            through: { attributes: [] },
            attributes: ['id_rol', 'nombre_rol']
          }
        ],
        limit: 10,
        order: [['nombre_completo', 'ASC']]
      });

      return personas.map(persona => ({
        id_persona: persona.id_persona,
        tipo_documento: persona.tipo_documento,
        numero_documento: persona.numero_documento,
        nombre_completo: persona.nombre_completo,
        apellido_completo: persona.apellido_completo,
        correo: persona.correo,
        telefono: persona.telefono,
        tiene_cuenta: persona.tiene_cuenta,
        estado: persona.estado,
        roles: persona.roles || []
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
            through: { attributes: [] },
            attributes: ['id_rol', 'nombre_rol', 'descripcion']
          }
        ]
      });

      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      // Si tiene rol Propietario, traer sus inmuebles actuales
      let inmuebles = [];
      try {
        const esPropietario = (persona.roles || []).some((r) => r.nombre_rol === 'Propietario');
        if (esPropietario) {
          const [rows] = await sequelize.query(
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
              i.precio_venta,
              i.precio_arriendo,
              i.estado
            FROM Propiedad_inmueble pi
            INNER JOIN Inmuebles i ON pi.id_inmueble = i.id_inmueble
            WHERE pi.es_propietario_actual = 1
              AND pi.id_persona = :id
            `,
            {
              replacements: { id: personaId },
              type: sequelize.QueryTypes.SELECT
            }
          );
          inmuebles = rows || [];
        }
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
   * Obtiene inmuebles del propietario autenticado con informacion de arriendo
   */
  async obtenerResumenPropietario(personaId) {
    try {
      const persona = await Persona.findByPk(personaId, {
        include: [
          {
            model: Rol,
            as: 'roles',
            through: { attributes: [] },
            attributes: ['id_rol', 'nombre_rol']
          }
        ]
      });

      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      const esPropietario = (persona.roles || []).some((r) => r.nombre_rol === 'Propietario');
      if (!esPropietario) {
        const roleError = new Error('La persona autenticada no tiene rol de propietario');
        roleError.status = 403;
        throw roleError;
      }

      const rows = await sequelize.query(
        `
        SELECT
          i.id_inmueble,
          i.titulo,
          i.registro_inmobiliario,
          i.direccion,
          i.barrio,
          i.ciudad,
          i.departamento,
          i.pais,
          i.categoria,
          i.operacion,
          i.estado AS estado_inmueble,
          i.precio_arriendo,
          i.precio_venta,
          ar.id_arrendamiento,
          ar.estado AS estado_arriendo,
          ar.fecha_inicio,
          ar.fecha_finalizacion,
          ar.valor_mensual,
          ar.tipo_garantia,
          ar.valor_garantia,
          ren.id_arrendatario,
          pArr.nombre_completo AS arrendatario_nombre,
          pArr.correo AS arrendatario_correo,
          pArr.telefono AS arrendatario_telefono
        FROM Propiedad_inmueble pi
        INNER JOIN Inmuebles i ON i.id_inmueble = pi.id_inmueble
        OUTER APPLY (
          SELECT TOP 1 a.*
          FROM Arrendamientos a
          WHERE a.id_inmueble = i.id_inmueble
          ORDER BY
            CASE WHEN a.estado IN ('Activo', 'Pendiente') THEN 0 ELSE 1 END,
            ISNULL(a.fecha_inicio, a.fecha_creacion) DESC
        ) ar
        LEFT JOIN Arrendatarios ren ON ren.id_arrendatario = ar.id_arrendatario
        LEFT JOIN Personas pArr ON pArr.id_persona = ren.id_persona
        WHERE pi.id_persona = :personaId
          AND pi.es_propietario_actual = 1
        ORDER BY i.id_inmueble DESC
        `,
        {
          replacements: { personaId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const inmuebles = (rows || []).map((row) => ({
        id_inmueble: row.id_inmueble,
        titulo: row.titulo,
        registro_inmobiliario: row.registro_inmobiliario,
        direccion: row.direccion,
        barrio: row.barrio,
        ciudad: row.ciudad,
        departamento: row.departamento,
        pais: row.pais,
        categoria: row.categoria,
        operacion: row.operacion,
        estado_inmueble: row.estado_inmueble,
        precio_arriendo: row.precio_arriendo,
        precio_venta: row.precio_venta,
        arriendo: row.id_arrendamiento
          ? {
              id_arrendamiento: row.id_arrendamiento,
              estado: row.estado_arriendo,
              fecha_inicio: row.fecha_inicio,
              fecha_finalizacion: row.fecha_finalizacion,
              valor_mensual: row.valor_mensual,
              tipo_garantia: row.tipo_garantia,
              valor_garantia: row.valor_garantia
            }
          : null,
        arrendatario: row.id_arrendatario
          ? {
              id_arrendatario: row.id_arrendatario,
              nombre_completo: row.arrendatario_nombre,
              correo: row.arrendatario_correo,
              telefono: row.arrendatario_telefono
            }
          : null,
        canon_estimado: row.valor_mensual ?? row.precio_arriendo ?? null
      }));

      const resumen = {
        total_inmuebles: inmuebles.length,
        inmuebles_con_arriendo: inmuebles.filter((item) => !!item.arriendo).length,
        arriendos_activos: inmuebles.filter((item) => item?.arriendo?.estado === 'Activo').length,
        canon_total_estimado: inmuebles.reduce((acc, item) => acc + (Number(item.canon_estimado) || 0), 0)
      };

      return {
        propietario: {
          id_persona: persona.id_persona,
          nombre_completo: persona.nombre_completo,
          correo: persona.correo
        },
        resumen,
        inmuebles
      };
    } catch (error) {
      logger.error('Error obteniendo resumen del propietario:', error);
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
        const { password, confirmPassword, ...personaData } = mappedData;

        if (personaData.correo) {
          const nuevoCorreo = personaData.correo.trim().toLowerCase();
          if (prevCorreo && nuevoCorreo !== prevCorreo) {
            personaData.correo_verificado = false;
            personaData.tiene_cuenta = true;
            persona.correo = nuevoCorreo;
            try {
              await invitacionService.crearInvitacion({
                id_persona: personaId,
                creado_por: updatedBy || null,
                tipo: 'signup_verify'
              });
              logger.info(`Invitacion de verificacion enviada a nuevo correo de persona ${personaId}`);
            } catch (inviteError) {
              logger.warn(`No se pudo enviar invitacion de verificacion a persona ${personaId}: ${inviteError.message}`);
            }
          }
        }

        if (Object.keys(personaData).length > 0) {
          await persona.update(personaData, { transaction: t });
        }

        if (password) {
          const { Acceso } = require('../models');
          const bcryptUtilsLocal = require('../utils/bcrypt');
          if (password !== confirmPassword) {
            throw new Error('Las contraseñas no coinciden');
          }
          const acceso = await Acceso.findOne({
            where: { id_persona: personaId },
            transaction: t
          });
          const hashedPassword = await bcryptUtilsLocal.hashPassword(password);

          if (acceso) {
            await acceso.update({
              contrasena: hashedPassword,
              ultimo_cambio_password: new Date()
            }, { transaction: t });
            logger.info(`Contraseña actualizada para persona ID: ${personaId}`);
          } else {
            logger.warn(`No se encontró acceso para persona ID: ${personaId}, creando uno nuevo`);
            await Acceso.create({
              id_persona: personaId,
              contrasena: hashedPassword,
              ultimo_cambio_password: new Date()
            }, { transaction: t });
          }
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
          fecha_registro: persona.fecha_registro
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
      const {
        tipo_documento,
        numero_documento,
        nombre,
        correo,
        tiene_cuenta,
        estado
      } = filtros;
      const rolFiltro = filtros.rol || filtros.rol_nombre || null;

      const {
        pagina = 1,
        limite = 20,
        ordenarPor = 'nombre_completo',
        orden = 'ASC'
      } = opciones;

      const offset = (pagina - 1) * limite;
      const whereClausePersona = {};

      if (estado !== undefined) whereClausePersona.estado = estado;
      if (tipo_documento) whereClausePersona.tipo_documento = tipo_documento;
      if (numero_documento) whereClausePersona.numero_documento = { [sequelize.Op.like]: `%${numero_documento}%` };
      if (correo) whereClausePersona.correo = { [sequelize.Op.like]: `%${correo}%` };
      if (tiene_cuenta !== undefined) whereClausePersona.tiene_cuenta = tiene_cuenta;

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
            through: { attributes: [] },
            attributes: ['id_rol', 'nombre_rol'],
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

      const personasFiltradas = validPersons.filter(persona => {
        const roles = persona.roles || [];
        const propiedades = Array.isArray(persona.propiedades) ? persona.propiedades : [];

        if (rolFiltro === 'Propietario') {
          const esPorRol = roles.some(rol => rol.nombre_rol === 'Propietario');
          const esPorPropiedad = propiedades.length > 0;
          return esPorRol || esPorPropiedad;
        }

        if (rolFiltro === 'Usuario') {
          return roles.some(rol => rol.nombre_rol === 'Usuario');
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

      const paginaSafe = filtros?.pagina || 1;
      const limiteSafe = filtros?.limite || 20;

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
   * Crea una persona administrativa con posibilidad de crear cuenta de usuario
   */
  async crearPersonaAdmin(personaData, password = null) {
    return sequelize.transaction(async (t) => {
      const normalizedCorreo =
        typeof personaData.correo === 'string' ? personaData.correo.trim().toLowerCase() : '';

      const datosPersona = {
        ...personaData,
        correo: normalizedCorreo || personaData.correo,
        tiene_cuenta: !!password,
        estado: personaData.estado ?? true,
        correo_verificado: !!password
      };

      let persona = null;

      // Reusar persona existente por correo cuando corresponde (evita falsos "duplicados")
      if (normalizedCorreo) {
        const personaPorCorreo = await Persona.findOne({
          where: buildNormalizedCorreoWhere(normalizedCorreo),
          transaction: t
        });

        if (personaPorCorreo) {
          const tipoDocPayload = normalizeDocumentValue(datosPersona.tipo_documento);
          const numDocPayload = normalizeDocumentValue(datosPersona.numero_documento);
          const tipoDocExistente = normalizeDocumentValue(personaPorCorreo.tipo_documento);
          const numDocExistente = normalizeDocumentValue(personaPorCorreo.numero_documento);
          let sameDocument = tipoDocPayload === tipoDocExistente && numDocPayload === numDocExistente;

          if (!sameDocument) {
            const payloadDocPlaceholder = isPlaceholderDocument(datosPersona.numero_documento);
            const existingDocPlaceholder = isPlaceholderDocument(personaPorCorreo.numero_documento);

            if (payloadDocPlaceholder) {
              // Si llega documento temporal desde formulario, no bloquear por mismatch.
              sameDocument = true;
            } else if (existingDocPlaceholder) {
              // Si el registro existente es temporal, actualizarlo con el documento real.
              await personaPorCorreo.update(
                {
                  tipo_documento: datosPersona.tipo_documento,
                  numero_documento: datosPersona.numero_documento
                },
                { transaction: t }
              );
              sameDocument = true;
            }
          }

          if (!sameDocument) {
            const totalRoles = await PersonasRol.count({
              where: { id_persona: personaPorCorreo.id_persona },
              transaction: t
            });
            const totalAccesos = await Acceso.count({
              where: { id_persona: personaPorCorreo.id_persona },
              transaction: t
            });
            const totalPropiedades = await PropiedadInmueble.count({
              where: { id_persona: personaPorCorreo.id_persona },
              transaction: t
            });

            const canAutoMergeByEmail =
              !personaPorCorreo.tiene_cuenta &&
              !personaPorCorreo.correo_verificado &&
              totalRoles === 0 &&
              totalAccesos === 0 &&
              totalPropiedades === 0;

            if (canAutoMergeByEmail) {
              const personaConMismoDocumento = await Persona.findOne({
                where: {
                  tipo_documento: datosPersona.tipo_documento,
                  numero_documento: (datosPersona.numero_documento || '').trim(),
                  id_persona: { [Op.ne]: personaPorCorreo.id_persona }
                },
                transaction: t
              });

              if (personaConMismoDocumento) {
                const conflictDocError = new Error('El documento ya está registrado con otro correo electrónico.');
                conflictDocError.status = 409;
                throw conflictDocError;
              }

              await personaPorCorreo.update(
                {
                  tipo_documento: datosPersona.tipo_documento,
                  numero_documento: datosPersona.numero_documento
                },
                { transaction: t }
              );
              sameDocument = true;
            }
          }

          if (!sameDocument) {
            const conflictError = new Error('El correo ya está registrado con otro documento.');
            conflictError.status = 409;
            throw conflictError;
          }

          await personaPorCorreo.update(
            {
              ...datosPersona,
              tiene_cuenta: password ? true : personaPorCorreo.tiene_cuenta
            },
            { transaction: t }
          );
          persona = personaPorCorreo;
        }
      }

      if (!persona) {
        persona = await this.crearOActualizar(datosPersona, t);
      }

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

      if (password) {
        const hashedPassword = await bcryptUtils.hashPassword(password);

        await Acceso.create({
          id_persona: persona.id_persona,
          contrasena: hashedPassword,
          ultimo_cambio_password: new Date()
        }, { transaction: t });

        logger.info(`Usuario administrativo creado con acceso: ${persona.correo || persona.nombre_completo}`);
      } else {
        logger.info(`Persona administrativa creada (sin cuenta, con rol ${rolDestino}): ${persona.nombre_completo}`);
      }

      return persona;
    }).catch((error) => {
      logger.error('Error creando persona administrativa:', error);
      throw error;
    });
  }

  // Mantener métodos existentes para compatibilidad
  async buscarPorDocumento(tipo_documento, numero_documento, transaction = null) {
    try {
      const persona = await Persona.findOne({
        where: {
          tipo_documento,
          numero_documento: numero_documento.trim()
        },
        transaction
      });
      return persona;
    } catch (error) {
      logger.error('Error al buscar persona por documento:', error);
      return null;
    }
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
            through: { attributes: [] },
            attributes: ['id_rol', 'nombre_rol'],
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
            through: { attributes: [] },
            attributes: ['id_rol', 'nombre_rol'],
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

