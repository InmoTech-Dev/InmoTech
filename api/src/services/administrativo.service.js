const { Persona, Administrativo, Acceso, PersonasRol, Rol } = require('../models');
const { sequelize } = require('../config/database');
const bcryptUtils = require('../utils/bcrypt');
const logger = require('../utils/logger');
const sseService = require('./sse.service');
const realtimeAudienceService = require('./realtimeAudience.service');
const invitacionService = require('./invitacion.service');
const { PROTECTED_ROLES } = require('../constants/roles.constants');

const isTruthyEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const ADMIN_INVITE_EMAIL_ASYNC = isTruthyEnv(process.env.ADMIN_INVITE_EMAIL_ASYNC, true);

const buildHttpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const isProtectedRole = (roleName = '') => PROTECTED_ROLES.includes(roleName);

class AdministrativoService {
  /**
   * Registra un nuevo administrativo
   * @param {Object} adminData - Datos del administrativo
   * @returns {Promise<Object>} Administrativo creado con tokens
   */
  async registrarAdministrativo(adminData) {
    const requestStartMs = Date.now();
    let dbDurationMs = 0;
    const transactionStartMs = Date.now();
    let adminId; // Declarar variable para acceder fuera de la transacción

    await sequelize.transaction(async (t) => {
      try {
        const {
          email,
          nombre_completo,
          apellido_completo,
          telefono,
          tipo_documento,
          numero_documento,
          fecha_ingreso,
          id_rol
        } = adminData;

        // Verificar si el email ya existe
        const normalizedEmail = (email || '').trim().toLowerCase();
        const normalizedTipoDocumento = (tipo_documento || '').trim().toUpperCase();
        const normalizedNumeroDocumento = (numero_documento || '').replace(/[\s\-\.]/g, '').trim();

        const [personaPorDocumento, personaPorCorreo, administrativoPorDocumento, administrativoPorCorreo] = await Promise.all([
          Persona.findOne({
            where: {
              tipo_documento: normalizedTipoDocumento,
              numero_documento: normalizedNumeroDocumento
            },
            transaction: t
          }),
          normalizedEmail
            ? Persona.findOne({
              where: { correo: normalizedEmail },
              transaction: t
            })
            : Promise.resolve(null),
          Administrativo.findOne({
            attributes: ['id_administrativo'],
            include: [
              {
                model: Persona,
                as: 'persona',
                attributes: ['id_persona'],
                where: {
                  tipo_documento: normalizedTipoDocumento,
                  numero_documento: normalizedNumeroDocumento
                },
                required: true
              }
            ],
            transaction: t
          }),
          normalizedEmail
            ? Administrativo.findOne({
              attributes: ['id_administrativo'],
              include: [
                {
                  model: Persona,
                  as: 'persona',
                  attributes: ['id_persona'],
                  where: { correo: normalizedEmail },
                  required: true
                }
              ],
              transaction: t
            })
            : Promise.resolve(null)
        ]);

        if (
          personaPorDocumento &&
          personaPorCorreo &&
          personaPorDocumento.id_persona !== personaPorCorreo.id_persona
        ) {
          throw new Error('El documento y el correo pertenecen a personas diferentes');
        }

        if (administrativoPorDocumento && administrativoPorCorreo) {
          throw new Error('Ya existe un administrativo con ese documento y correo');
        }
        if (administrativoPorDocumento) {
          throw new Error('Ya existe un administrativo con ese tipo y numero de documento');
        }
        if (administrativoPorCorreo) {
          throw new Error('Ya existe un administrativo con ese correo electronico');
        }

        if (personaPorDocumento && personaPorCorreo) {
          throw new Error('Ya existe una persona con ese documento y correo, pero no es administrativa');
        }
        if (personaPorDocumento) {
          throw new Error('Ya existe una persona con ese tipo y numero de documento, pero no es administrativa');
        }
        if (personaPorCorreo) {
          throw new Error('Ya existe una persona con ese correo electronico, pero no es administrativa');
        }

        const personaRegistro = await Persona.create({
          tipo_documento: normalizedTipoDocumento,
          numero_documento: normalizedNumeroDocumento,
          nombre_completo,
          apellido_completo,
          correo: normalizedEmail,
          telefono,
          tiene_cuenta: false,
          correo_verificado: false,
          estado: true
        }, { transaction: t });

        // Crear registro administrativo inicialmente con código temporal
        const nuevoAdministrativo = await Administrativo.create({
          id_persona: personaRegistro.id_persona,
          codigo_empleado: 'TEMP', // Código temporal, será actualizado después
          fecha_ingreso,
          estado_laboral: 'Activo'
        }, { transaction: t });

        // Crear código de empleado basado en el rol
        let rolAsignado;
        if (id_rol) {
          // Verificar que el rol existe y es administrativo
          const rolSeleccionado = await Rol.findOne({
            where: {
              id_rol: id_rol,
              es_rol_administrativo: true,
              estado: true
            },
            transaction: t
          });

          if (!rolSeleccionado) {
            throw new Error('El rol seleccionado no es válido o no es administrativo');
          }

          if (isProtectedRole(rolSeleccionado.nombre_rol)) {
            throw buildHttpError('Rol protegido: no asignable por este flujo', 403);
          }

          rolAsignado = rolSeleccionado;
          const asignacionExistente = await PersonasRol.findOne({
            where: {
              id_persona: personaRegistro.id_persona,
              id_rol
            },
            transaction: t
          });

          if (asignacionExistente) {
            await asignacionExistente.update({ estado: true }, { transaction: t });
          } else {
            await PersonasRol.create({
              id_persona: personaRegistro.id_persona,
              id_rol
            }, { transaction: t });
          }
        } else {
          // Asignar rol por defecto (Empleado)
          const rolDefault = await Rol.findOne({
            where: {
              nombre_rol: 'Empleado',
              es_rol_administrativo: true,
              estado: true
            },
            transaction: t
          });

          if (rolDefault) {
            rolAsignado = rolDefault;
            const asignacionExistente = await PersonasRol.findOne({
              where: {
                id_persona: personaRegistro.id_persona,
                id_rol: rolDefault.id_rol
              },
              transaction: t
            });

            if (asignacionExistente) {
              await asignacionExistente.update({ estado: true }, { transaction: t });
            } else {
              await PersonasRol.create({
                id_persona: personaRegistro.id_persona,
                id_rol: rolDefault.id_rol
              }, { transaction: t });
            }
          }
        }

        // Generar código de empleado automáticamente
        const prefijo = rolAsignado ? this.getPrefijoPorRol(rolAsignado.nombre_rol) : 'EMPLEADO';
        const siguienteNumero = await this.getSiguienteNumeroEmpleado(prefijo, t);
        const codigoGenerado = `${prefijo}-${siguienteNumero.toString().padStart(3, '0')}`;

        // Actualizar el administrativo con el código generado
        await nuevoAdministrativo.update({
          codigo_empleado: codigoGenerado
        }, { transaction: t });

        // Guardar referencia para la consulta posterior
        adminId = nuevoAdministrativo.id_administrativo;

        logger.info(`Administrativo registrado: ${normalizedEmail} (Codigo generado: ${codigoGenerado})`);

      } catch (error) {
        logger.error('Error en registro de administrativo:', error);
        throw error;
      }
    });
    dbDurationMs = Date.now() - transactionStartMs;
    logger.info('Registro administrativo: etapa BD completada', {
      id_administrativo: adminId,
      duration_ms: dbDurationMs
    });

    // Obtener el administrativo completo con todos sus joins para el frontend
    try {
      const administrativoCompleto = await Administrativo.findOne({
        where: { id_administrativo: adminId },
        include: [
          {
            model: Persona,
            as: 'persona',
            attributes: ['id_persona', 'tipo_documento', 'numero_documento', 'nombre_completo', 'apellido_completo', 'correo', 'telefono', 'fecha_registro'],
            include: [
              {
                model: Rol,
                as: 'roles',
                through: { attributes: ['estado', 'fecha_asignacion'] },
                where: { estado: true },
                required: false
              }
            ]
          }
        ]
      });

      // Enviar invitacion para que defina su contrasena y active el acceso
      const invitacionInfo = {
        estado: ADMIN_INVITE_EMAIL_ASYNC ? 'pendiente_envio' : 'pendiente_reenvio',
        expira_en: null,
        total_enviados: 0,
        intentos_envio: 0,
        ultimo_error: null
      };

      try {
        const rolNombre = administrativoCompleto?.persona?.roles?.[0]?.nombre_rol || 'Administrativo';
        const invitacion = await invitacionService.crearInvitacion({
          id_persona: administrativoCompleto?.persona?.id_persona,
          creado_por: adminData?.creado_por || null,
          tipo: 'admin_invite',
          rol_asignado: rolNombre,
          es_administrativo: true,
          deferEmail: ADMIN_INVITE_EMAIL_ASYNC
        });

        invitacionInfo.estado = invitacion?.estado || (ADMIN_INVITE_EMAIL_ASYNC ? 'pendiente_envio' : 'enviada');
        invitacionInfo.expira_en = invitacion?.expira_en || null;
        invitacionInfo.total_enviados = (invitacion?.reenvios || 0) + 1;
        invitacionInfo.intentos_envio = invitacion?.intentos_envio || (ADMIN_INVITE_EMAIL_ASYNC ? 0 : 1);
        invitacionInfo.ultimo_error = null;

        logger.info(`Invitacion administrativa creada para ${administrativoCompleto?.persona?.correo || adminData?.email || 'correo-desconocido'}`, {
          deferEmail: ADMIN_INVITE_EMAIL_ASYNC
        });
      } catch (inviteError) {
        invitacionInfo.estado = 'pendiente_reenvio';
        invitacionInfo.expira_en = inviteError?.context?.expira_en || invitacionInfo.expira_en || null;
        invitacionInfo.total_enviados = ((inviteError?.context?.reenvios || 0) + 1) || 1;
        invitacionInfo.intentos_envio = inviteError?.intentos_envio || Number(process.env.EMAIL_SEND_RETRY_ATTEMPTS || 3);
        invitacionInfo.ultimo_error = inviteError?.message || 'No se pudo enviar la invitacion administrativa';

        logger.warn('No se pudo enviar la invitacion administrativa', {
          email: administrativoCompleto?.persona?.correo || adminData?.email || null,
          id_persona: administrativoCompleto?.persona?.id_persona || null,
          code: inviteError?.code || null,
          intentos_envio: invitacionInfo.intentos_envio,
          reason: inviteError?.reason || null,
          host: inviteError?.host || null,
          context: inviteError?.context || null,
          error: inviteError
        });
      }

      if (administrativoCompleto && administrativoCompleto.dataValues) {
        administrativoCompleto.dataValues.invitacion = invitacionInfo;
      }

      logger.info('Registro administrativo completado', {
        id_administrativo: adminId,
        db_duration_ms: dbDurationMs,
        total_duration_ms: Date.now() - requestStartMs,
        invite_async: ADMIN_INVITE_EMAIL_ASYNC
      });

      return administrativoCompleto;
    } catch (queryError) {
      logger.warn('Error obteniendo administrativo completo para respuesta, pero el registro fue exitoso:', queryError);
      logger.warn('Registro administrativo con fallo en etapa de respuesta', {
        id_administrativo: adminId,
        db_duration_ms: dbDurationMs,
        total_duration_ms: Date.now() - requestStartMs
      });
      throw new Error('Administrativo registrado pero hubo un error obteniendo los datos completos');
    }
  }

