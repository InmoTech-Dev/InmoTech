/**
 * @fileoverview Componente de ruta protegida con verificación de autenticación y roles
 * @module shared/components/ProtectedRoute
 * @description Componente que protege rutas basadas en autenticación y permisos de usuario
 * @author InmoTech Development Team
 * @version 1.0.0
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const isOwnerUser = (user) => {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return roles.some((role) => {
    if (typeof role === 'string') return role.trim().toLowerCase() === 'propietario';
    const roleName = role?.nombre_rol || role?.nombre || role?.name;
    return typeof roleName === 'string' && roleName.trim().toLowerCase() === 'propietario';
  });
};

/**
 * Componente que protege rutas basadas en autenticación y roles
 * @param {Object} props - Propiedades del componente
 * @param {React.Component} props.children - Componente hijo a renderizar
 * @param {string|string[]} props.allowedRoles - Roles permitidos para acceder a la ruta
 * @param {boolean} props.requireAuth - Si requiere autenticación (default: true)
 * @param {string} props.redirectTo - Ruta a redirigir si no tiene acceso (default: '/login')
 * @param {React.Component} props.fallback - Componente a mostrar mientras carga
 * @returns {React.Component} Componente protegido o redirección
 */
const ProtectedRoute = ({
  children,
  allowedRoles,
  requireAuth = true,
  redirectTo = '/login',
  fallback: FallbackComponent
}) => {
  const { isAuthenticated, initializing, hasAccess, user } = useAuth();
  const location = useLocation();

  // Mostrar componente de carga mientras verifica autenticación
  if (initializing) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si requiere autenticación y no está autenticado
  if (requireAuth && !isAuthenticated) {
    console.log('🔒 Acceso denegado: Usuario no autenticado, redirigiendo a login');
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Si no requiere autenticación pero está autenticado (ej: páginas de login/register)
  if (!requireAuth && isAuthenticated) {
    const hasAdministrativeAccess = user?.es_administrativo === true;
    const redirectToAuthenticated = hasAdministrativeAccess
      ? '/dashboard'
      : isOwnerUser(user)
        ? '/dashboard/propietario/inmuebles'
        : '/';
    console.log('✅ Usuario ya autenticado, redirigiendo según su tipo de acceso');
    return <Navigate to={redirectToAuthenticated} replace />;
  }

  // Si requiere roles específicos y no tiene acceso
  if (allowedRoles && !hasAccess(allowedRoles)) {
    console.log('🚫 Acceso denegado: Usuario no tiene los roles requeridos', {
      allowedRoles,
      userRoles: isAuthenticated ? user?.roles : []
    });
    // Redirigir a página de acceso denegado o dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Acceso permitido
  console.log('✅ Acceso permitido a la ruta protegida');
  return children;
};

/**
 * Componente específico para rutas que requieren Super Admin
 */
export const SuperAdminRoute = ({ children, ...props }) => (
  <ProtectedRoute allowedRoles="Super Administrador" {...props}>
    {children}
  </ProtectedRoute>
);

/**
 * Componente específico para rutas que requieren Admin o superior
 */
export const AdminRoute = ({ children, ...props }) => (
  <ProtectedRoute allowedRoles={["Super Administrador", "Administrador"]} {...props}>
    {children}
  </ProtectedRoute>
);

/**
 * Componente específico para rutas que requieren Empleado o superior
 */
export const EmployeeRoute = ({ children, ...props }) => (
  <ProtectedRoute allowedRoles={["Super Administrador", "Administrador", "Empleado"]} {...props}>
    {children}
  </ProtectedRoute>
);

/**
 * Componente específico para rutas del dashboard - permite cualquier rol administrativo
 */
export const DashboardRoute = ({ children, ...props }) => {
  const { isAuthenticated, initializing, user } = useAuth();

  // Mostrar componente de carga mientras verifica autenticación
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    console.log('🔒 Acceso denegado: Usuario no autenticado, redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  // Verificar si el usuario tiene acceso administrativo o es propietario
  const hasAdministrativeAccess = user?.es_administrativo === true;
  const hasOwnerAccess = isOwnerUser(user);

  if (!hasAdministrativeAccess && !hasOwnerAccess) {
    console.log('🚫 Acceso denegado al dashboard: Usuario no tiene permisos administrativos', {
      es_administrativo: user?.es_administrativo,
      roles: user?.roles,
      hasAdministrativeAccess,
      hasOwnerAccess
    });
    // Redirigir a página de acceso denegado o home
    return <Navigate to="/" replace />;
  }

  // Acceso permitido
  console.log('✅ Acceso permitido al dashboard');
  return children;
};

/**
 * Componente específico para validar permiso por módulo/acción
 */
export const ModulePermissionRoute = ({
  children,
  moduleName,
  action = 'ver',
  redirectTo = '/dashboard'
}) => {
  const { isAuthenticated, initializing, hasPermission } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasPermission(moduleName, action)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

/**
 * Componente específico para rutas que requieren solo autenticación (usuarios normales)
 */
export const AuthenticatedRoute = ({ children, ...props }) => (
  <ProtectedRoute requireAuth={true} {...props}>
    {children}
  </ProtectedRoute>
);

/**
 * Componente específico para rutas públicas (login, register, etc.)
 */
export const PublicRoute = ({ children, ...props }) => (
  <ProtectedRoute requireAuth={false} {...props}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;


