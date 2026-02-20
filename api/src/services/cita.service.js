const { Persona } = require('../models');
const { Cita } = require('../models');
const { Inmueble } = require('../models');
const { ServicioCita } = require('../models');
const { EstadoCita } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { isSuperAdministrator } = require('../middlewares/auth.middleware');
const logger = require('../utils/logger');

const normalizarFechaCita = (fecha) => {
  if (!fecha) return fecha;
  if (typeof fecha === 'string') return fecha;

  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha;

  return parsed.toISOString().slice(0, 10);
};

const normalizarHoraTexto = (hora) => {
  if (typeof hora === 'undefined' || hora === null) return null;

  const match = String(hora).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (Number.isNaN(horas) || Number.isNaN(minutos) || horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
    return null;
  }

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
};

const horaEnMinutos = (hora) => {
  const horaNormalizada = normalizarHoraTexto(hora);
  if (!horaNormalizada) return null;

  const [horas, minutos] = horaNormalizada.split(':').map(Number);
  return (horas * 60) + minutos;
};

const sumarMinutosHora = (hora, minutosASumar = 30) => {
  const totalActual = horaEnMinutos(hora);
  if (totalActual === null) return null;

  const totalFinal = totalActual + minutosASumar;
  if (totalFinal >= 24 * 60) return null;

  const horas = Math.floor(totalFinal / 60);
  const minutos = totalFinal % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
};

const resolverRangoHorario = ({ horaInicio, horaFin }) => {
  const inicioNormalizado = normalizarHoraTexto(horaInicio);
  if (!inicioNormalizado) {
    return { horaInicio: null, horaFin: null };
  }

  const finNormalizado = normalizarHoraTexto(horaFin);
  const inicioMinutos = horaEnMinutos(inicioNormalizado);
  const finMinutos = finNormalizado ? horaEnMinutos(finNormalizado) : null;

  if (finMinutos === null || finMinutos <= inicioMinutos) {
    return {
      horaInicio: inicioNormalizado,
      horaFin: sumarMinutosHora(inicioNormalizado, 30)
    };
  }

  return {
    horaInicio: inicioNormalizado,
    horaFin: finNormalizado
  };
};
class CitaService {

  async crearCita(dataCita) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const asBadRequest = (message) => {
          const err = new Error(message);
          err.status = 400;
          return err;
        };

        const idServicio = Number(dataCita.id_servicio);
        if (!idServicio) throw asBadRequest('El servicio es requerido');

        const servicio = await ServicioCita.findByPk(idServicio, { transaction: t });
        if (!servicio) throw asBadRequest('Servicio no encontrado');

        const nombreServicio = (servicio.nombre_servicio || '').toLowerCase();
        const requiereInmueble = ['propiedad', 'inmueble', 'visita'].some((kw) => nombreServicio.includes(kw));

        let idInmueble = dataCita.id_inmueble !== undefined && dataCita.id_inmueble !== null
          ? Number(dataCita.id_inmueble)
          : null;

        if (requiereInmueble) {
          if (!idInmueble) throw asBadRequest('El inmueble es requerido para este servicio');
          const inmueble = await Inmueble.findByPk(idInmueble, { transaction: t });
          if (!inmueble) throw asBadRequest('Inmueble no encontrado');
        } else if (idInmueble) {
          const inmueble = await Inmueble.findByPk(idInmueble, { transaction: t });
          if (!inmueble) throw asBadRequest('Inmueble no encontrado');
        } else {
          idInmueble = null;
        }

        dataCita.id_inmueble = idInmueble;
        dataCita.id_servicio = idServicio;

        // ✅ Usar directamente nombre_completo y apellido_completo como vienen del frontend
        const nombre_completo = dataCita.nombre_completo || '';
        const apellido_completo = dataCita.apellido_completo || '';

        // 1. Buscar persona por documento
        let persona = await Persona.findOne({
          where: {
            tipo_documento: dataCita.tipo_documento,
            numero_documento: dataCita.numero_documento
          },
          transaction: t
        });

        const correoPrincipal = (dataCita.correo || dataCita.email || '').trim().toLowerCase();

        if (persona) {
          // Si la persona existe, actualizamos sus datos pero verificamos que el correo no lo tenga OTRO
          if (correoPrincipal && correoPrincipal !== (persona.correo || '').toLowerCase()) {
            const correoEnUsoPorOtro = await Persona.findOne({
              where: {
                correo: correoPrincipal,
                id_persona: { [Op.ne]: persona.id_persona }
              },
              transaction: t
            });

            if (correoEnUsoPorOtro) {
              // Si el correo lo tiene otro, no lo actualizamos para evitar 409, 
              // pero permitimos que la cita siga con la persona encontrada (por documento)
              logger.warn(`El correo ${correoPrincipal} ya está en uso por otra persona (ID: ${correoEnUsoPorOtro.id_persona}). No se actualizará en este registro.`);
            } else {
              await persona.update({
                nombre_completo,
                apellido_completo,
                correo: correoPrincipal,
                telefono: dataCita.telefono
              }, { transaction: t });
            }
          } else {
            // Actualizar solo nombres y teléfono si cambiaron
            await persona.update({
              nombre_completo,
              apellido_completo,
              telefono: dataCita.telefono
            }, { transaction: t });
          }
        } else {
          // Si NO existe por documento, verificamos si el correo ya existe
          const personaPorCorreo = await Persona.findOne({
            where: { correo: correoPrincipal },
            transaction: t
          });

          if (personaPorCorreo) {
            // CONFLICTO: El documento es nuevo pero el correo ya existe.
            // Para evitar errores 409 y duplicados inconsistentes, asumimos que es la misma persona 
            // pero que tal vez se registró con otro documento antes o hubo un error.
            // Por seguridad en este flujo de citas, usamos la persona encontrada por correo.
            persona = personaPorCorreo;
            logger.info(`Persona encontrada por correo (${correoPrincipal}) aunque el documento es distinto.`);

            // Actualizamos el documento si es necesario? Mejor no por seguridad, 
            // solo actualizamos nombres y teléfono.
            await persona.update({
              nombre_completo,
              apellido_completo,
              telefono: dataCita.telefono
            }, { transaction: t });
          } else {
            // Si no existe por ninguno, creamos nuevo
            persona = await Persona.create({
              tipo_documento: dataCita.tipo_documento,
              numero_documento: dataCita.numero_documento,
              nombre_completo,
              apellido_completo,
              correo: correoPrincipal,
              telefono: dataCita.telefono,
              tiene_cuenta: false
            }, { transaction: t });
          }
        }