  /**
   * Obtiene administrativos con paginación (optimizado)
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object>} Lista de administrativos
   */
  async verificarCorreoAdministrativoExistente(email) {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      if (!normalizedEmail) return false;

      const administrativo = await Administrativo.findOne({
        attributes: ['id_administrativo'],
        include: [
          {
            model: Persona,
            as: 'persona',
            attributes: [],
            where: { correo: normalizedEmail },
            required: true
          }
        ]
      });

      return !!administrativo;
    } catch (error) {
      logger.error('Error verificando correo en administrativos:', error);
      throw error;
    }
  }

  async verificarDocumentoAdministrativoExistente(tipo, numero) {
    try {
      const normalizedTipo = (tipo || '').trim().toUpperCase();
      const normalizedNumero = (numero || '').replace(/[\s\-\.]/g, '').trim();
      if (!normalizedTipo || !normalizedNumero) return false;

      const administrativo = await Administrativo.findOne({
        attributes: ['id_administrativo'],
        include: [
          {
            model: Persona,
            as: 'persona',
            attributes: [],
            where: {
              tipo_documento: normalizedTipo,
              numero_documento: normalizedNumero
            },
            required: true
          }
        ]
      });

      return !!administrativo;
    } catch (error) {
      logger.error('Error verificando documento en administrativos:', error);
      throw error;
    }
  }

  async obtenerAdministrativos({ page = 1, limit = 10, estado }) {
    try {
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (estado) {
        whereClause.estado_laboral = estado;
      }

      // ✅ OPTIMIZACIÓN: Usar consulta RAW o encontrar/crear índice para mejorar rendimiento
      const { count, rows } = await Administrativo.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Persona,
            as: 'persona',
            attributes: ['id_persona', 'tipo_documento', 'numero_documento', 'nombre_completo', 'apellido_completo', 'correo', 'telefono', 'fecha_registro'],
            include: [
              {
                model: Rol,
                as: 'roles',
                through: {
                  attributes: ['estado', 'fecha_asignacion'],
                  where: { estado: true }
                },
                where: { estado: true },
                required: false
              }
            ]
          }
        ],
        limit,
        offset,
        order: [['fecha_ingreso', 'DESC']],
        logging: false, // ✅ Deshabilitar logging SQL para mejor rendimiento
        distinct: true // ✅ Evitar duplicados en conteo de paginación
      });

      return {
        administrativos: rows,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      };

    } catch (error) {
      logger.error('Error obteniendo administrativos:', error);
      throw error;
    }
  }

  /**
   * Obtiene un administrativo por ID
   * @param {number} id - ID del administrativo
   * @returns {Promise<Object>} Datos del administrativo
   */
  async obtenerAdministrativoPorId(id) {
    try {
      const administrativo = await Administrativo.findOne({
        where: { id_administrativo: id },
        include: [
          {
            model: Persona,
            as: 'persona',
            attributes: ['id_persona', 'tipo_documento', 'numero_documento', 'nombre_completo', 'apellido_completo', 'correo', 'telefono', 'fecha_registro'],
            include: [
              {
                model: Rol,
                as: 'roles',
                through: { attributes: ['estado', 'fecha_asignacion'] },
                where: { estado: true },
                required: false
              }
            ]
          }
        ]
      });

      if (!administrativo) {
        throw new Error('Administrativo no encontrado');
      }

      return administrativo;

    } catch (error) {
      logger.error('Error obteniendo administrativo por ID:', error);
      throw error;
    }
  }

  /**
   * Actualiza un administrativo
   * @param {number} id - ID del administrativo
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Administrativo actualizado
   */
  async actualizarAdministrativo(id, updateData) {
    const result = await sequelize.transaction(async (t) => {
      const administrativo = await Administrativo.findOne({
        where: { id_administrativo: id },
          include: [
            {
              model: Persona,
              as: 'persona',
              include: [
                {
                  model: Rol,
                  as: 'roles',
                  through: {
                    attributes: ['estado', 'fecha_asignacion'],
                    where: { estado: true }
                  },
                  where: { estado: true },
                  required: false
                }
              ]
            }
          ],
          transaction: t
        });

        if (!administrativo) {
          throw new Error('Administrativo no encontrado');
        }

        // Verificar si el administrativo es Super Administrador o Administrador
        const isSuperAdminOrAdmin = administrativo.persona.roles?.some(rol =>
          rol.nombre_rol === 'Super Administrador' || rol.nombre_rol === 'Administrador'
        );

        if (isSuperAdminOrAdmin) {
          throw new Error('No se puede editar a un Super Administrador o Administrador');
        }

        const { personaData, administrativoData, rolId } = updateData;

        // Actualizar datos de persona si se proporcionan
        if (personaData) {
          // Validar duplicidad de correo
          if (personaData.correo && personaData.correo !== administrativo.persona.correo) {
            const existingEmail = await Persona.findOne({
              where: { correo: personaData.correo },
              transaction: t
            });
            if (existingEmail) {
              throw buildHttpError('El correo electrónico ya está registrado por otro usuario', 400);
            }
          }

          // Validar duplicidad de documento
          if (personaData.numero_documento && personaData.numero_documento !== administrativo.persona.numero_documento) {
            const existingDoc = await Persona.findOne({
              where: { numero_documento: personaData.numero_documento },
              transaction: t
            });
            if (existingDoc) {
              throw buildHttpError('El número de documento ya está registrado por otro usuario', 400);
            }
          }

          await administrativo.persona.update(personaData, { transaction: t });
        }

        // Actualizar datos administrativos
        if (administrativoData) {
          await administrativo.update(administrativoData, { transaction: t });
        }

        // Actualizar rol si se proporciona
        if (rolId !== undefined && rolId !== null) {
          const rolIdNormalizado = Number.parseInt(rolId, 10);
          if (!Number.isInteger(rolIdNormalizado) || rolIdNormalizado <= 0) {
            throw buildHttpError('El rol especificado no es vÃ¡lido', 400);
          }

          const rolDestino = await Rol.findOne({
            where: {
              id_rol: rolIdNormalizado,
              es_rol_administrativo: true,
              estado: true,
            },
            transaction: t,
          });

          if (!rolDestino) {
            throw buildHttpError('El rol seleccionado no es vÃ¡lido o no es administrativo', 400);
          }

          if (isProtectedRole(rolDestino.nombre_rol)) {
            throw buildHttpError('Rol protegido: no asignable por este flujo', 403);
          }

          const personaId = administrativo.persona.id_persona;
          const rolActual = await PersonasRol.findOne({
            where: { id_persona: personaId },
            transaction: t,
          });

          if (rolActual) {
            // Siempre aseguramos que esté activo al editar, y actualizamos el ID si cambió
            await rolActual.update(
              {
                id_rol: rolIdNormalizado,
                estado: true,
                fecha_asignacion: new Date()
              },
              { transaction: t }
            );
          } else {
            await PersonasRol.create(
              {
                id_persona: personaId,
                id_rol: rolIdNormalizado,
                estado: true,
                fecha_asignacion: new Date()
              },
              { transaction: t }
            );
          }
        }

    });
    
    // ✅ OPTIMIZACIÓN: Emitir evento SSE fuera de la transacción para evitar bloqueos y race conditions
    // El timeout ocurría porque obtenerAdministrativosActivosIds() hace consultas pesadas dentro del lock
    try {
      const personaId = result.persona.id_persona;
      const audienceIds = await require('./realtimeAudience.service').obtenerAdministrativosActivosIds();
      sseService.emitUserChanged({
        action: 'updated',
        userId: personaId,
        affectedUserIds: [personaId],
        audienceUserIds: audienceIds
      });
    } catch (sseError) {
      logger.error('Error enviando notificación SSE en actualizarAdministrativo:', sseError);
    }

    return result;
  }

  /**
   * Cambia el estado laboral de un administrativo
   * @param {number} id - ID del administrativo
   * @param {string} estadoLaboral - Nuevo estado laboral
   * @param {string} fechaRetiro - Fecha de retiro (opcional)
   * @returns {Promise<Object>} Administrativo actualizado
   */
  async cambiarEstadoLaboral(id, estadoLaboral, fechaRetiro = null) {
    try {
      let personaId = null;

      const result = await sequelize.transaction(async (t) => {
        const administrativo = await Administrativo.findOne({
          where: { id_administrativo: id },
          include: [
            {
              model: Persona,
              as: 'persona',
              include: [
                {
                  model: Rol,
                  as: 'roles',
                  through: {
                    attributes: ['estado', 'fecha_asignacion'],
                    where: { estado: true }
                  },
                  where: { estado: true },
                  required: false
                }
              ]
            }
          ],
          transaction: t
        });

        if (!administrativo) {
          throw new Error('Administrativo no encontrado');
        }

        const isSuperAdminOrAdmin = administrativo.persona.roles?.some(rol =>
          rol.nombre_rol === 'Super Administrador' || rol.nombre_rol === 'Administrador'
        );

        if (isSuperAdminOrAdmin) {
          throw new Error('No se puede cambiar el estado de un Super Administrador o Administrador');
        }

        const shouldDisableAccount = estadoLaboral === 'Retirado' || estadoLaboral === 'Inactivo';
        const updateData = { estado_laboral: estadoLaboral };

        if (estadoLaboral === 'Retirado' && fechaRetiro) {
          updateData.fecha_retiro = fechaRetiro;
        }

        if (estadoLaboral === 'Activo') {
          updateData.fecha_retiro = null;
        }

        await administrativo.update(updateData, { transaction: t });
        await administrativo.persona.update({ estado: !shouldDisableAccount }, { transaction: t });

        personaId = administrativo.persona.id_persona;

        logger.info(`Estado laboral actualizado para administrativo ID ${id}: ${estadoLaboral}`);
        return administrativo;
      });

      if (personaId) {
        // Enviar notificación de desconexión inmediata si la cuenta fue deshabilitada
        if (estadoLaboral === 'Retirado' || estadoLaboral === 'Inactivo') {
          sseService.notifyUserDisabled(personaId);
          logger.info(`SSE: Notificacion de desconexión enviada para usuario ID ${personaId}`);
        }

        const adminIds = await realtimeAudienceService.obtenerAdministrativosActivosIds();
        sseService.emitUserChanged({
          action: estadoLaboral === 'Retirado' || estadoLaboral === 'Inactivo' ? 'disabled' : 'enabled',
          userId: personaId,
          affectedUserIds: [personaId],
          audienceUserIds: adminIds
        });
      }

      return result;
    } catch (error) {
      logger.error('Error cambiando estado laboral:', error);
      throw error;
    }
  }
  /**
   * Elimina un administrativo (desactivación lógica)
   * @param {number} id - ID del administrativo
   * @returns {Promise<void>}
   */
  async eliminarAdministrativo(id) {
    let targetPersonaId = null;

    const result = await sequelize.transaction(async (t) => {
      try {
        const administrativo = await Administrativo.findOne({
          where: { id_administrativo: id },
          include: [
            {
              model: Persona,
              as: 'persona',
              include: [
                {
                  model: Rol,
                  as: 'roles',
                  through: {
                    attributes: ['estado', 'fecha_asignacion'],
                    where: { estado: true }
                  },
                  where: { estado: true },
                  required: false
                }
              ]
            }
          ],
          transaction: t
        });

        if (!administrativo) {
          throw new Error('Administrativo no encontrado');
        }

        const isSuperAdminOrAdmin = administrativo.persona.roles?.some(rol =>
          rol.nombre_rol === 'Super Administrador' || rol.nombre_rol === 'Administrador'
        );

        if (isSuperAdminOrAdmin) {
          throw new Error('No se puede eliminar a un Super Administrador o Administrador');
        }

        await administrativo.update({
          estado_laboral: 'Retirado',
          fecha_retiro: new Date()
        }, { transaction: t });

        await administrativo.persona.update({
          estado: false
        }, { transaction: t });

        logger.info(`Administrativo eliminado: ID ${id}`);
      } catch (error) {
        logger.error('Error eliminando administrativo:', error);
        throw error;
      }
    });

    if (targetPersonaId) {
      // Notificar desconexión inmediata fuera de la transacción
      sseService.notifyUserDisabled(targetPersonaId);
      logger.info(`SSE: Notificacion de desconexión enviada para usuario eliminado ID ${targetPersonaId}`);

      const adminIds = await realtimeAudienceService.obtenerAdministrativosActivosIds();
      sseService.emitUserChanged({
        action: 'disabled',
        userId: targetPersonaId,
        affectedUserIds: [targetPersonaId],
        audienceUserIds: adminIds
      });
    }

    return result;
  }
  /**
   * Cambia la contraseña de un administrativo (solo para administradores)
   * @param {number} id - ID del administrativo
   * @param {string} nuevaPassword - Nueva contraseña
   * @returns {Promise<boolean>} True si se cambió exitosamente
   */
  async cambiarContrasenaAdministrativo(id, nuevaPassword) {
    try {
      const administrativo = await Administrativo.findOne({
        where: { id_administrativo: id },
        include: [
          {
            model: Persona,
            as: 'persona',
            include: [
              {
                model: Rol,
                as: 'roles',
                through: {
                  attributes: ['estado', 'fecha_asignacion'],
                  where: { estado: true }
                },
                where: { estado: true },
                required: false
              }
            ]
          }
        ]
      });

      if (!administrativo) {
        throw new Error('Administrativo no encontrado');
      }

      // Verificar si el administrativo es Super Administrador o Administrador
      const isSuperAdminOrAdmin = administrativo.persona.roles?.some(rol =>
        rol.nombre_rol === 'Super Administrador' || rol.nombre_rol === 'Administrador'
      );

      if (isSuperAdminOrAdmin) {
        throw new Error('No se puede cambiar la contraseña de un Super Administrador o Administrador');
      }

      // Hashear nueva contraseña y actualizar
      const hashedPassword = await bcryptUtils.hashPassword(nuevaPassword);
      await Acceso.update({
        contrasena: hashedPassword,
        ultimo_cambio_password: new Date()
      }, {
        where: { id_persona: administrativo.persona.id_persona }
      });

      // ✅ SSE: Notificar al usuario que su contraseña ha sido cambiada
      sseService.notifyPasswordChanged(administrativo.persona.id_persona);
      logger.info(`📡 SSE: Notificación enviada - Contraseña cambiada para usuario ${administrativo.persona.id_persona}`);

      logger.info(`Contraseña cambiada para administrativo ID: ${id}`);

      return true;

    } catch (error) {
      logger.error('Error cambiando contraseña de administrativo:', error);
      throw error;
    }
  }

  /**
   * Obtiene el prefijo para generar códigos basado en el rol
   * @param {string} nombreRol - Nombre del rol
   * @returns {string} Prefijo para el código
   */
  getPrefijoPorRol(nombreRol) {
    const mapaPrefijos = {
      'Super Administrador': 'SUPERADMIN',
      'Administrador': 'ADMINISTRADOR',
      'Empleado': 'EMPLEADO',
      'Gerente': 'GERENTE',
      'Supervisor': 'SUPERVISOR',
      'Analista': 'ANALISTA',
      'Asistente': 'ASISTENTE'
    };

    return mapaPrefijos[nombreRol] || 'EMPLEADO';
  }

  /**
   * Obtiene el siguiente número secuencial para un prefijo de código
   * @param {string} prefijo - Prefijo del código
   * @param {Object} transaction - Transacción de Sequelize
   * @returns {number} Siguiente número
   */
  async getSiguienteNumeroEmpleado(prefijo, transaction = null) {
    try {
      // Buscar códigos que empiecen con el prefijo
      const administrativosExistentes = await Administrativo.findAll({
        where: {
          codigo_empleado: {
            [sequelize.Sequelize.Op.like]: `${prefijo}-%`
          }
        },
        attributes: ['codigo_empleado'],
        transaction,
        order: [['codigo_empleado', 'DESC']],
        limit: 1
      });

      if (administrativosExistentes.length === 0) {
        return 1;
      }

      // Extraer el número del código más alto encontrado
      const ultimoCodigo = administrativosExistentes[0].codigo_empleado;
      const numeroStr = ultimoCodigo.split('-')[1];
      const numero = parseInt(numeroStr, 10);

      if (isNaN(numero)) {
        logger.warn(`Código de empleado inválido encontrado: ${ultimoCodigo}, iniciando desde 1`);
        return 1;
      }

      return numero + 1;
    } catch (error) {
      logger.error('Error obteniendo siguiente número de empleado:', error);
      // En caso de error, usar un valor por defecto único basado en timestamp
    }
  }
  /**
   * Obtiene los correos electrónicos de los Súper Administradores y Administradores activos
   * @returns {Promise<string[]>} Lista de correos
   */
  async obtenerEmailsAdministradores() {
    try {
      const { SUPER_ADMIN_ROLE, ADMINISTRATOR_ROLE } = require('../constants/roles.constants');

      const administradores = await Persona.findAll({
        attributes: ['correo'],
        where: { estado: true },
        include: [
          {
            model: Rol,
            as: 'roles',
            where: {
              nombre_rol: [SUPER_ADMIN_ROLE, ADMINISTRATOR_ROLE],
              estado: true
            },
            required: true,
            through: { where: { estado: true } }
          }
        ]
      });

      return administradores.map(admin => admin.correo).filter(Boolean);
    } catch (error) {
      logger.error('Error obteniendo emails de administradores:', error);
      throw error;
    }
  }
}

module.exports = new AdministrativoService();



