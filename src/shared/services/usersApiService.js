import { apiClient } from './api.config';

class UsersApiService {
  normalizeTelefonoParaApi(telefono) {
    if (telefono === undefined || telefono === null) return '';

    const raw = String(telefono).trim();
    if (!raw) return '';

    const digits = raw.replace(/\D/g, '');

    // Aceptar formato local colombiano: 3XXXXXXXXX
    if (/^3\d{9}$/.test(digits)) {
      return digits;
    }

    // Corregir formato comun invalido: 57XXXXXXXXXX (sin el +)
    if (/^573\d{9}$/.test(digits)) {
      return digits.slice(2);
    }

    // Mantener +57 cuando venga correcto
    if (raw.startsWith('+57')) {
      const localDigits = digits.startsWith('57') ? digits.slice(2) : digits;
      if (/^3\d{9}$/.test(localDigits)) {
        return `+57 ${localDigits}`;
      }
    }

    // Dejar el valor original para que backend valide otros casos
    return raw;
  }

  normalizeTelefonoParaUI(telefono) {
    if (telefono === undefined || telefono === null) return '';

    const raw = String(telefono).trim();
    if (!raw) return '';

    const digits = raw.replace(/\D/g, '');

    // Si viene guardado como 57XXXXXXXXXX, presentarlo de forma amigable
    if (/^573\d{9}$/.test(digits)) {
      return `+57 ${digits.slice(2)}`;
    }

    return raw;
  }

  /**
   * Normaliza campos de personas para formato consistente en UI
   */
  normalizePersonas(personas) {
    if (!Array.isArray(personas)) return [];

    const safeString = (value) => {
      if (value === undefined || value === null) return '';
      if (typeof value === 'string' && (value === 'undefined' || value.trim() === 'undefined')) return '';
      return String(value).trim();
    };

      return personas
        .filter(p => p && typeof p === 'object')
        .map(persona => ({
          id_persona: persona.id_persona,
          estado: persona.estado === true || persona.estado === 1 || persona.estado === 'true',
          correo_verificado: persona.correo_verificado ?? persona.tiene_cuenta ?? false,
          nombre_completo: safeString(persona.nombre_completo) || safeString(persona.nombres) || safeString(persona.primer_nombre),
          apellido_completo: safeString(persona.apellido_completo) || safeString(persona.apellidos) || safeString(persona.primer_apellido),
          correo: safeString(persona.correo) || safeString(persona.email),
          telefono: this.normalizeTelefonoParaUI(safeString(persona.telefono) || safeString(persona.phone)),
          tipo_documento: safeString(persona.tipo_documento) || safeString(persona.tipoDocumento),
        numero_documento: safeString(persona.numero_documento) || safeString(persona.numeroDocumento),
        fecha_registro: persona.fecha_registro || persona.createdAt || persona.fecha_creacion || null,
        updatedAt: persona.updatedAt || null,
        roles: persona.roles || [],
        administrativo: persona.administrativo || null,
        invitacion_estado: persona.estado === false
          ? 'Cuenta deshabilitada'
          : (persona.correo_verificado ?? persona.tiene_cuenta ?? false) === false
            ? 'Verificacion de correo pendiente'
            : persona.tiene_cuenta === false
              ? 'Pendiente de activacion (sin contrasena)'
              : 'Cuenta activa'
        }));
  }

  /**
   * Obtener lista de usuarios (personas con rol 'Usuario')
   */
  async getUsers(params = {}) {
    try {
      const responseParams = { ...params };
      delete responseParams.estado;

      const response = await apiClient.get('/personas', { params: responseParams });

      if (!response || !response.data) {
        throw new Error('Formato de respuesta inesperado del servidor');
      }

      const { personas, paginacion } = response.data;
      const usuarios = this.normalizePersonas(personas || []);

      return {
        data: {
          personas: usuarios,
          paginacion: {
            ...paginacion,
            total: paginacion?.total || usuarios.length
          }
        }
      };
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtener un usuario por ID
   */
  async getUserById(id) {
    try {
      return await apiClient.get(`/personas/${id}`);
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo usuario (admin)
   */
  async createUser(userData) {
    try {
      const payload = {
        tipo_documento: userData.tipo_documento,
        numero_documento: userData.numero_documento,
        nombre_completo: userData.nombre_completo,
        apellido_completo: userData.apellido_completo,
        correo: userData.correo,
        telefono: this.normalizeTelefonoParaApi(userData.telefono),
        password: userData.password,
        confirmPassword: userData.confirmPassword
      };

      return await apiClient.post('/personas', payload);
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(id, userData) {
    try {
      const payload = {
        ...userData,
        telefono: this.normalizeTelefonoParaApi(userData?.telefono)
      };
      return await apiClient.patch(`/personas/${id}`, payload);
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  /**
   * Cambiar estado de usuario (habilitar/deshabilitar)
   */
  async changeUserStatus(id, estadoData) {
    try {
      const requestData = { estado: estadoData.estado };
      return await apiClient.patch(`/personas/${id}/estado`, requestData);
    } catch (error) {
      console.error('Error cambiando estado del usuario:', error);
      throw error;
    }
  }

  /**
   * Deshabilitar usuario (borrado logico)
   */
  async deleteUser(id) {
    try {
      const updateData = { estado: false };
      return await apiClient.patch(`/personas/${id}/estado`, updateData);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  /**
   * Verificar si existe un correo
   */
  async verificarCorreoExistente(email) {
    try {
      const response = await apiClient.get(`/personas/verificar-correo/${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      console.error('Error verificando correo:', error);
      throw error;
    }
  }

  /**
   * Verificar si existe un documento
   */
  async verificarDocumentoExistente(tipo, numero) {
    try {
      const response = await apiClient.get(`/personas/verificar-documento/${encodeURIComponent(tipo)}/${encodeURIComponent(numero)}`);
      return response.data;
    } catch (error) {
      console.error('Error verificando documento:', error);
      throw error;
    }
  }

  /**
   * Formatear fecha para display
   */
  formatFecha(fechaString) {
    if (!fechaString) return '-';

      try {
      const date = new Date(fechaString);
      if (isNaN(date.getTime())) return fechaString;

      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return fechaString;
    }
  }
}

export default new UsersApiService();
