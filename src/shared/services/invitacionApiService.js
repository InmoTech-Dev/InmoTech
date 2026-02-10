import { apiClient } from './api.config';

class InvitacionApiService {
  async validar(token) {
    return apiClient.get('/invitaciones/validar', { params: { token } });
  }

  async aceptar({ token, codigo_6d, password }) {
    return apiClient.post('/invitaciones/aceptar', { token, codigo_6d, password });
  }

  async reenviar(token) {
    return apiClient.post('/invitaciones/reenviar', { token });
  }

  async crearInvitacion(id_persona) {
    return apiClient.post('/invitaciones', { id_persona });
  }

  async verificarCorreo(token) {
    return apiClient.get('/auth/verify-email', { params: { token } });
  }
}

export default new InvitacionApiService();
