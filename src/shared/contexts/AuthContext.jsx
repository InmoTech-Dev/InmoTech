/**
 * React context for global authentication state
 */

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import authService from '../services/authService';
import { apiClient } from '../services/api.config';
import realtimeBus from '../services/realtimeBus';
import { canonicalizePermissions, normalizeModuleKey, normalizePermissionKey } from '../utils/permissions';

const AuthContext = createContext(undefined);

const USER_KEY = 'inmotech_user';
const PUBLIC_BOOTSTRAP_DISABLED_PATHS = new Set(['/reset-password']);
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

const parseUserJson = (rawValue) => {
  if (!rawValue || typeof rawValue !== 'string') return null;
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
};

const shouldSkipAuthBootstrap = () => {
  if (typeof window === 'undefined') return false;
  const currentPath = window.location?.pathname || '';
  return PUBLIC_BOOTSTRAP_DISABLED_PATHS.has(currentPath);
};

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
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  const clearAuthData = useCallback(() => {
    apiClient.clearTokens();
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const saveUserToStorage = useCallback((userData, rememberMe = false) => {
    try {
      const userDataString = JSON.stringify(userData);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);

      if (rememberMe) {
        localStorage.setItem(USER_KEY, userDataString);
      } else {
        sessionStorage.setItem(USER_KEY, userDataString);
      }
    } catch (err) {
      console.error('Error saving auth user:', err);
    }
  }, []);

  const loadAuthFromStorage = useCallback(async () => {
    if (shouldSkipAuthBootstrap()) {
      setInitializing(false);
      return;
    }

    try {
      const localStored = localStorage.getItem(USER_KEY);
      const sessionStored = sessionStorage.getItem(USER_KEY);
      const rememberMe = Boolean(localStored);
      const storedUser = parseUserJson(localStored || sessionStored);

      if (!storedUser && sessionStored && !parseUserJson(sessionStored)) {
        sessionStorage.removeItem(USER_KEY);
      }
      if (!storedUser && localStored && !parseUserJson(localStored)) {
        localStorage.removeItem(USER_KEY);
      }

      const profileResp = await authService.getProfile();
      const profileUser = profileResp?.data?.user || profileResp?.data || profileResp?.user;

      if (!profileUser) {
        clearAuthData();
        return;
      }

      saveUserToStorage(profileUser, rememberMe);
      setUser(profileUser);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Error loading auth session:', err);
      clearAuthData();
    } finally {
      setInitializing(false);
    }
  }, [clearAuthData, saveUserToStorage]);

  const login = async (email, password, rememberMe = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(email, password);
      if (!response?.success) {
        throw new Error(response?.message || 'Error en la autenticacion');
      }

      let userData = response?.data?.user || null;
      if (!userData) {
        const profileResp = await authService.getProfile();
        userData = profileResp?.data?.user || profileResp?.data || profileResp?.user || null;
      }

      if (!userData) {
        throw new Error('No se pudo obtener el perfil despues del login');
      }

      saveUserToStorage(userData, rememberMe);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      setError(err.message || 'Error al iniciar sesion');
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
        // Keep local cleanup even if backend logout fails
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
      const response = await authService.refreshToken();
      if (!response?.success) {
        throw new Error('Error al refrescar sesion');
      }

      const profileResp = await authService.getProfile();
      const refreshedUser = profileResp?.data?.user || profileResp?.data || profileResp?.user;

      if (refreshedUser) {
        const rememberMe = Boolean(localStorage.getItem(USER_KEY));
        saveUserToStorage(refreshedUser, rememberMe);
        setUser(refreshedUser);
      }

      setIsAuthenticated(true);
      return true;
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
        const rememberMe = Boolean(localStorage.getItem(USER_KEY));
        saveUserToStorage(updatedUser, rememberMe);
        return updatedUser;
      }

      throw new Error(response.message || 'Error al actualizar perfil');
    } catch (err) {
      setError(err.message || 'Error al actualizar perfil');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return null;
    try {
      setLoading(true);
      console.log('[AUTH] Auto-refreshing user profile from API (real-time/demand)...');

      // Añadimos un timestamp para evitar cache literal del navegador y asegurar datos frescos
      const profileResp = await authService.getProfile({ _ts: Date.now() });
      const profileUser = profileResp?.data?.user || profileResp?.data || profileResp?.user;

      if (profileUser) {
        const localStored = localStorage.getItem(USER_KEY);
        const rememberMe = Boolean(localStored);
        saveUserToStorage(profileUser, rememberMe);
        setUser(profileUser);
        console.log('[AUTH] User profile and permissions refreshed successfully');
        return profileUser;
      }
    } catch (err) {
      console.error('[AUTH] Error refreshing user profile:', err);
    } finally {
      setLoading(false);
    }
    return null;
  }, [isAuthenticated, saveUserToStorage]);

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

  const requestPasswordReset = useCallback(async (email) => {
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
  }, []);

  const resetPasswordWithToken = useCallback(async (token, newPassword) => {
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
  }, []);

  const validateResetToken = useCallback(async (token) => {
    try {
      setError(null);
      return await authService.validateResetToken(token);
    } catch (err) {
      setError(err.message || 'Error validando enlace de recuperacion');
      throw err;
    }
  }, []);

  const hasRole = useCallback((roles) => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles;
    if (Array.isArray(roles)) {
      return roles.some((role) => userRoles.includes(role));
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

    apiClient.registerUnauthorizedCallback(() => {
      console.log('Sesion expirada (401), limpiando autenticacion local...');
      clearAuthData();
    });

    // Escuchar cambios globales de usuario o roles para refrescar el perfil actual
    const offUserChanged = realtimeBus.on('user.changed', (payload) => {
      // Si el cambio afecta al usuario actual o es un cambio general de sistema
      if (!payload?.id_persona || payload.id_persona === user?.id_persona) {
        refreshUser();
      }
    });

    const offRoleChanged = realtimeBus.on('role.changed', () => {
      // Los cambios en roles pueden afectar a cualquier usuario, refrescamos siempre
      refreshUser();
    });

    return () => {
      offUserChanged();
      offRoleChanged();
    };
  }, [loadAuthFromStorage, clearAuthData, refreshUser, user?.id_persona]);

  const value = {
    user,
    isAuthenticated,
    initializing,
    loading,
    error,
    login,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    requestPasswordReset,
    forgotPassword: requestPasswordReset,
    resetPassword: resetPasswordWithToken,
    validateResetToken,
    hasRole,
    hasAccess,
    hasPermission,
    getAvailableModules,
    refreshUser,
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
