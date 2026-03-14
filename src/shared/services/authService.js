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
  async getProfile(params = {}) {
    try {
      console.log('[AUTH] Loading user profile...');
      const response = await apiClient.get('/auth/me', { params });
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

      const payload = {
        ...(profileData.nombre_completo
          ? { nombre_completo: profileData.nombre_completo.trim() }
          : {}),
        ...(profileData.apellido_completo
          ? { apellido_completo: profileData.apellido_completo.trim() }
          : {}),
        ...(profileData.telefono
          ? { telefono: String(profileData.telefono).replace(/\D/g, '') }
          : {}),
        ...(profileData.foto_perfil_url ? { foto_perfil_url: profileData.foto_perfil_url } : {}),
        ...(profileData.foto_public_id ? { foto_public_id: profileData.foto_public_id } : {})
      };

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
   * Validate reset password token
   * @param {string} token
   * @returns {Promise<Object>}
   */
  async validateResetToken(token) {
    try {
      console.log('[AUTH] Validating reset token...');

      const response = await apiClient.request('/auth/reset-password', {
        method: 'GET',
        params: { token },
        skipAuth: true
      });

      console.log('[AUTH] Reset token is valid');
      return response;
    } catch (error) {
      console.error('[AUTH] Validate reset token error:', error.message);
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
