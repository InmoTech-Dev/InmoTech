const rolesService = require('../services/roles.service');
const sseService = require('../services/sse.service');
const logger = require('../utils/logger');

class RolesController {
  /**
   * Crear un nuevo rol (solo Super Administrador)
   */
  async crearRol(req, res, next) {
    try {
      const rolData = req.validatedData;
      const userId = req.user.id;

      const rol = await rolesService.crearRol(rolData, userId);

      sseService.emitRoleChanged({ action: 'create', roleId: rol.id_rol });

      return res.status(201).json({
        success: true,
        message: 'Rol creado exitosamente',
        data: rol
      });
    } catch (error) {
      logger.error('Error creando rol:', error);
      next(error);
    }
  }

  /**
   * Listar todos los roles
   */
  async listarRoles(req, res, next) {
    try {
      const roles = await rolesService.listarRoles();

      return res.status(200).json({
        success: true,
        message: 'Roles listados exitosamente',
        data: roles
      });
    } catch (error) {
      logger.error('Error listando roles:', error);
      next(error);
    }
  }

  /**
   * Obtener rol por ID
   */
  async obtenerRol(req, res, next) {
    try {
      const { id } = req.params;
      const rol = await rolesService.obtenerPorId(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Rol obtenido exitosamente',
        data: rol
      });
    } catch (error) {
      logger.error('Error obteniendo rol:', error);
      next(error);
    }
  }

  /**
   * Actualizar rol (solo Super Administrador)
   */
  async actualizarRol(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.validatedData;
      const userId = req.user.id;

      const rol = await rolesService.actualizarRol(parseInt(id), updateData, userId);

      sseService.emitRoleChanged({ action: 'update', roleId: parseInt(id) });

      return res.status(200).json({
        success: true,
        message: 'Rol actualizado exitosamente',
        data: rol
      });
    } catch (error) {
      logger.error('Error actualizando rol:', error);
      next(error);
    }
  }

  /**
   * Eliminar rol (solo Super Administrador)
   */
  async eliminarRol(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await rolesService.eliminarRol(parseInt(id), userId);

      sseService.emitRoleChanged({ action: 'delete', roleId: parseInt(id) });

      return res.status(200).json({
        success: true,
        message: 'Rol eliminado exitosamente'
      });
    } catch (error) {
      logger.error('Error eliminando rol:', error);
      next(error);
    }
  }

  /**
   * Asignar rol a una persona (Admin+)
   */
  async asignarRol(req, res, next) {
    try {
      const { idPersona, idRol } = req.params;
      const userId = req.user.id;

      const asignacion = await rolesService.asignarRol(parseInt(idPersona), parseInt(idRol), userId);

      sseService.emitUserChanged({ action: 'role_assigned', userId: parseInt(idPersona) });

      return res.status(201).json({
        success: true,
        message: 'Rol asignado exitosamente',
        data: asignacion
      });
    } catch (error) {
      logger.error('Error asignando rol:', error);
      next(error);
    }
  }

  /**
   * Remover rol de una persona (Admin+)
   */
  async removerRol(req, res, next) {
    try {
      const { idPersona, idRol } = req.params;
      const userId = req.user.id;

      await rolesService.removerRol(parseInt(idPersona), parseInt(idRol), userId);

      sseService.emitUserChanged({ action: 'role_removed', userId: parseInt(idPersona) });

      return res.status(200).json({
        success: true,
        message: 'Rol removido exitosamente'
      });
    } catch (error) {
      logger.error('Error removiendo rol:', error);
      next(error);
    }
  }

  /**
   * Listar roles de una persona
   */
  async listarRolesDePersona(req, res, next) {
    try {
      const { idPersona } = req.params;
      const roles = await rolesService.listarRolesDePersona(parseInt(idPersona));

      return res.status(200).json({
        success: true,
        message: 'Roles de persona listados exitosamente',
        data: roles
      });
    } catch (error) {
      logger.error('Error listando roles de persona:', error);
      next(error);
    }
  }

  /**
   * Listar personas con un rol específico
   */
  async listarPersonasPorRol(req, res, next) {
    try {
      const { idRol } = req.params;
      const { Persona, PersonasRol } = require('../models');

      const personas = await Persona.findAll({
        include: [
          {
            model: require('../models').Rol,
            as: 'roles',
            through: {
              where: { id_rol: parseInt(idRol), estado: true }
            },
            required: true
          }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Personas con rol listadas exitosamente',
        data: personas.map(persona => ({
          id_persona: persona.id_persona,
          primer_nombre: persona.primer_nombre,
          segundo_nombre: persona.segundo_nombre,
          primer_apellido: persona.primer_apellido,
          segundo_apellido: persona.segundo_apellido,
          nombre_completo: persona.nombre_completo || `${persona.primer_nombre || ''} ${persona.segundo_nombre || ''} ${persona.primer_apellido || ''} ${persona.segundo_apellido || ''}`.replace(/\s+/g, ' ').trim(),
          correo: persona.correo,
          telefono: persona.telefono
        }))
      });
    } catch (error) {
      logger.error('Error listando personas por rol:', error);
      next(error);
    }
  }
}

module.exports = new RolesController();
