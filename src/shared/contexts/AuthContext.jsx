/**
 * Context de React para gestion global de autenticacion JWT
 */

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import authService from '../services/authService';
import { apiClient } from '../services/api.config';
import { canonicalizePermissions, normalizeModuleKey, normalizePermissionKey } from '../utils/permissions';

const AuthContext = createContext(undefined);

const USER_KEY = 'inmotech_user';
const ALL_MODULES = [
  'dashboard',
  'citas',
  'inmuebles',
  'ventas',
  'arriendos',
  'reportes',
  'usuarios',
  'administrativos',
  'roles'
];

const normalizeKey = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const extractPermissionsByModule = (user) => {
  if (!user) return {};

  const rawPermissions = user.permisos || user.permisosPorModulo || {};
  if (Array.isArray(rawPermissions)) {
    return canonicalizePermissions(rawPermissions);
  }

  if (rawPermissions && typeof rawPermissions === 'object') {
    return canonicalizePermissions(rawPermissions);
  }

  return {};
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAuthFromStorage = useCallback(async () => {
    try {
      const accessToken = apiClient.getAccessToken();
      const refreshToken = apiClient.getRefreshToken();

      // Sin tokens, no hay sesión
      if (!accessToken) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      let userData = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);

      let parsedUser = null;
      if (userData) {
        try {
          parsedUser = JSON.parse(userData);
        } catch {
          // Si el JSON estaba corrupto, solo limpiamos el usuario persistido
          localStorage.removeItem(USER_KEY);
          sessionStorage.removeItem(USER_KEY);
        }
      }

      if (parsedUser) {
        const hasPermissionsPayload =
          parsedUser?.permisos && typeof parsedUser.permisos === 'object' && Object.keys(parsedUser.permisos).length > 0;

        if (hasPermissionsPayload || !refreshToken) {
          setUser(parsedUser);
          setIsAuthenticated(true);
          return;
        }
      }

      // Hay tokens pero no usuario guardado: intentar reconstruir con /auth/me
      if (refreshToken) {
        try {
          const profileResp = await authService.getProfile();
          const profileUser = profileResp?.data || profileResp?.user || profileResp?.data?.user;
          if (profileUser) {
            localStorage.setItem(USER_KEY, JSON.stringify(profileUser));
            setUser(profileUser);
            setIsAuthenticated(true);
            return;
          }
        } catch (err) {
          console.warn('No se pudo reconstruir el usuario con /auth/me:', err?.message || err);
        }
      }

      // Como último recurso, mantener tokens pero marcar no autenticado si no hay usuario
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Error cargando autenticacion:', err);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAuthToStorage = useCallback((userData, accessToken, refreshToken, rememberMe = false) => {
    try {
      apiClient.setTokens(accessToken, refreshToken);
      const userDataString = JSON.stringify(userData);
      if (rememberMe) {
        localStorage.setItem(USER_KEY, userDataString);
      } else {
        sessionStorage.setItem(USER_KEY, userDataString);
      }
    } catch (err) {
      console.error('Error guardando autenticacion:', err);
    }
  }, []);

  const clearAuthData = useCallback(() => {
    apiClient.clearTokens();
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const login = async (email, password, rememberMe = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(email, password);

      if (response.success && response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;

        const savedAccessToken = apiClient.getAccessToken();
        const savedRefreshToken = apiClient.getRefreshToken();

        if (!savedAccessToken || !savedRefreshToken) {
          apiClient.setTokens(accessToken, refreshToken);
        }

        const userDataString = JSON.stringify(userData);
        if (rememberMe) {
          localStorage.setItem(USER_KEY, userDataString);
        } else {
          sessionStorage.setItem(USER_KEY, userDataString);
        }

        setUser(userData);
        setIsAuthenticated(true);
        return userData;
      } else {
        throw new Error(response.message || 'Error en la autenticacion');
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesion');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.register(userData);

      if (response.success && response.data) {
        const { user: newUser, accessToken, refreshToken } = response.data;
        saveAuthToStorage(newUser, accessToken, refreshToken, true);
        setUser(newUser);
        setIsAuthenticated(true);
        return newUser;
      } else {
        throw new Error(response.message || 'Error en el registro');
      }
    } catch (err) {
      setError(err.message || 'Error al registrar usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      try {
        await authService.logout();
      } catch {
        // ignore backend logout errors
      }
      clearAuthData();
    } catch (err) {
      clearAuthData();
    } finally {
      setLoading(false);
    }
  }, [clearAuthData]);

  const refreshToken = async () => {
    try {
      const storedRefreshToken = apiClient.getRefreshToken();
      const response = await authService.refreshToken(storedRefreshToken);

      if (response.success && response.data) {
        const { accessToken, refreshToken: newRefreshToken, user: refreshedUser } = response.data;
        apiClient.setTokens(accessToken, newRefreshToken);

        if (refreshedUser) {
          setUser(refreshedUser);
          const userDataString = JSON.stringify(refreshedUser);
          if (localStorage.getItem(USER_KEY)) {
            localStorage.setItem(USER_KEY, userDataString);
          } else {
            sessionStorage.setItem(USER_KEY, userDataString);
          }
        }

        return true;
      }
      throw new Error('Error al refrescar token');
    } catch (err) {
      clearAuthData();
      return false;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.updateProfile(profileData);

      if (response.success && response.data) {
        const updatedUser = { ...user, ...response.data };
        setUser(updatedUser);

        const userData = JSON.stringify(updatedUser);
        if (localStorage.getItem(USER_KEY)) {
          localStorage.setItem(USER_KEY, userData);
        } else {
          sessionStorage.setItem(USER_KEY, userData);
        }

        return updatedUser;
      } else {
        throw new Error(response.message || 'Error al actualizar perfil');
      }
    } catch (err) {
      setError(err.message || 'Error al actualizar perfil');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.changePassword(currentPassword, newPassword);
      if (response.success) return true;
      throw new Error(response.message || 'Error al cambiar contrasena');
    } catch (err) {
      setError(err.message || 'Error al cambiar contrasena');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      const response = await authService.forgotPassword(email);
      if (!response.success) {
        throw new Error(response.message || 'No se pudo enviar el correo de recuperacion');
      }
      return response;
    } catch (err) {
      const message = err.status === 404
        ? 'No encontramos una cuenta con ese correo.'
        : err.message || 'Error solicitando recuperacion';
      setError(message);
      const custom = new Error(message);
      custom.status = err.status;
      throw custom;
    }
  };

  const resetPasswordWithToken = async (token, newPassword) => {
    try {
      setError(null);
      const response = await authService.resetPassword(token, newPassword);
      if (!response.success) {
        throw new Error(response.message || 'No se pudo restablecer la contrasena');
      }
      return response;
    } catch (err) {
      setError(err.message || 'Error restableciendo contrasena');
      throw err;
    }
  };

  const hasRole = useCallback((roles) => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles;
    if (Array.isArray(roles)) {
      return roles.some(role => userRoles.includes(role));
    }
    return userRoles.includes(roles);
  }, [user]);

  const hasAccess = useCallback((allowedRoles) => {
    return isAuthenticated && hasRole(allowedRoles);
  }, [isAuthenticated, hasRole]);

  const permissionsByModule = useMemo(() => extractPermissionsByModule(user), [user]);

  const getAvailableModules = useCallback(() => {
    const modules = new Set();
    const roles = user?.roles || [];
    const isSuperAdmin = roles.includes('Super Administrador');
    const isAdmin = roles.includes('Administrador');

    if (isSuperAdmin || isAdmin) {
      ALL_MODULES.forEach((mod) => modules.add(mod));
      return Array.from(modules);
    }

    Object.entries(permissionsByModule).forEach(([mod, perms]) => {
      if (perms?.ver === true) {
        modules.add(mod);
      }
    });

    return Array.from(modules);
  }, [user, permissionsByModule]);

  const hasPermission = useCallback((moduleName, action = 'ver') => {
    const mod = normalizeModuleKey(moduleName) || normalizeKey(moduleName);
    const permKey = normalizePermissionKey(action) || normalizeKey(action) || 'ver';
    if (!mod) return false;

    const roles = user?.roles || [];
    if (roles.includes('Super Administrador') || roles.includes('Administrador')) {
      return true;
    }

    const modulePerms = permissionsByModule[mod] || {};
    if (!action) {
      return getAvailableModules().includes(mod) || Object.keys(modulePerms).length > 0;
    }

    if (modulePerms[permKey]) return true;

    return false;
  }, [user, permissionsByModule, getAvailableModules]);

  useEffect(() => {
    loadAuthFromStorage();
    // Cierre local de sesion solo cuando el refresh ya fallo.
    apiClient.registerUnauthorizedCallback(() => {
      console.log('⚠️ Sesion expirada (401), limpiando autenticacion local...');
      clearAuthData();
    });
  }, [loadAuthFromStorage, clearAuthData]);

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword: resetPasswordWithToken,
    hasRole,
    hasAccess,
    hasPermission,
    getAvailableModules,
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
