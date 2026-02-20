/**
 * @fileoverview Frontend service for authentication endpoints
 * @module shared/services/authService
 */

import { apiClient } from './api.config.js';

class AuthService {
  /**
   * Login with email/password. Session is managed by httpOnly cookies.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async login(email, password) {
    try {
      console.log('[AUTH] Sending login request for:', email);

      const response = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password
      });

      console.log('[AUTH] Login response:', response);
      console.log('[AUTH] Session managed by cookies httpOnly');
      return response;
    } catch (error) {
      console.error('[AUTH] Login error:', error.message);
      throw error;
    }
  }

  /**
   * Register new user
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  async register(userData) {
    try {
      console.log('[AUTH] Sending register request for:', userData.email);

      const payload = {
        tipo_documento: userData.tipo_documento,
        numero_documento: userData.numero_documento,
        nombre_completo: userData.nombre_completo,
        apellido_completo: userData.apellido_completo,
        email: userData.email.trim().toLowerCase(),
        telefono: userData.telefono,
        password: userData.password,
        confirmPassword: userData.confirmPassword
      };

      const response = await apiClient.post('/auth/register', payload);
      console.log('[AUTH] Register success');
      return response;
    } catch (error) {
      console.error('[AUTH] Register error:', error.message);
      throw error;
    }
  }

  /**
   * Refresh access session from refresh cookie
   * @returns {Promise<Object>}
   */
  async refreshToken() {
    try {
      console.log('[AUTH] Refreshing session token...');
      const response = await apiClient.post('/auth/refresh', {});
      console.log('[AUTH] Session refreshed');
      return response;
    } catch (error) {
      console.error('[AUTH] Refresh error:', error.message);
      throw error;
    }
  }

  /**
   * Get authenticated profile
   * @returns {Promise<Object>}
   */
  async getProfile() {
    try {
      console.log('[AUTH] Loading user profile...');
      const response = await apiClient.get('/auth/me');
      console.log('[AUTH] Profile loaded');
      return response;
    } catch (error) {
      console.error('[AUTH] Profile error:', error.message);
      throw error;
    }
  }

  /**
   * Update profile
   * @param {Object} profileData
   * @returns {Promise<Object>}
   */
  async updateProfile(profileData) {
    try {
      console.log('[AUTH] Updating profile...');

      const payload = {};

      if (profileData.nombre) {
        const nombreParts = profileData.nombre.trim().split(' ');
        payload.primer_nombre = nombreParts[0] || '';
        payload.segundo_nombre = nombreParts.slice(1, -1).join(' ') || null;
      }

      if (profileData.apellidos) {
        const apellidoParts = profileData.apellidos.trim().split(' ');
        payload.primer_apellido = apellidoParts[0] || '';
        payload.segundo_apellido = apellidoParts.slice(1).join(' ') || null;
      }

      if (profileData.telefono) {
        payload.telefono = profileData.telefono.replace(/\D/g, '');
      }

      const response = await apiClient.patch('/auth/me', payload);
      console.log('[AUTH] Profile updated');
      return response;
    } catch (error) {
      console.error('[AUTH] Update profile error:', error.message);
      throw error;
    }
  }

  /**
   * Change password
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async changePassword(currentPassword, newPassword) {
    try {
      console.log('[AUTH] Changing password...');

      const response = await apiClient.patch('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmNewPassword: newPassword
      });

      console.log('[AUTH] Password changed');
      return response;
    } catch (error) {
      console.error('[AUTH] Change password error:', error.message);
      throw error;
    }
  }

  /**
   * Logout current user
   * @returns {Promise<Object>}
   */
  async logout() {
    try {
      console.log('[AUTH] Logging out...');
      const response = await apiClient.post('/auth/logout');
      console.log('[AUTH] Logout success');
      return response;
    } catch (error) {
      console.error('[AUTH] Logout error:', error.message);
      throw error;
    }
  }

  /**
   * Forgot password request
   * @param {string} email
   * @returns {Promise<Object>}
   */
  async forgotPassword(email) {
    try {
      console.log('[AUTH] Sending forgot-password request for:', email);

      const response = await apiClient.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase()
        }),
        skipAuth: true
      });

      console.log('[AUTH] Forgot-password request sent');
      return response;
    } catch (error) {
      console.error('[AUTH] Forgot-password error:', error.message);
      throw error;
    }
  }

  /**
   * Reset password with reset token
   * @param {string} token
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async resetPassword(token, newPassword) {
    try {
      console.log('[AUTH] Resetting password...');

      const response = await apiClient.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password: newPassword,
          confirmPassword: newPassword
        }),
        skipAuth: true
      });

      console.log('[AUTH] Password reset success');
      return response;
    } catch (error) {
      console.error('[AUTH] Reset password error:', error.message);
      throw error;
    }
  }

  /**
   * Verify email token from invitation link
   * @param {string} token
   * @returns {Promise<Object>}
   */
  async verifyEmailToken(token) {
    try {
      const normalizedToken = (token || '').trim();
      console.log('[AUTH] Verifying email token...');
      return await apiClient.get('/auth/verify-email', {
        params: { token: normalizedToken },
        skipAuth: true,
      });
    } catch (error) {
      console.error('[AUTH] Verify email token error:', error.message);
      throw error;
    }
  }

  /**
   * Verify signup email code
   * @param {string} email
   * @param {string} codigo
   * @returns {Promise<Object>}
   */
  async verifyEmailCode(email, codigo) {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedCode = String(codigo || '').trim();
      return await apiClient.post('/auth/verify-code', {
        email: normalizedEmail,
        codigo: normalizedCode,
      });
    } catch (error) {
      console.error('[AUTH] Verify email code error:', error.message);
      throw error;
    }
  }

  /**
   * Resend signup verification code
   * @param {string} email
   * @returns {Promise<Object>}
   */
  async resendVerificationCode(email) {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      return await apiClient.post('/auth/resend-code', {
        email: normalizedEmail,
      });
    } catch (error) {
      console.error('[AUTH] Resend verification code error:', error.message);
      throw error;
    }
  }
  /**
   * Check email availability
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async checkEmailAvailability(email) {
    try {
      console.log('[AUTH] Checking email availability:', email);

      const response = await apiClient.post('/auth/check-email', {
        email: email.trim().toLowerCase()
      });

      return response.data?.available || false;
    } catch (error) {
      console.error('[AUTH] Check email error:', error.message);
      return false;
    }
  }
}

export default new AuthService();
