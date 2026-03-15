/**
 * Servicio frontend para interactuar con el endpoint de Roles
 * Cliente HTTP que consume la API REST de roles del backend
 */

import { apiClient } from "./api.config";

class RolesApiService {
  /**
   * Obtener todos los roles
   */
  async obtenerRoles() {
    try {
      const response = await apiClient.get("/roles");
      const roles = Array.isArray(response) ? response : (response.data || response);


      if (!roles || !Array.isArray(roles)) {
        throw new Error("Formato de respuesta inválido del servidor");
      }

      return roles.map(rol => this.transformarRolDesdeAPI(rol));
    } catch (error) {
      console.error("Error al obtener roles:", error);
      throw new Error(error.message || "Error al cargar los roles desde el servidor");
    }
  }

  /**
   * Crear un nuevo rol
   */
  async crearRol(rolData) {
    try {
      this.validarDatosRol(rolData);

      const payload = {
        nombre_rol: rolData.nombre_rol,
        descripcion: rolData.descripcion || "",
        es_rol_administrativo: rolData.es_rol_administrativo || false,
        permisos: rolData.permisos || {}
      };

      const response = await apiClient.post("/roles", payload);
      const rolCreado = response.data || response;

      return this.transformarRolDesdeAPI(rolCreado);
    } catch (error) {
      console.error("Error al crear rol:", error);
      throw new Error(error.message || "Error al crear el rol");
    }
  }

  /**
   * Actualizar un rol
   */
  async actualizarRol(id, rolData) {
    try {
      if (!id) throw new Error("ID de rol es requerido");

      // Solo enviar campos según el rol
      const esRolSistema = ['Super Administrador', 'Administrador', 'Empleado', 'Usuario', 'Propietario'].includes(rolData.nombre_rol);

      const payload = esRolSistema
        ? { estado: rolData.estado, permisos: rolData.permisos }
        : { nombre_rol: rolData.nombre_rol, estado: rolData.estado, permisos: rolData.permisos };

      const response = await apiClient.patch(`/roles/${id}`, payload);
      const rolActualizado = response.data || response;


      if (!rolActualizado || (!rolActualizado.id_rol && !rolActualizado.id)) {
        throw new Error("El servidor no retornó datos válidos del rol actualizado");
      }

      return this.transformarRolDesdeAPI(rolActualizado);
    } catch (error) {
      console.error("Error en actualizarRol:", error);
      throw new Error(error.message || "Error al actualizar el rol");
    }
  }

  /**
   * Eliminar un rol
   */
  async eliminarRol(id) {
    try {
      if (!id) {
        throw new Error("ID de rol es requerido");
      }

      await apiClient.delete(`/roles/${id}`);
      return true;
    } catch (error) {
      console.error("Error al eliminar rol:", error);
      throw new Error(error.message || "Error al eliminar el rol");
    }
  }

  /**
   * Obtener rol por ID
   */
  async obtenerRolPorId(id) {
    try {
      if (!id) throw new Error("ID de rol es requerido");

      const response = await apiClient.get(`/roles/${id}`);
      const rol = response.data || response;

      return this.transformarRolDesdeAPI(rol);
    } catch (error) {
      console.error("Error al obtener rol:", error);
      throw new Error(error.message || "Error al obtener el rol");
    }
  }

  /**
   * Asignar rol a una persona
   */
  async asignarRol(idRol, idPersona) {
    try {
      const response = await apiClient.post(`/${idRol}/asignar/${idPersona}`);
      const asignacion = response.data || response;

      return asignacion;
    } catch (error) {
      console.error("Error al asignar rol:", error);
      throw new Error(error.message || "Error al asignar el rol");
    }
  }

  /**
   * Remover rol de una persona
   */
  async removerRol(idRol, idPersona) {
    try {
      await apiClient.delete(`/${idRol}/remover/${idPersona}`);
      return true;
    } catch (error) {
      console.error("Error al remover rol:", error);
      throw new Error(error.message || "Error al remover el rol");
    }
  }

  /**
   * Listar roles de una persona
   */
  async listarRolesDePersona(idPersona) {
    try {
      const response = await apiClient.get(`/roles/persona/${idPersona}`);
      const roles = response.data || response;

      return Array.isArray(roles) ? roles.map(rol => this.transformarRolDesdeAPI(rol)) : [];
    } catch (error) {
      console.error("Error al listar roles de persona:", error);
      throw new Error(error.message || "Error al obtener los roles de la persona");
    }
  }

  /**
   * Listar personas con un rol específico
   */
  async listarPersonasPorRol(idRol) {
    try {
      const response = await apiClient.get(`/${idRol}/personas`);
      const personas = response.data || response;

      return Array.isArray(personas) ? personas : [];
    } catch (error) {
      console.error("Error al listar personas por rol:", error);
      throw new Error(error.message || "Error al obtener las personas con el rol");
    }
  }

  // VALIDACIONES
  validarDatosRol(rolData) {
    const camposRequeridos = {
      nombre_rol: "Nombre del rol"
    };

    for (const [campo, etiqueta] of Object.entries(camposRequeridos)) {
      if (!rolData[campo] || String(rolData[campo]).trim() === "") {
        throw new Error(`${etiqueta} es requerido`);
      }
    }

    if (rolData.nombre_rol && rolData.nombre_rol.length < 3) {
      throw new Error("El nombre del rol debe tener al menos 3 caracteres");
    }

    if (rolData.nombre_rol && rolData.nombre_rol.length > 50) {
      throw new Error("El nombre del rol no puede exceder 50 caracteres");
    }

    if (rolData.nombre_rol && !/^[a-zA-ZÀ-ÿ\s]+$/.test(rolData.nombre_rol)) {
      throw new Error("El nombre del rol solo puede contener letras y espacios");
    }
  }

  // HELPERS - TRANSFORMACIÓN
  transformarRolDesdeAPI(rolAPI) {
    // Transformar permisos desde el formato de BD al formato del frontend
    const permisos = {};
    if (rolAPI.permisos && Array.isArray(rolAPI.permisos)) {
      rolAPI.permisos.forEach(permiso => {
        // Solo incluir permisos válidos (con modulo y permiso no vacíos)
        if (permiso.modulo && permiso.modulo.trim() &&
            permiso.permiso && permiso.permiso.trim()) {
          if (!permisos[permiso.modulo]) {
            permisos[permiso.modulo] = {};
          }
          permisos[permiso.modulo][permiso.permiso] = permiso.estado;
        }
      });
    }

    return {
      id: rolAPI.id_rol || rolAPI.id,
      id_rol: rolAPI.id_rol || rolAPI.id,
      nombre: rolAPI.nombre_rol,
      nombre_rol: rolAPI.nombre_rol,
      estado: rolAPI.estado,
      es_administrativo: rolAPI.es_rol_administrativo,
      es_rol_administrativo: rolAPI.es_rol_administrativo,
      fecha_creacion: rolAPI.fecha_creacion,
      permisos: permisos
    };
  }
}

const rolesApiService = new RolesApiService();
export default rolesApiService;
