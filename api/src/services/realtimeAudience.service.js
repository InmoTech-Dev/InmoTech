const { Persona, Rol, Administrativo } = require('../models');
const logger = require('../utils/logger');

class RealtimeAudienceService {
  /**
   * Obtiene IDs de usuarios administrativos activos.
   * Reglas:
   * - Persona activa
   * - Rol activo marcado como administrativo
   * - Registro administrativo con estado laboral Activo
   * @returns {Promise<number[]>}
   */
  async obtenerAdministrativosActivosIds() {
    try {
      const personas = await Persona.findAll({
        where: { estado: true },
        attributes: ['id_persona'],
        include: [
          {
            model: Rol,
            as: 'roles',
            attributes: ['id_rol', 'es_rol_administrativo', 'estado'],
            where: { estado: true, es_rol_administrativo: true },
            through: {
              attributes: ['estado'],
              where: { estado: true },
            },
            required: true,
          },
          {
            model: Administrativo,
            as: 'administrativo',
            attributes: ['id_administrativo', 'estado_laboral'],
            where: { estado_laboral: 'Activo' },
            required: true,
          },
        ],
      });

      return Array.from(
        new Set(
          personas
            .map((persona) => Number.parseInt(persona.id_persona, 10))
            .filter((id) => Number.isInteger(id) && id > 0)
        )
      );
    } catch (error) {
      logger.error('[REALTIME][AUDIENCE] Error obtaining active admin ids', {
        error: error.message,
      });
      return [];
    }
  }
}

module.exports = new RealtimeAudienceService();