        const citaExistente = await Cita.findOne({
          where: {
            id_persona: persona.id_persona,
            ...(dataCita.id_inmueble !== null ? { id_inmueble: dataCita.id_inmueble } : {}),
            id_servicio: idServicio,
            fecha_cita: dataCita.fecha_cita,
            hora_inicio: dataCita.hora_inicio,
            hora_fin: dataCita.hora_fin
          },
          transaction: t
        });

        if (citaExistente) {
          throw asBadRequest('Ya existe una cita con la misma informacion para este usuario');
        }

        // 4. Crear la cita si no existe duplicado
        const nuevaCita = await Cita.create({
          id_persona: persona.id_persona,
          id_inmueble: dataCita.id_inmueble,
          id_servicio: dataCita.id_servicio,
          fecha_cita: normalizarFechaCita(dataCita.fecha_cita),
          hora_inicio: dataCita.hora_inicio,
          hora_fin: dataCita.hora_fin,
          id_estado_cita: dataCita.id_estado_cita || 1, // 1 = Solicitada
          observaciones: dataCita.observaciones || null,
          id_agente_asignado: null,
          id_usuario_creador: dataCita.id_usuario_creador // ✅ Agregado: quién creó la cita
        }, { transaction: t });

        return await this.obtenerCitaPorId(nuevaCita.id_cita, t);

      } catch (error) {
        throw error;
      }
    });

    return result;
  }

  async obtenerCitaPorId(id, transaction = null) {
    const cita = await Cita.findByPk(id, {
      include: [
        { association: 'cliente' },
        { association: 'inmueble' },
        { association: 'servicio' },
        { association: 'estado' },
        {
          association: 'agente',
          required: false,
          attributes: [
            'id_persona',
            'nombre_completo',
            'apellido_completo',
            'numero_documento',
            'correo',
            'telefono'
          ]
        },
        { association: 'creador', required: false, attributes: ['id_persona', 'nombre_completo', 'apellido_completo'] }
      ],
      transaction
    });

    if (!cita) throw new Error('Cita no encontrada');

    // ✅ FORZAR VALORES POR DEFECTO PARA CAMPOS NULLABLE
    // ⚠️ IMPORTANTE: Usar ?? (nullish coalescing) para NO sobrescribir valores válidos (como 0)
    const citaData = cita.toJSON();
    citaData.ediciones_realizadas = citaData.ediciones_realizadas ?? 0;
    citaData.ediciones_maximas = citaData.ediciones_maximas ?? 2;

    return citaData;
  }

  async obtenerTodasLasCitas(filtros = {}) {
    try {
      logger.info(`🔍 Consultando citas con filtros: ${JSON.stringify(filtros)}`);

      // ✅ OPTIMIZACIÓN: Usar Sequelize con includes optimizados y paginación
      const includeOptions = [
        {
          association: 'cliente',
          attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'tipo_documento', 'numero_documento', 'correo', 'telefono']
        },
        {
          association: 'inmueble',
          attributes: ['registro_inmobiliario', 'direccion', 'pais', 'departamento', 'ciudad']
        },
        {
          association: 'servicio',
          attributes: ['nombre_servicio']
        },
        {
          association: 'estado',
          attributes: ['nombre_estado']
        },
        {
          association: 'agente',
          required: false,
          attributes: ['id_persona', 'nombre_completo', 'apellido_completo']
        },
        {
          association: 'creador',
          required: false,
          attributes: ['id_persona', 'nombre_completo', 'apellido_completo']
        }
      ];

      const whereClause = {};
      if (filtros.id_estado_cita) whereClause.id_estado_cita = filtros.id_estado_cita;
      if (filtros.fecha_cita) whereClause.fecha_cita = filtros.fecha_cita;
      if (filtros.id_agente_asignado) whereClause.id_agente_asignado = filtros.id_agente_asignado;

      // ✅ OPTIMIZACIÓN: Usar paginación si se especifica
      const queryOptions = {
        where: whereClause,
        include: includeOptions,
        order: [
          ['fecha_cita', 'DESC'],
          ['hora_inicio', 'ASC']
        ],
        logging: false // ✅ Deshabilitar logging SQL para mejor rendimiento
      };

      // Aplicar paginación si se especifica
      if (filtros.page && filtros.limit) {
        const offset = (filtros.page - 1) * filtros.limit;
        queryOptions.limit = filtros.limit;
        queryOptions.offset = offset;
      }

      const { count, rows } = await Cita.findAndCountAll(queryOptions);

      logger.info(`✅ ${rows.length} citas obtenidas exitosamente`);

      // Transformar al formato esperado por el frontend
      const citasFormateadas = rows.map(cita => ({
        id: cita.id_cita,
        id_cita: cita.id_cita,
        id_persona: cita.id_persona,
        id_inmueble: cita.id_inmueble,
        id_servicio: cita.id_servicio,
        fecha_cita: cita.fecha_cita,
        hora_inicio: cita.hora_inicio,
        hora_fin: cita.hora_fin,
        id_estado_cita: cita.id_estado_cita,
        id_agente_asignado: cita.id_agente_asignado,
        observaciones: cita.observaciones,
        motivo_reagendamiento: cita.motivo_reagendamiento,
        motivo_cancelacion: cita.motivo_cancelacion,
        fecha_cancelacion: cita.fecha_cancelacion,
        fecha_creacion: cita.fecha_creacion,

        cliente: cita.cliente ? {
          id_persona: cita.cliente.id_persona,
          nombre_completo: cita.cliente.nombre_completo,
          apellido_completo: cita.cliente.apellido_completo,
          tipo_documento: cita.cliente.tipo_documento,
          numero_documento: cita.cliente.numero_documento,
          correo: cita.cliente.correo,
          telefono: cita.cliente.telefono
        } : null,

        inmueble: cita.inmueble ? {
          registro_inmobiliario: cita.inmueble.registro_inmobiliario,
          direccion: cita.inmueble.direccion,
          pais: cita.inmueble.pais,
          departamento: cita.inmueble.departamento,
          ciudad: cita.inmueble.ciudad
        } : null,

        servicio: cita.servicio ? {
          nombre_servicio: cita.servicio.nombre_servicio
        } : null,

        estado: cita.estado ? cita.estado.nombre_estado : 'Desconocido',

        agente: cita.agente ? {
          id_persona: cita.agente.id_persona,
          nombre_completo: cita.agente.nombre_completo,
          apellido_completo: cita.agente.apellido_completo
        } : null,

        creador: cita.creador ? {
          id_persona: cita.creador.id_persona,
          nombre_completo: cita.creador.nombre_completo,
          apellido_completo: cita.creador.apellido_completo
        } : null
      }));

      // ✅ OPTIMIZACIÓN: Retornar con paginación si se aplicó
      if (filtros.page && filtros.limit) {
        return {
          citas: citasFormateadas,
          total: count,
          page: filtros.page,
          limit: filtros.limit,
          pages: Math.ceil(count / filtros.limit)
        };
      }

      // Retornar array simple si no hay paginación
      return citasFormateadas;

    } catch (error) {
      logger.error(`❌ Error en obtenerTodasLasCitas: ${error.message}`);
      throw error;
    }
  }

  async eliminarCita(id) {
    try {
      const cita = await Cita.findByPk(id);
      if (!cita) {
        throw new Error('Cita no encontrada');
      }

      // En lugar de eliminar, actualizar el estado a cancelada (6)
      await cita.update({
        id_estado_cita: 6, // Cancelada
        motivo_cancelacion: 'Eliminada por el usuario',
        fecha_cancelacion: new Date()
      });

      return await this.obtenerCitaPorId(id);
    } catch (error) {
      throw error;
    }
  }

  async confirmarCita(id, idAgenteAsignado) {
    try {
      // Tomar instancia directa para poder usar update
      const cita = await Cita.findByPk(id);
      if (!cita) {
        throw new Error('Cita no encontrada');
      }

      await cita.update({
        id_estado_cita: 2, // Confirmada
        id_agente_asignado: idAgenteAsignado,
        fecha_confirmacion: new Date()
      });

      // Retornar la cita con includes completos
      return await this.obtenerCitaPorId(id);
    } catch (error) {
      throw error;
    }
  }

  async cancelarCita(id, motivoCancelacion) {
    try {
      // Necesitamos la instancia de Sequelize para poder llamar a update
      const cita = await Cita.findByPk(id);
      if (!cita) {
        throw new Error('Cita no encontrada');
      }

      await cita.update({
        id_estado_cita: 6, // Cancelada
        motivo_cancelacion: motivoCancelacion,
        fecha_cancelacion: new Date()
      });

      return await this.obtenerCitaPorId(id);
    } catch (error) {
      throw error;
    }
  }

  async reagendarCita(id, nuevosDatos) {
    const result = await sequelize.transaction(async (t) => {
      try {
        logger.info(`🔄 Reagendando cita ${id} con datos: ${JSON.stringify(nuevosDatos)}`);

        // Tomar instancia de Sequelize (no JSON) para poder usar update
        const citaModel = await Cita.findByPk(id, { transaction: t });
        if (!citaModel) {
          throw new Error('Cita no encontrada');
        }

        // Guardar ID del agente anterior para historial
        const idAgenteAnterior = citaModel.id_agente_asignado;

        // Actualizar la cita con los nuevos datos
        const datosActualizados = {
          fecha_cita: normalizarFechaCita(nuevosDatos.fecha_cita),
          hora_inicio: nuevosDatos.hora_inicio,
          hora_fin: nuevosDatos.hora_fin,
          motivo_reagendamiento: nuevosDatos.motivo_reagendamiento,
          id_agente_asignado: nuevosDatos.id_agente_asignado,
          id_estado_cita: 4, // Reagendada
          fecha_actualizacion: new Date()
        };

        await citaModel.update(datosActualizados, { transaction: t });

        // Si se cambió el agente, registrar en historial de asignaciones
        if (idAgenteAnterior !== nuevosDatos.id_agente_asignado) {
          const { HistorialAsignacionAgente } = require('../models');
          await HistorialAsignacionAgente.create({
            id_cita: id,
            id_agente_anterior: idAgenteAnterior,
            id_agente_nuevo: nuevosDatos.id_agente_asignado,
            comentario: `Reagendamiento de cita - ${nuevosDatos.motivo_reagendamiento}`,
            estado_asignacion: idAgenteAnterior ? 'Reasignada' : 'Activa',
            id_usuario_realizo: nuevosDatos.id_usuario_realizo,
            fecha_asignacion: new Date()
          }, { transaction: t });
        }

        logger.info(`✅ Cita ${id} reagendada exitosamente`);
        return await this.obtenerCitaPorId(id, t);

      } catch (error) {
        logger.error(`❌ Error reagendando cita ${id}: ${error.message}`);
        throw error;
      }
    });

    return result;
  }

  async completarCita(id) {
    try {
      // Necesitamos la instancia de Sequelize para poder actualizar
      const citaModel = await Cita.findByPk(id);
      if (!citaModel) {
        throw new Error('Cita no encontrada');
      }

      await citaModel.update({
        id_estado_cita: 5, // Completada
        fecha_completada: new Date()
      });

      return await this.obtenerCitaPorId(id);
    } catch (error) {
      throw error;
    }
  }

  async actualizarCita(id, nuevosDatos) {
    try {
      const cita = await this.obtenerCitaPorId(id);

      if (!cita) {
        throw new Error('Cita no encontrada');
      }

      const datosActualizados = {
        ...nuevosDatos,
        fecha_actualizacion: new Date()
      };

      if (typeof nuevosDatos.fecha_cita !== 'undefined') {
        datosActualizados.fecha_cita = normalizarFechaCita(nuevosDatos.fecha_cita);
      }

      await cita.update(datosActualizados);

      return await this.obtenerCitaPorId(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Asignar un agente a una cita y registrar en historial
   * @param {number} idCita - ID de la cita
   * @param {number} idAgenteNuevo - ID del agente a asignar
   * @param {number} idUsuarioRealizo - ID del usuario que realiza la asignaci?n
   * @param {string} comentario - Comentario opcional (requerido si es reasignaci?n)
   * @param {string|null} motivo_reagendamiento - Motivo de la reasignaci?n/reagendamiento
   * @returns {Promise<Object>} Cita actualizada con historial
   */
  async asignarAgente(idCita, idAgenteNuevo, idUsuarioRealizo, comentario = null, motivo_reagendamiento = null) {
    const result = await sequelize.transaction(async (t) => {
      try {
        logger.info(`Asignando agente ${idAgenteNuevo} a cita ${idCita}`);

        const cita = await Cita.findByPk(idCita, { transaction: t });
        if (!cita) {
          throw new Error('Cita no encontrada');
        }

        const idAgenteAnterior = cita.id_agente_asignado;
        const motivoFinal = motivo_reagendamiento || comentario || null;

        if (idAgenteAnterior && !motivoFinal) {
          throw new Error('Se requiere un motivo cuando se reasigna un agente');
        }

        await cita.update({
          id_agente_asignado: idAgenteNuevo,
          motivo_reagendamiento: motivoFinal || cita.motivo_reagendamiento,
          fecha_actualizacion: new Date()
        }, { transaction: t });

        if (cita.id_estado_cita === 1) { // Solicitada
          await cita.update({
            id_estado_cita: 2, // Confirmada
            fecha_confirmacion: new Date()
          }, { transaction: t });
        }

        const { HistorialAsignacionAgente } = require('../models');
        await HistorialAsignacionAgente.create({
          id_cita: idCita,
          id_agente_anterior: idAgenteAnterior,
          id_agente_nuevo: idAgenteNuevo,
          comentario: motivoFinal,
          estado_asignacion: idAgenteAnterior ? 'Reasignada' : 'Activa',
          id_usuario_realizo: idUsuarioRealizo,
          fecha_asignacion: new Date()
        }, { transaction: t });

        logger.info(`Agente asignado exitosamente a cita ${idCita}`);
        // Retornar la cita sin historial completo para evitar timeouts
        return await this.obtenerCitaPorId(idCita, t);

      } catch (error) {
        logger.error(`Error asignando agente: ${error.message}`);
        throw error;
      }
    });

    return result;
  }

  /**
   * Obtener agentes disponibles para asignaci?n (empleados activos)
   * @returns {Promise<Array>} Lista de agentes disponibles
   *
  /**
   * Obtener agentes disponibles para asignaci?n (empleados activos)
   * @returns {Promise<Array>} Lista de agentes disponibles
   */
  async obtenerAgentesDisponibles() {
    try {
      logger.info(`Obteniendo agentes disponibles`);

      const { Persona, Administrativo, Rol, Permiso } = require('../models');

      const agentes = await Persona.findAll({
        include: [
          {
            model: Administrativo,
            as: 'administrativo',
            where: { estado_laboral: 'Activo' },
            required: true
          },
          {
            model: Rol,
            as: 'roles',
            where: { estado: true },
            through: { attributes: [] },
            required: true,
            attributes: ['id_rol', 'nombre_rol'],
            include: [
              {
                model: Permiso,
                as: 'permisos',
                required: true,
                attributes: ['modulo', 'permiso'],
                where: {
                  estado: true,
                  modulo: { [Op.in]: ['citas', 'Citas', 'CITAS'] }
                }
              }
            ]
          }
        ],
        distinct: true,
        order: [
          ['nombre_completo', 'ASC'],
          ['apellido_completo', 'ASC']
        ],
        attributes: [
          'id_persona',
          'nombre_completo',
          'apellido_completo',
          ['nombre_completo', 'nombres'],
          ['apellido_completo', 'apellidos'],
          'correo'
        ]
      });

      const agentesFormateados = agentes.map(agente => ({
        id_persona: agente.id_persona,
        nombre_completo: `${(agente.nombre_completo || '').trim()} ${(agente.apellido_completo || '').trim()}`.trim(),
        email: agente.correo,
        roles: agente.roles?.map(r => r.nombre_rol) || []
      }));

      logger.info(`${agentesFormateados.length} agentes disponibles encontrados`);
      return agentesFormateados;

    } catch (error) {
      logger.error(`Error obteniendo agentes: ${error.message}`);
      throw error;
    }
  }

  /**
     * Obtener historial de asignaciones de una cita
     * @param {number} idCita - ID de la cita
     * @returns {Promise<Array>} Historial de asignaciones
     */
  async obtenerHistorialAsignaciones(idCita) {
    try {
      const { HistorialAsignacionAgente } = require('../models');

      const historial = await HistorialAsignacionAgente.findAll({
        where: { id_cita: idCita },
        include: [
          {
            association: 'agenteAnterior',
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo'],
            required: false
          },
          {
            association: 'agenteNuevo',
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo'],
            required: true
          },
          {
            association: 'usuarioRealizo',
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo'],
            required: true
          }
        ],
        order: [['fecha_asignacion', 'DESC']],
        limit: 50 // evitar timeouts en historiales muy largos
      });

      const historialFormateado = historial.map(entry => ({
        id_historial: entry.id_historial,
        fecha_asignacion: entry.fecha_asignacion,
        comentario: entry.comentario,
        estado_asignacion: entry.estado_asignacion,
        agente_anterior: entry.agenteAnterior ? {
          id_persona: entry.agenteAnterior.id_persona,
          nombre_completo: `${entry.agenteAnterior.nombre_completo} ${entry.agenteAnterior.apellido_completo}`
        } : null,
        agente_nuevo: {
          id_persona: entry.agenteNuevo.id_persona,
          nombre_completo: `${entry.agenteNuevo.nombre_completo} ${entry.agenteNuevo.apellido_completo}`
        },
        usuario_realizo: {
          id_persona: entry.usuarioRealizo.id_persona,
          nombre_completo: `${entry.usuarioRealizo.nombre_completo} ${entry.usuarioRealizo.apellido_completo}`
        }
      }));

      return historialFormateado;

    } catch (error) {
      logger.error(`❌ Error obteniendo historial: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener cita con historial de asignaciones completo
   * @param {number} idCita - ID de la cita
   * @param {Object} transaction - Transacción opcional
   * @returns {Promise<Object>} Cita con historial
   */
  async obtenerCitaConHistorial(idCita, transaction = null) {
    try {
      const cita = await this.obtenerCitaPorId(idCita, transaction);
      const historial = await this.obtenerHistorialAsignaciones(idCita);

      return {
        ...cita.toJSON(),
        historial_asignaciones: historial
      };

    } catch (error) {
      logger.error(`❌ Error obteniendo cita con historial: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO OPTIMIZADO: Actualizar solo el estado de la cita sin cargar asociaciones
   * Reduce el tiempo de respuesta de ~1 segundo a ~50-100ms
   */
  async actualizarEstadoCitaOptimizado(idCita, idEstadoCita) {
    try {
      logger.info(`🔄 Actualizando estado de cita ${idCita} a ${idEstadoCita} (optimizado)`);

      // Validar que la cita existe
      const citaExiste = await Cita.findByPk(idCita, {
        attributes: ['id_cita', 'id_estado_cita']
      });

      if (!citaExiste) {
        throw new Error('Cita no encontrada');
      }

      // Actualizar solo el estado sin cargar asociaciones
      const [affectedRows] = await Cita.update(
        {
          id_estado_cita: idEstadoCita,
          fecha_actualizacion: new Date()
        },
        {
          where: { id_cita: idCita },
          returning: false // No necesitamos devolver los datos actualizados
        }
      );

      if (affectedRows === 0) {
        throw new Error('No se pudo actualizar el estado de la cita');
      }

      logger.info(`✅ Estado de cita ${idCita} actualizado a ${idEstadoCita} (optimizado)`);

      // Retornar solo los datos mínimos necesarios para la actualización optimista
      return {
        id_cita: idCita,
        id_estado_cita: idEstadoCita,
        fecha_actualizacion: new Date()
      };
    } catch (error) {
      logger.error(`❌ Error en actualizarEstadoCitaOptimizado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener citas filtradas por permisos del usuario
   * @param {number} userId - ID del usuario
   * @param {Object} filtros - Filtros adicionales (estado, fecha, etc.)
   * @returns {Promise<Array>} Lista de citas filtradas por permisos
   */
  async obtenerCitasPorUsuario(userId, filtros = {}) {
    try {
      logger.info(`🔍 Consultando citas para usuario ${userId} con filtros: ${JSON.stringify(filtros)}`);

      // Verificar roles del usuario
      const { Persona, Rol } = require('../models');
      const persona = await Persona.findOne({
        where: { id_persona: userId },
        include: [
          {
            model: Rol,
            as: 'roles',
            through: { attributes: [] },
            attributes: ['nombre_rol']
          }
        ]
      });

      if (!persona) {
        throw new Error('Usuario no encontrado');
      }

      const roles = persona.roles.map(rol => rol.nombre_rol);
      const esSuperAdmin = roles.includes('Super Administrador');
      const esAdmin = roles.includes('Administrador');

      let whereClause = {};

      // Aplicar filtros básicos
      if (filtros.id_estado_cita) whereClause.id_estado_cita = filtros.id_estado_cita;
      if (filtros.fecha_cita) whereClause.fecha_cita = filtros.fecha_cita;
      if (filtros.id_agente_asignado) whereClause.id_agente_asignado = filtros.id_agente_asignado;

      // Si NO es super admin ni admin, filtrar las citas por permisos
      if (!esSuperAdmin && !esAdmin) {
        // Para empleados: solo sus citas asignadas o creadas por ellos
        whereClause[Op.or] = [
          { id_agente_asignado: userId },
          { id_usuario_creador: userId }
        ];
      }
      // Si es super admin o admin, no filtra adicional (ve todas)

      logger.info(`📋 WHERE clause para usuario ${userId}: ${JSON.stringify(whereClause)}`);

      const citas = await Cita.findAll({
        where: whereClause,
        include: [
          {
            association: 'cliente',
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'tipo_documento', 'numero_documento', 'correo', 'telefono']
          },
          {
            association: 'inmueble',
            attributes: ['registro_inmobiliario', 'direccion', 'pais', 'departamento', 'ciudad']
          },
          {
            association: 'servicio',
            attributes: ['nombre_servicio']
          },
          {
            association: 'estado',
            attributes: ['nombre_estado']
          },
          {
            association: 'agente',
            required: false,
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo']
          },
          {
            association: 'creador',
            required: false,
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo']
          }
        ],
        order: [
          ['fecha_cita', 'DESC'],
          ['hora_inicio', 'ASC']
        ],
        logging: false
      });

      // Transformar al formato del frontend
      const citasFormateadas = citas.map(cita => ({
        id: cita.id_cita,
        id_cita: cita.id_cita,
        id_persona: cita.id_persona,
        id_inmueble: cita.id_inmueble,
        id_servicio: cita.id_servicio,
        id_usuario_creador: cita.id_usuario_creador,
        fecha_cita: cita.fecha_cita,
        hora_inicio: cita.hora_inicio,
        hora_fin: cita.hora_fin,
        id_estado_cita: cita.id_estado_cita,
        id_agente_asignado: cita.id_agente_asignado,
        observaciones: cita.observaciones,
        fecha_creacion: cita.fecha_creacion,

        cliente: cita.cliente ? {
          id_persona: cita.cliente.id_persona,
          nombre_completo: cita.cliente.nombre_completo,
          apellido_completo: cita.cliente.apellido_completo,
          tipo_documento: cita.cliente.tipo_documento,
          numero_documento: cita.cliente.numero_documento,
          correo: cita.cliente.correo,
          telefono: cita.cliente.telefono
        } : null,

        inmueble: cita.inmueble ? {
          registro_inmobiliario: cita.inmueble.registro_inmobiliario,
          direccion: cita.inmueble.direccion,
          pais: cita.inmueble.pais,
          departamento: cita.inmueble.departamento,
          ciudad: cita.inmueble.ciudad
        } : null,

        servicio: cita.servicio ? {
          nombre_servicio: cita.servicio.nombre_servicio
        } : null,

        estado: cita.estado ? cita.estado.nombre_estado : 'Desconocido',

        agente: cita.agente ? {
          id_persona: cita.agente.id_persona,
          nombre_completo: cita.agente.nombre_completo,
          apellido_completo: cita.agente.apellido_completo
        } : null,

        creador: cita.creador ? {
          id_persona: cita.creador.id_persona,
          nombre_completo: cita.creador.nombre_completo,
          apellido_completo: cita.creador.apellido_completo
        } : null
      }));

      logger.info(`✅ ${citasFormateadas.length} citas obtenidas para usuario ${userId} (${roles.join(', ')})`);
      return citasFormateadas;

    } catch (error) {
      logger.error(`❌ Error en obtenerCitasPorUsuario: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener citas del usuario como cliente (citas que agendó para sí mismo)
   * @param {number} userId - ID del usuario (cliente)
   * @param {Object} filtros - Filtros adicionales (estado, fecha, etc.)
   * @returns {Promise<Array>} Lista de citas del usuario como cliente
   */
  async obtenerCitasPorCliente(userId, filtros = {}) {
    try {
      logger.info(`🔍 Consultando citas como cliente para usuario ${userId} con filtros: ${JSON.stringify(filtros)}`);

      let whereClause = { id_persona: userId };

      // Aplicar filtros básicos
      if (filtros.id_estado_cita) whereClause.id_estado_cita = filtros.id_estado_cita;
      if (filtros.fecha_cita) whereClause.fecha_cita = filtros.fecha_cita;
      if (filtros.id_servicio) whereClause.id_servicio = filtros.id_servicio;

      logger.info(`📋 WHERE clause para cliente ${userId}: ${JSON.stringify(whereClause)}`);

      const citas = await Cita.findAll({
        where: whereClause,
        include: [
          {
            association: 'inmueble',
            attributes: ['registro_inmobiliario', 'direccion', 'pais', 'departamento', 'ciudad']
          },
          {
            association: 'servicio',
            attributes: ['nombre_servicio']
          },
          {
            association: 'estado',
            attributes: ['nombre_estado']
          },
          {
            association: 'agente',
            required: false,
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo', 'telefono', 'correo']
          },
          {
            association: 'creador',
            required: false,
            attributes: ['id_persona', 'nombre_completo', 'apellido_completo']
          }
        ],
        order: [
          ['fecha_cita', 'DESC'],
          ['hora_inicio', 'ASC']
        ],
        logging: false
      });

      // Transformar al formato del frontend
      const citasFormateadas = citas.map(cita => ({
        id: cita.id_cita,
        id_cita: cita.id_cita,
        id_persona: cita.id_persona,
        id_inmueble: cita.id_inmueble,
        id_servicio: cita.id_servicio,
        id_usuario_creador: cita.id_usuario_creador,
        fecha_cita: cita.fecha_cita,
        hora_inicio: cita.hora_inicio,
        hora_fin: cita.hora_fin,
        id_estado_cita: cita.id_estado_cita,
        id_agente_asignado: cita.id_agente_asignado,
        observaciones: cita.observaciones,
        motivo_reagendamiento: cita.motivo_reagendamiento,
        motivo_cancelacion: cita.motivo_cancelacion,
        fecha_creacion: cita.fecha_creacion,
        fecha_actualizacion: cita.fecha_actualizacion,
        ediciones_realizadas: cita.ediciones_realizadas || 0,
        ediciones_maximas: cita.ediciones_maximas || 2,

        inmueble: cita.inmueble ? {
          registro_inmobiliario: cita.inmueble.registro_inmobiliario,
          direccion: cita.inmueble.direccion,
          pais: cita.inmueble.pais,
          departamento: cita.inmueble.departamento,
          ciudad: cita.inmueble.ciudad
        } : null,

        servicio: cita.servicio ? {
          nombre_servicio: cita.servicio.nombre_servicio
        } : null,

        estado: cita.estado ? cita.estado.nombre_estado : 'Desconocido',

        agente: cita.agente ? {
          id_persona: cita.agente.id_persona,
          nombre_completo: cita.agente.nombre_completo,
          apellido_completo: cita.agente.apellido_completo,
          telefono: cita.agente.telefono,
          correo: cita.agente.correo
        } : null,

        creador: cita.creador ? {
          id_persona: cita.creador.id_persona,
          nombre_completo: cita.creador.nombre_completo,
          apellido_completo: cita.creador.apellido_completo
        } : null
      }));

      logger.info(`✅ ${citasFormateadas.length} citas obtenidas para cliente ${userId}`);
      return citasFormateadas;

    } catch (error) {
      logger.error(`❌ Error en obtenerCitasPorCliente: ${error.message}`);
      throw error;
    }
  }

  /**
   * Incrementar el contador de ediciones realizadas sobre una cita
   * @param {number} idCita - ID de la cita
   * @returns {Promise<boolean>} True si se incrementó exitosamente
   */
  async incrementarContadorEdiciones(idCita) {
    try {
      logger.info(`🔢 Incrementando contador de ediciones para cita ${idCita}`);

      const [affectedRows] = await Cita.increment('ediciones_realizadas', {
        where: { id_cita: idCita },
        by: 1
      });

      if (affectedRows === 0) {
        throw new Error('No se pudo incrementar el contador de ediciones');
      }

      logger.info(`✅ Contador de ediciones incrementado para cita ${idCita}`);
      return true;

    } catch (error) {
      logger.error(`❌ Error incrementando contador de ediciones para cita ${idCita}: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ MÉTODO COMBINADO: Incrementar contador + Actualizar cita en una transacción atómica
   * @param {number} idCita - ID de la cita
   * @param {Object} nuevosDatos - Datos para actualizar
   * @returns {Promise<Object>} Cita actualizada con contador incrementado
   */
  async incrementarContadorEdicionesActualizar(idCita, nuevosDatos = {}) {
    console.log(`🚨🚨🚨 [SERVICE] incrementarContadorEdicionesActualizar llamado para cita ${idCita}`);
    console.log(`🚨🚨🚨 [SERVICE] Datos recibidos:`, nuevosDatos);

    const result = await sequelize.transaction(async (t) => {
      try {
        console.log(`🔢🔄 [DEBUG] Entrando a transacción para cita ${idCita}`);
        console.log(`🔢🔄 [DEBUG] Datos recibidos en try: ${JSON.stringify(nuevosDatos)}`);
        logger.info(`🔢🔄 [DEBUG] Incrementando contador Y actualizando cita ${idCita} atómicamente`);
        logger.info(`🔢🔄 [DEBUG] Datos recibidos: ${JSON.stringify(nuevosDatos)}`);

        // Verificar cita original antes de actualizar
        const citaOriginal = await Cita.findByPk(idCita, {
          attributes: [
            'id_cita',
            'fecha_cita',
            'hora_inicio',
            'hora_fin',
            'ediciones_realizadas',
            'ediciones_maximas',
            'id_agente_asignado',
            'id_persona',
            'id_inmueble',
            'id_servicio',
            'id_estado_cita',
            'observaciones',
            'motivo_reagendamiento'
          ],
          transaction: t
        });

        if (!citaOriginal) {
          throw new Error(`Cita ${idCita} no encontrada`);
        }

        const edicionesMaximas = citaOriginal.ediciones_maximas ?? 2;
        logger.info(`🔢🔄 [DEBUG] Cita original antes: fecha=${citaOriginal.fecha_cita}, ediciones=${citaOriginal.ediciones_realizadas}/${edicionesMaximas}`);

        // Obtener el valor actual del contador y actualizar todo en una sola operación
        const citaActual = await Cita.findByPk(idCita, {
          attributes: ['id_cita', 'ediciones_realizadas'],
          transaction: t
        });

        if (!citaActual) {
          throw new Error(`Cita ${idCita} no encontrada durante la actualizacion`);
        }

        const valorActual = citaActual.ediciones_realizadas || 0;
        const nuevoValor = valorActual + 1;

        logger.info(`OK [DEBUG] Valor actual del contador: ${valorActual}, nuevo valor: ${nuevoValor}`);

        const fechaFinal = typeof nuevosDatos.fecha_cita !== 'undefined'
          ? normalizarFechaCita(nuevosDatos.fecha_cita)
          : citaOriginal.fecha_cita;

        const servicioFinal = typeof nuevosDatos.id_servicio !== 'undefined'
          ? nuevosDatos.id_servicio
          : citaOriginal.id_servicio;

        const observacionesFinal = typeof nuevosDatos.observaciones !== 'undefined'
          ? nuevosDatos.observaciones
          : citaOriginal.observaciones;

        const estadoFinal = typeof nuevosDatos.id_estado_cita !== 'undefined'
          ? nuevosDatos.id_estado_cita
          : citaOriginal.id_estado_cita;

        const agenteFinal = typeof nuevosDatos.id_agente_asignado !== 'undefined'
          ? nuevosDatos.id_agente_asignado
          : citaOriginal.id_agente_asignado;

        const motivoReagendamientoFinal = typeof nuevosDatos.motivo_reagendamiento !== 'undefined'
          ? nuevosDatos.motivo_reagendamiento
          : citaOriginal.motivo_reagendamiento;

        const rangoHorarioFinal = resolverRangoHorario({
          horaInicio: typeof nuevosDatos.hora_inicio !== 'undefined'
            ? nuevosDatos.hora_inicio
            : citaOriginal.hora_inicio,
          horaFin: typeof nuevosDatos.hora_fin !== 'undefined'
            ? nuevosDatos.hora_fin
            : citaOriginal.hora_fin
        });

        if (!rangoHorarioFinal.horaInicio || !rangoHorarioFinal.horaFin) {
          const horarioError = new Error('Horario de cita invalido. Verifique hora de inicio y hora de fin.');
          horarioError.status = 400;
          throw horarioError;
        }

        const debeActualizarPersona = [
          'tipo_documento',
          'numero_documento',
          'nombre_completo',
          'apellido_completo',
          'email',
          'correo',
          'telefono'
        ].some((campo) => typeof nuevosDatos[campo] !== 'undefined');

        if (debeActualizarPersona) {
          const personaAsociada = await Persona.findByPk(citaOriginal.id_persona, {
            attributes: [
              'id_persona',
              'tipo_documento',
              'numero_documento',
              'nombre_completo',
              'apellido_completo',
              'correo',
              'telefono'
            ],
            transaction: t
          });

          if (!personaAsociada) {
            throw new Error(`Persona asociada a la cita ${idCita} no encontrada`);
          }

          const datosPersonaActualizados = {};

          if (typeof nuevosDatos.nombre_completo !== 'undefined') {
            datosPersonaActualizados.nombre_completo = String(nuevosDatos.nombre_completo || '').trim();
          }

          if (typeof nuevosDatos.apellido_completo !== 'undefined') {
            datosPersonaActualizados.apellido_completo = String(nuevosDatos.apellido_completo || '').trim();
          }

          if (typeof nuevosDatos.telefono !== 'undefined') {
            datosPersonaActualizados.telefono = nuevosDatos.telefono;
          }

          const correoEntrada = typeof nuevosDatos.email !== 'undefined'
            ? nuevosDatos.email
            : nuevosDatos.correo;

          if (typeof correoEntrada !== 'undefined') {
            const correoNormalizado = correoEntrada
              ? String(correoEntrada).trim().toLowerCase()
              : null;

            if (correoNormalizado) {
              const correoEnUso = await Persona.findOne({
                where: {
                  correo: correoNormalizado,
                  id_persona: { [Op.ne]: personaAsociada.id_persona }
                },
                transaction: t
              });

              if (correoEnUso) {
                const correoError = new Error(`El correo ${correoNormalizado} ya esta en uso por otra persona`);
                correoError.status = 409;
                throw correoError;
              }
            }

            datosPersonaActualizados.correo = correoNormalizado;
          }

          const tipoDocumentoFinal = typeof nuevosDatos.tipo_documento !== 'undefined'
            ? nuevosDatos.tipo_documento
            : personaAsociada.tipo_documento;
          const numeroDocumentoFinal = typeof nuevosDatos.numero_documento !== 'undefined'
            ? nuevosDatos.numero_documento
            : personaAsociada.numero_documento;
          const documentoFueEditado = typeof nuevosDatos.tipo_documento !== 'undefined'
            || typeof nuevosDatos.numero_documento !== 'undefined';

          if (documentoFueEditado) {
            const documentoEnUso = await Persona.findOne({
              where: {
                tipo_documento: tipoDocumentoFinal,
                numero_documento: numeroDocumentoFinal,
                id_persona: { [Op.ne]: personaAsociada.id_persona }
              },
              transaction: t
            });

            if (documentoEnUso) {
              const documentoError = new Error(
                `Ya existe una persona con documento ${tipoDocumentoFinal} ${numeroDocumentoFinal}`
              );
              documentoError.status = 409;
              throw documentoError;
            }

            datosPersonaActualizados.tipo_documento = tipoDocumentoFinal;
            datosPersonaActualizados.numero_documento = numeroDocumentoFinal;
          }

          if (Object.keys(datosPersonaActualizados).length > 0) {
            await personaAsociada.update(datosPersonaActualizados, { transaction: t });
          }
        }

        // Actualizacion atomica: fecha/hora y contador en una sola operacion
        const datosCompletos = {
          fecha_cita: fechaFinal,
          hora_inicio: rangoHorarioFinal.horaInicio,
          hora_fin: rangoHorarioFinal.horaFin,
          motivo_reagendamiento: motivoReagendamientoFinal,
          id_servicio: servicioFinal,
          id_agente_asignado: agenteFinal,
          id_estado_cita: estadoFinal,
          observaciones: observacionesFinal,
          ediciones_realizadas: nuevoValor,
          ediciones_maximas: edicionesMaximas,
          fecha_actualizacion: new Date()
        };

        logger.info(`🔢🔄 [DEBUG] ACTUALIZACIÓN FINAL - Datos: ${JSON.stringify(datosCompletos)}`);

        // Usar Sequelize update con todos los campos en una sola operación atómica
        const [affectedRows] = await Cita.update(datosCompletos, {
          where: { id_cita: idCita },
          transaction: t
        });

        logger.info(`✅ [DEBUG] UPDATE-Sequelize ejecutado. Filas afectadas: ${affectedRows}`);

        if (affectedRows === 0) {
          throw new Error('No se pudo actualizar la cita');
        }

        // Verificar que realmente se guardó en la base de datos y retornar con includes completos
        const citaFinal = await this.obtenerCitaPorId(idCita, t);
        logger.info(`🔢🔄 [DEBUG] VERIFICACIÓN POST-UPDATE: fecha=${citaFinal.fecha_cita}, ediciones=${citaFinal.ediciones_realizadas}/${citaFinal.ediciones_maximas}`);
        logger.info(`🔢🔄 [DEBUG] Cita final retornada con EDICIONES: ${citaFinal.ediciones_realizadas}`);
        return citaFinal;

      } catch (error) {
        logger.error(`❌ Error en operación atómica para cita ${idCita}: ${error.message}`);
        throw error;
      }
    });

    return result;
  }

}

module.exports = new CitaService();
