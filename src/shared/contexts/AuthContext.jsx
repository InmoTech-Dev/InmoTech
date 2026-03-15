/**
 * React context for global authentication state
 * Optimized for real-time role and permission updates
 */

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import authService from '../services/authService';
import { apiClient } from '../services/api.config';
import sseService from '../services/sseService';
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

const parseUserJson = (rawValue) => {
  if (!rawValue || typeof rawValue !== 'string') return null;
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
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
    sseService.disconnect();
  }, []);

  const saveUserToStorage = useCallback((userData, rememberMe = true) => {
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
      
      // Conectar SSE después de tener el usuario
      sseService.connect();
    } catch (err) {
      console.error('Error loading auth session:', err);
      clearAuthData();
    } finally {
      setInitializing(false);
    }
  }, [clearAuthData, saveUserToStorage]);

  const login = async (email, password, rememberMe = true) => {
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
      
      // Conectar SSE después del login
      sseService.connect();
      
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

  const reloadProfile = useCallback(async () => {
    try {
      const profileResp = await authService.getProfile();
      const refreshedUser = profileResp?.data?.user || profileResp?.data || profileResp?.user;

      if (refreshedUser) {
        const rememberMe = Boolean(localStorage.getItem(USER_KEY));
        console.log('🔄 Perfil recargado en tiempo real:', refreshedUser.roles);
        saveUserToStorage(refreshedUser, rememberMe);
        setUser(refreshedUser);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error reloading profile:', err);
      return false;
    }
  }, [saveUserToStorage]);

  const refreshToken = async () => {
    try {
      const response = await authService.refreshToken();
      if (!response?.success) {
        throw new Error('Error al refrescar sesion');
      }

      await reloadProfile();
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
    
    // Soporte para roles como string o como objeto {nombre_rol: '...'}
    const userRoleNames = (user.roles || []).map(rol => 
      typeof rol === 'object' ? rol.nombre_rol : rol
    );

    if (Array.isArray(roles)) {
      return roles.some((role) => userRoleNames.includes(role));
    }
    return userRoleNames.includes(roles);
  }, [user]);

  const hasAccess = useCallback((allowedRoles) => {
    return isAuthenticated && hasRole(allowedRoles);
  }, [isAuthenticated, hasRole]);

  const permissionsByModule = useMemo(() => extractPermissionsByModule(user), [user]);

  const getAvailableModules = useCallback(() => {
    if (!user) return ['dashboard'];
    
    const modules = new Set();
    const userRoleNames = (user.roles || []).map(rol => 
      typeof rol === 'object' ? rol.nombre_rol : rol
    );

    const isSuperAdmin = userRoleNames.includes('Super Administrador');
    const isAdmin = userRoleNames.includes('Administrador');

    if (isSuperAdmin || isAdmin) {
      ALL_MODULES.forEach((mod) => modules.add(mod));
      return Array.from(modules);
    }

    Object.entries(permissionsByModule).forEach(([mod, perms]) => {
      if (perms?.ver === true) {
        modules.add(mod);
      }
    });

    // Siempre dashboard
    modules.add('dashboard');

    return Array.from(modules);
  }, [user, permissionsByModule]);

  const hasPermission = useCallback((moduleName, action = 'ver') => {
    const mod = normalizeModuleKey(moduleName) || normalizeKey(moduleName);
    const permKey = normalizePermissionKey(action) || normalizeKey(action) || 'ver';
    if (!mod) return false;

    const userRoleNames = (user.roles || []).map(rol => 
      typeof rol === 'object' ? rol.nombre_rol : rol
    );

    if (userRoleNames.includes('Super Administrador') || userRoleNames.includes('Administrador')) {
      return true;
    }

    const modulePerms = permissionsByModule[mod] || {};
    if (!action) {
      return getAvailableModules().includes(mod) || Object.keys(modulePerms).length > 0;
    }

    if (modulePerms[permKey]) return true;

    return false;
  }, [user, permissionsByModule, getAvailableModules]);

  // SSE Event Listeners for Real-time updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handleUserChanged = (data) => {
      // Si el cambio afecta a este usuario específicamente
      if (data.user_id === user.id_persona || (data.affected_user_ids && data.affected_user_ids.includes(user.id_persona))) {
        console.log('📢 SSE: Cambio detectado en el usuario actual, recargando perfil...');
        reloadProfile();
      }
    };

    const handleRoleChanged = (data) => {
      // Los cambios en roles afectan globalmente a los permisos, recargar para asegurar sincronía
      console.log('📢 SSE: Cambio detectado en definiciones de roles, recargando perfil...');
      reloadProfile();
    };

    const handleForcedLogout = (data) => {
      console.warn('🚨 SSE: Sesión revocada forzosamente por el sistema:', data.reason);
      // Limpiar datos y redirigir (clearAuthData ya hace sseService.disconnect)
      clearAuthData();
      
      // Mostrar alerta al usuario
      import('../../shared/hooks/use-toast').then(({ toast }) => {
        toast({
          title: "Sesión Finalizada",
          description: data.message || "Tu sesión ha sido cerrada por un administrador o por cambios en tus permisos.",
          variant: "destructive"
        });
      });
    };

    const unsubUser = sseService.on('user.changed', handleUserChanged);
    const unsubRole = sseService.on('role.changed', handleRoleChanged);
    const unsubLogout = sseService.on('session.force_logout', handleForcedLogout);
    const unsubDisabled = sseService.on('user_disabled', handleForcedLogout);

    return () => {
      unsubUser();
      unsubRole();
      unsubLogout();
      unsubDisabled();
    };
  }, [isAuthenticated, user, reloadProfile, clearAuthData]);

  useEffect(() => {
    loadAuthFromStorage();

    apiClient.registerUnauthorizedCallback(() => {
      console.log('Sesion expirada (401), limpiando autenticacion local...');
      clearAuthData();
    });
  }, [loadAuthFromStorage, clearAuthData]);

  const value = {
    user,
    isAuthenticated,
    initializing,
    loading,
    error,
    login,
    logout,
    refreshToken,
    reloadProfile,
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
