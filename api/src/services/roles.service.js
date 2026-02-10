const { Rol, Persona, PersonasRol, Permiso } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize'); // ✅ AGREGADO: Importar Op
const logger = require('../utils/logger');
const { buildPermissionsPayload, normalizePermissionsStructure } = require('../utils/permissions.helper');

class RolesService {
  
  /**
   * Crear un nuevo rol
   * @param {Object} rolData - Datos del rol
   * @param {number} userId - ID del usuario que crea
   * @returns {Promise} Rol creado
   */
  async crearRol(rolData, userId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        // ✅ CORREGIDO: Verificar permisos con 'Super Administrador'
        const usuario = await Persona.findOne({
          where: { id_persona: userId },
          include: [
            {
              model: Rol,
              as: 'roles',
              through: { attributes: [] },
              where: { 
                nombre_rol: {
                  [Op.in]: ['Super Administrador', 'Administrador']
                }
              },
              required: true
            }
          ],
          transaction: t
        });

        if (!usuario) {
          throw new Error('No tienes permisos para crear roles');
        }

// Verificar que el rol no existe (solo roles activos)
const rolExistente = await Rol.findOne({
  where: { 
    nombre_rol: rolData.nombre_rol,
    estado: true  // ✅ Solo verificar roles activos
  },
  transaction: t
});

if (rolExistente) {
  throw new Error('El rol ya existe');
}

// ✅ OPCIÓN: Reactivar rol si existe pero está inactivo
const rolInactivo = await Rol.findOne({
  where: { 
    nombre_rol: rolData.nombre_rol,
    estado: false
  },
  transaction: t
});

if (rolInactivo) {
  // Reactivar el rol existente en lugar de crear uno nuevo
  await rolInactivo.update({ estado: true }, { transaction: t });
  logger.info(`Rol reactivado: ${rolInactivo.nombre_rol} por usuario ${userId}`);
  return rolInactivo;
}

        // Crear rol
        const rol = await Rol.create({
          nombre_rol: rolData.nombre_rol,
          descripcion: rolData.descripcion,
          es_rol_administrativo: rolData.es_rol_administrativo || false,
          estado: true
        }, { transaction: t });

        // Crear permisos si se enviaron
        if (rolData.permisos && Object.keys(rolData.permisos).length > 0) {
          const permisosData = buildPermissionsPayload(rolData.permisos, rol.id_rol);

          if (permisosData.length > 0) {
            await Permiso.bulkCreate(permisosData, { transaction: t });
          }
        }

        logger.info(`Rol creado: ${rol.nombre_rol} por usuario ${userId}`);
        return rol;

      } catch (error) {
        logger.error('Error creando rol:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Listar todos los roles
   * @returns {Promise} Lista de roles
   */
  async listarRoles() {
    try {
      const roles = await Rol.findAll({
        include: [
          {
            model: Permiso,
            as: 'permisos',
            where: { estado: true },
            required: false
          }
        ],
        order: [['id_rol', 'ASC']]
      });

      return roles;
    } catch (error) {
      logger.error('Error listando roles:', error);
      throw error;
    }
  }

  /**
   * Obtener rol por ID
   * @param {number} rolId - ID del rol
   * @returns {Promise} Rol encontrado
   */
  async obtenerPorId(rolId) {
    try {
      const rol = await Rol.findOne({
        where: { id_rol: rolId, estado: true },
        include: [
          {
            model: Permiso,
            as: 'permisos',
            where: { estado: true },
            required: false
          }
        ]
      });

      if (!rol) {
        throw new Error('Rol no encontrado');
      }

      return rol;
    } catch (error) {
      logger.error('Error obteniendo rol:', error);
      throw error;
    }
  }

  /**
   * Asignar rol a una persona
   * @param {number} personaId - ID de la persona
   * @param {number} rolId - ID del rol
   * @param {number} userId - ID del usuario que asigna
   * @returns {Promise} Asignación creada
   */
  async asignarRol(personaId, rolId, userId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        // Verificar permisos (solo Admin+ puede asignar roles)
        const usuario = await Persona.findOne({
          where: { id_persona: userId },
          include: [
            {
              model: Rol,
              as: 'roles',
              through: { attributes: [] },
              where: { 
                nombre_rol: { 
                  [Op.in]: ['Super Administrador', 'Administrador'] 
                } 
              },
              required: true
            }
          ],
          transaction: t
        });

        if (!usuario) {
          throw new Error('No tienes permisos para asignar roles');
        }

        // Verificar que la persona existe
        const persona = await Persona.findOne({
          where: { id_persona: personaId, estado: true },
          transaction: t
        });

        if (!persona) {
          throw new Error('Persona no encontrada');
        }

        // Verificar que el rol existe
        const rol = await this.obtenerPorId(rolId);

        // Verificar que no tenga ya este rol
        const asignacionExistente = await PersonasRol.findOne({
          where: {
            id_persona: personaId,
            id_rol: rolId,
            estado: true
          },
          transaction: t
        });

        if (asignacionExistente) {
          throw new Error('La persona ya tiene este rol asignado');
        }

        // Crear asignación
        const asignacion = await PersonasRol.create({
          id_persona: personaId,
          id_rol: rolId,
          estado: true
        }, { transaction: t });

        logger.info(`Rol ${rol.nombre_rol} asignado a persona ${personaId} por usuario ${userId}`);
        return asignacion;

      } catch (error) {
        logger.error('Error asignando rol:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Remover rol de una persona
   * @param {number} personaId - ID de la persona
   * @param {number} rolId - ID del rol
   * @param {number} userId - ID del usuario que remueve
   * @returns {Promise} True si se removió
   */
  async removerRol(personaId, rolId, userId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        // Verificar permisos
        const usuario = await Persona.findOne({
          where: { id_persona: userId },
          include: [
            {
              model: Rol,
              as: 'roles',
              through: { attributes: [] },
              where: { 
                nombre_rol: { 
                  [Op.in]: ['Super Administrador', 'Administrador'] 
                } 
              },
              required: true
            }
          ],
          transaction: t
        });

        if (!usuario) {
          throw new Error('No tienes permisos para remover roles');
        }

        // Encontrar asignación activa
        const asignacion = await PersonasRol.findOne({
          where: {
            id_persona: personaId,
            id_rol: rolId,
            estado: true
          },
          transaction: t
        });

        if (!asignacion) {
          throw new Error('La persona no tiene este rol asignado');
        }

        // Desactivar asignación
        await asignacion.update({ estado: false }, { transaction: t });
        logger.info(`Rol ${rolId} removido de persona ${personaId} por usuario ${userId}`);
        return true;

      } catch (error) {
        logger.error('Error removiendo rol:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Listar roles de una persona
   * @param {number} personaId - ID de la persona
   * @returns {Promise} Lista de roles de la persona
   */
  async listarRolesDePersona(personaId) {
    try {
      const persona = await Persona.findOne({
        where: { id_persona: personaId, estado: true },
        include: [
          {
            model: Rol,
            as: 'roles',
            through: { attributes: ['estado', 'fecha_asignacion'] },
            where: { estado: true },
            required: false
          }
        ]
      });

      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      return persona.roles || [];
    } catch (error) {
      logger.error('Error listando roles de persona:', error);
      throw error;
    }
  }

  /**
   * Actualizar rol
   * @param {number} rolId - ID del rol
   * @param {Object} updateData - Datos a actualizar
   * @param {number} userId - ID del usuario que actualiza
   * @returns {Promise} Rol actualizado
   */
  async actualizarRol(rolId, updateData, userId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        // ✅ CORREGIDO: Verificar permisos con 'Super Administrador'
        const usuario = await Persona.findOne({
          where: { id_persona: userId },
          include: [
            {
              model: Rol,
              as: 'roles',
              through: { attributes: [] },
              where: { 
                nombre_rol: { 
                  [Op.in]: ['Super Administrador', 'Administrador'] 
                } 
              },
              required: true
            }
          ],
          transaction: t
        });

        if (!usuario) {
          throw new Error('No tienes permisos para actualizar roles');
        }

        const rol = await Rol.findOne({
          where: { id_rol: rolId },
          transaction: t
        });

        if (!rol) {
          throw new Error('Rol no encontrado');
        }

        // No permitir cambiar nombre de roles del sistema
        const rolesSistema = ['Super Administrador', 'Administrador', 'Empleado', 'Usuario', 'Propietario'];
        if (rolesSistema.includes(rol.nombre_rol) && updateData.nombre_rol) {
          throw new Error('No se puede cambiar el nombre de roles del sistema');
        }

        // Si se está desactivando el rol, verificar que no tenga usuarios asignados
        if (updateData.estado === false) {
          const usuariosAsignados = await this.contarUsuariosAsignados(rolId);
          if (usuariosAsignados > 0) {
            throw new Error(`No se puede desactivar el rol porque tiene ${usuariosAsignados} usuario(s) asignado(s)`);
          }
        }

        // Actualizar el rol (sin permisos)
        const { permisos, ...updateFields } = updateData; // Separar permisos
        await rol.update(updateFields, { transaction: t });

        // Si se enviaron permisos, actualizarlos
        if (permisos) {
          const normalizedPermissions = normalizePermissionsStructure(permisos);
          // Desactivar permisos existentes
          await Permiso.update(
            { estado: false },
            { where: { id_rol: rolId }, transaction: t }
          );

          // Reactivar o crear permisos según se necesite
          for (const [modulo, permisosModulo] of Object.entries(normalizedPermissions)) {
            for (const [permiso, valor] of Object.entries(permisosModulo)) {
              if (!valor) {
                continue;
              }

              // Buscar si ya existe el permiso (desactivado o activo)
              const [permisoExistente, created] = await Permiso.findOrCreate({
                where: {
                  id_rol: rolId,
                  modulo,
                  permiso
                },
                defaults: {
                  id_rol: rolId,
                  modulo,
                  permiso,
                  estado: true
                },
                transaction: t
              });

              // Si no se creó (ya existía), reactivarlo
              if (!created) {
                await permisoExistente.update({ estado: true }, { transaction: t });
              }
            }
          }
        }

        logger.info(`Rol actualizado: ${rolId} por usuario ${userId}`);
        return rol;

      } catch (error) {
        logger.error('Error actualizando rol:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Contar usuarios asignados a un rol
   * @param {number} rolId - ID del rol
   * @returns {Promise} Número de usuarios asignados
   */
  async contarUsuariosAsignados(rolId) {
    try {
      const count = await PersonasRol.count({
        where: {
          id_rol: rolId,
          estado: true
        }
      });

      return count;
    } catch (error) {
      logger.error('Error contando usuarios asignados:', error);
      throw error;
    }
  }

  /**
   * Eliminar rol (lógicamente)
   * @param {number} rolId - ID del rol
   * @param {number} userId - ID del usuario que elimina
   * @returns {Promise} True si se eliminó
   */
  async eliminarRol(rolId, userId) {
    const result = await sequelize.transaction(async (t) => {
      try {
        // ✅ CORREGIDO: Verificar permisos con 'Super Administrador' y usar Op.in
        const usuario = await Persona.findOne({
          where: { id_persona: userId },
          include: [
            {
              model: Rol,
              as: 'roles',
              through: { attributes: [] },
              where: {
                nombre_rol: {
                  [Op.in]: ['Super Administrador', 'Administrador']
                }
              },
              required: true
            }
          ],
          transaction: t
        });

        if (!usuario) {
          throw new Error('No tienes permisos para eliminar roles');
        }

        const rol = await Rol.findOne({
          where: { id_rol: rolId },
          transaction: t
        });

        if (!rol) {
          throw new Error('Rol no encontrado');
        }

        // No permitir eliminar roles del sistema
        const rolesSistema = ['Super Administrador', 'Administrador', 'Empleado', 'Usuario', 'Propietario'];
        if (rolesSistema.includes(rol.nombre_rol)) {
          throw new Error('No se pueden eliminar roles del sistema');
        }

        // Verificar que no tenga usuarios asignados
        const usuariosAsignados = await this.contarUsuariosAsignados(rolId);
        if (usuariosAsignados > 0) {
          throw new Error(`No se puede eliminar el rol porque tiene ${usuariosAsignados} usuario(s) asignado(s)`);
        }

        await rol.update({ estado: false }, { transaction: t });
        logger.info(`Rol eliminado: ${rolId} por usuario ${userId}`);
        return true;

      } catch (error) {
        logger.error('Error eliminando rol:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Listar personas con un rol específico
   * @param {number} rolId - ID del rol
   * @returns {Promise} Lista de personas con el rol
   */
  async listarPersonasPorRol(rolId) {
    try {
      const rol = await Rol.findOne({
        where: { id_rol: rolId, estado: true },
        include: [
          {
            model: Persona,
            as: 'personas',
            through: { 
              attributes: ['estado', 'fecha_asignacion'],
              where: { estado: true }
            },
            where: { estado: true },
            required: false
          }
        ]
      });

      if (!rol) {
        throw new Error('Rol no encontrado');
      }

      return rol.personas || [];
    } catch (error) {
      logger.error('Error listando personas por rol:', error);
      throw error;
    }
  }
}

module.exports = new RolesService();
