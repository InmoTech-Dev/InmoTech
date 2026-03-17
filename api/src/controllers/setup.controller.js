const { Persona, Administrativo, Acceso, PersonasRol, Rol } = require('../models');
const { sequelize } = require('../config/database');
const bcryptUtils = require('../utils/bcrypt');
const jwtUtils = require('../utils/jwt');
const logger = require('../utils/logger');

class SetupController {
  /**
   * Crear super administrador inicial
   * Este endpoint solo puede usarse una vez para crear el primer super admin
   */
  async crearSuperAdmin(req, res, next) {
    try {
      const { setupKey, adminData } = req.validatedData;

      // Verificar clave secreta de configuración
      const expectedKey = process.env.SETUP_SECRET_KEY;
      if (!expectedKey) {
        return res.status(500).json({
          success: false,
          message: 'Configuración incompleta: SETUP_SECRET_KEY no definida'
        });
      }

      if (setupKey !== expectedKey) {
        return res.status(403).json({
          success: false,
          message: 'Clave de configuración inválida'
        });
      }

      // Verificar si ya existe un super administrador
      const superAdminExistente = await sequelize.query(`
        SELECT p.id_persona
        FROM Personas p
        INNER JOIN Personas_rol pr ON p.id_persona = pr.id_persona
        INNER JOIN Roles r ON pr.id_rol = r.id_rol
        WHERE r.nombre_rol = 'Super Administrador'
      `, { type: sequelize.QueryTypes.SELECT });

      if (superAdminExistente.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un Super Administrador en el sistema'
        });
      }

      // Crear super administrador usando transacción
      const result = await sequelize.transaction(async (t) => {
        try {
          // Crear roles si no existen
          await SetupController._crearRolesSiNoExisten(t);

          // Normalizar teléfono para no exceder longitud en BD
          const telefonoLimpio = (adminData.telefono || '').replace(/[^\d\+]/g, '').slice(0, 15);

          // Crear persona
          const nuevaPersona = await Persona.create({
            tipo_documento: adminData.tipo_documento || 'CC',
            numero_documento: adminData.numero_documento,
            nombre_completo: adminData.nombre_completo,
            apellido_completo: adminData.apellido_completo,
            correo: adminData.email,
            telefono: telefonoLimpio,
            correo_verificado: true,
            tiene_cuenta: true,
            estado: true
          }, { transaction: t });

          // Crear acceso
          const hashedPassword = await bcryptUtils.hashPassword(adminData.password);
          await Acceso.create({
            id_persona: nuevaPersona.id_persona,
            contrasena: hashedPassword
          }, { transaction: t });

          // Crear registro administrativo
          const nuevoAdministrativo = await Administrativo.create({
            id_persona: nuevaPersona.id_persona,
            codigo_empleado: adminData.codigo_empleado,
            fecha_ingreso: adminData.fecha_ingreso || new Date(),
            estado_laboral: 'Activo'
          }, { transaction: t });

          // Asignar rol Super Administrador
          const rolSuperAdmin = await Rol.findOne({
            where: { nombre_rol: 'Super Administrador' },
            transaction: t
          });

          await PersonasRol.create({
            id_persona: nuevaPersona.id_persona,
            id_rol: rolSuperAdmin.id_rol
          }, { transaction: t });

          logger.info(`Super Administrador creado exitosamente: ${adminData.email}`);

          // Generar tokens
          const payload = {
            id: nuevaPersona.id_persona,
            email: nuevaPersona.correo,
            roles: ['Super Administrador'],
            es_administrativo: true
          };

          const tokens = jwtUtils.generateTokens(payload);

          return {
            user: {
              id: nuevaPersona.id_persona,
              email: nuevaPersona.correo,
              nombre_completo: nuevaPersona.nombre_completo,
              apellido_completo: nuevaPersona.apellido_completo,
              roles: payload.roles,
              es_administrativo: true,
              administrativo: {
                id_administrativo: nuevoAdministrativo.id_administrativo,
                codigo_empleado: nuevoAdministrativo.codigo_empleado
              }
            },
            ...tokens
          };

        } catch (error) {
          logger.error('Error creando super admin:', error.original?.message || error.message);
          throw error;
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Super Administrador creado exitosamente',
        data: result
      });

    } catch (error) {
      logger.error('Error en creación de super admin:', error);
      next(error);
    }
  }

  /**
   * Crear roles del sistema si no existen
   */
  static async _crearRolesSiNoExisten(transaction) {
    const roles = [
      { nombre_rol: 'Super Administrador', descripcion: 'Acceso total al sistema con todos los permisos', es_rol_administrativo: true },
      { nombre_rol: 'Administrador', descripcion: 'Gestión administrativa y configuración del sistema', es_rol_administrativo: true },
      { nombre_rol: 'Empleado', descripcion: 'Agentes inmobiliarios y empleados de la empresa', es_rol_administrativo: true },
      { nombre_rol: 'Usuario', descripcion: 'Rol por defecto al registrarse en el sistema', es_rol_administrativo: false },
      { nombre_rol: 'Propietario', descripcion: 'Usuarios que tienen inmuebles registrados a su nombre', es_rol_administrativo: false },
      { nombre_rol: 'Arrendatario', descripcion: 'Usuarios con acceso a su portal de facturas y pagos', es_rol_administrativo: false }
    ];

    for (const rol of roles) {
      const existe = await Rol.findOne({
        where: { nombre_rol: rol.nombre_rol },
        transaction
      });

      if (!existe) {
        await Rol.create(rol, { transaction });
        logger.info(`Rol creado: ${rol.nombre_rol}`);
      }
    }
  }
}

module.exports = new SetupController();
