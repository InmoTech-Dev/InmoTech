/**
 * Servicio de Server-Sent Events para notificaciones en tiempo real
 * Maneja la conexión SSE con el backend para recibir notificaciones de seguridad
 */

class SSEService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this._isConnected = false;
    this.forcedDisconnect = false; // Bandera para evitar reconexión en logout forzado
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 segundo
    this.maxReconnectDelay = 30000; // 30 segundos
  }

  /**
   * Conecta al servidor SSE usando cookies httpOnly
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.eventSource) {
      this.disconnect();
    }

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const url = `${baseUrl}/sse/connect`;

      console.log('📡 SSE: Intentando conectar con cookies httpOnly...', url);

      // ⚠️ IMPORTANTE: EventSource NO soporta headers, pero sí soporta credentials
      // Las cookies httpOnly se enviarán automáticamente porque el navegador las incluye
      const urlWithCreds = url + '?credentials=include'; // Este query param tiene meaning en el servidor
      this.eventSource = new EventSource(urlWithCreds, { withCredentials: true });

      this.eventSource.onopen = () => {
        console.log('📡 SSE: Conexión establecida');
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(event.type || 'message', data);
        } catch (error) {
          console.error('❌ SSE: Error parseando mensaje:', error);
        }
      };

      this.eventSource.onerror = async (error) => {
        console.error('❌ SSE: Error de conexión:', error);
        this._isConnected = false;

        let shouldForceLogout = false;

        // Verificar si el usuario está deshabilitado haciendo petición con cookies
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/me`, {
            method: 'GET',
            credentials: 'include', // ⚠️ IMPORTANTE: incluye cookies automáticamente
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.status === 403 || response.status === 401 || response.status === 423) {
            console.log('🚨 SSE: Usuario deshabilitado detectado - ejecutando logout forzado');
            shouldForceLogout = true;
          }
        } catch (verifyError) {
          console.warn('⚠️ Error verificando estado después de error SSE:', verifyError.message);
        }

        if (shouldForceLogout) {
          // Emitir evento para logout forzado
          this.emit('user_disabled', {
            message: 'Tu cuenta ha sido deshabilitada por un administrador',
            action: 'logout',
            timestamp: new Date().toISOString()
          });
          // Marcar como desconexión forzada para evitar reconexión
          this.setForcedDisconnect();
          return; // NO reconectar
        }

        // NO intentar reconectar si el usuario fue forzado a logout
        if (!this.forcedDisconnect) {
          this.handleReconnect();
        } else {
          console.log('📡 SSE: Usuario forzado logout - no reconectar');
        }
      };

      // Configurar listeners para eventos específicos
      this.setupEventListeners();

    } catch (error) {
      console.error('❌ SSE: Error creando conexión:', error);
      this.handleReconnect();
    }
  }

  /**
   * Configura los listeners para eventos específicos
   */
  setupEventListeners() {
    if (!this.eventSource) return;

    // Evento de conexión
    this.eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('📡 SSE: Conectado al servidor', data);
      this.emit('connected', data);
    });

    // Usuario deshabilitado
    this.eventSource.addEventListener('user_disabled', (event) => {
      const data = JSON.parse(event.data);
      console.log('🚫 SSE: Usuario deshabilitado recibido', data);
      this.emit('user_disabled', data);
    });

    // Contraseña cambiada
    this.eventSource.addEventListener('password_changed', (event) => {
      const data = JSON.parse(event.data);
      console.log('🔑 SSE: Contraseña cambiada recibida', data);
      this.emit('password_changed', data);
    });

    // Acceso administrativo revocado
    this.eventSource.addEventListener('admin_access_revoked', (event) => {
      const data = JSON.parse(event.data);
      console.log('🚫 SSE: Acceso administrativo revocado recibido', data);
      this.emit('admin_access_revoked', data);
    });

    // Heartbeat
    this.eventSource.addEventListener('heartbeat', (event) => {
      const data = JSON.parse(event.data);
      // No loguear heartbeats para evitar spam
      this.emit('heartbeat', data);
    });
  }

  /**
   * Maneja la reconexión automática
   */
  handleReconnect() {
    // NO reconectar si el usuario fue forzado a logout
    if (this.forcedDisconnect) {
      console.log('📡 SSE: Omitiendo reconexión - usuario forzado logout');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ SSE: Máximo número de intentos de reconexión alcanzado');
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`📡 SSE: Intentando reconectar en ${this.reconnectDelay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Aumentar el delay exponencialmente
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  /**
   * Maneja mensajes recibidos
   * @param {string} type - Tipo de evento
   * @param {Object} data - Datos del evento
   */
  handleMessage(type, data) {
    console.log(`📡 SSE: Mensaje recibido - Tipo: ${type}`, data);
    this.emit(type, data);
  }

  /**
   * Desconecta del servidor SSE
   */
  disconnect() {
    if (this.eventSource) {
      console.log('📡 SSE: Desconectando...');
      this.eventSource.close();
      this.eventSource = null;
      this._isConnected = false;
    }
  }

  /**
   * Agrega un listener para un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remueve un listener para un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback a remover
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emite un evento a todos los listeners
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos del evento
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ SSE: Error en callback de evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Obtiene el estado de conexión
   * @returns {boolean} True si está conectado
   */
  get isConnected() {
    return this._isConnected && this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * Marca que la desconexión es forzada (no debe reconectar automáticamente)
   */
  setForcedDisconnect() {
    this.forcedDisconnect = true;
  }

  /**
   * Resetea la bandera de desconexión forzada
   */
  resetForcedDisconnect() {
    this.forcedDisconnect = false;
  }

  /**
   * Obtiene estadísticas de conexión
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.eventSource ? this.eventSource.readyState : -1,
      listenersCount: this.listeners.size,
      forcedDisconnect: this.forcedDisconnect
    };
  }
}

// Exportar instancia singleton
export default new SSEService();
