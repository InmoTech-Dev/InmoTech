import React from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, LayoutDashboard } from 'lucide-react';
import { routes } from '@/routes';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Mobile menu component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the menu is open
 * @param {Function} props.onClose - Callback to close the menu
 */
const MobileMenu = ({ isOpen, onClose }) => {
  const { isAuthenticated, user, logout, getAvailableModules } = useAuth();

  const navItems = [
    { to: routes.landing || '/', label: 'Inicio' },
    { to: routes.about, label: 'Nosotros' },
    { to: routes.properties, label: 'Inmuebles' },
    { to: routes.services, label: 'Servicios' },
    { to: routes.contact, label: 'contáctanos' }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      // Mostrar toast de cierre de sesión exitoso
      if (typeof window !== 'undefined' && window.toast) {
        setTimeout(() => {
          window.toast({
            title: "Cierre de sesión exitoso",
            description: "Hasta luego. ¡Gracias por usar nuestro sistema!",
            variant: "default"
          });
        }, 100);
      }
      onClose();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Check if user has dashboard access
  const hasDashboardAccess = () => {
    if (!user) return false;

    const availableModules = getAvailableModules();
    const hasAdministrativeAccess =
      user?.es_administrativo === true ||
      user?.roles?.some(role =>
        typeof role === 'object' ? role.nombre_rol?.includes('Administrador') : role?.includes('Administrador')
      ) ||
      user?.roles?.some(role =>
        typeof role === 'object' ? role.nombre_rol?.includes('Super Administrador') : role?.includes('Super Administrador')
      ) ||
      availableModules.includes('administrativos');

    return hasAdministrativeAccess;
  };

  return (
    <div className="bg-[#00457B] border-t border-white/20 mt-4">
      <div className="px-4 py-4 space-y-4">
        {/* Mobile Navigation Links */}
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block text-white hover:text-blue-200 transition-colors font-medium py-2"
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile Action Buttons */}
        <div className="pt-6 border-t border-white/20 mt-2">
          {isAuthenticated && user ? (
            <>
              {/* User Profile Section */}
              <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                    {(user.nombre_completo || user.email || user.correo || 'U')
                      .split(' ')
                      .filter(Boolean)
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{user.nombre_completo || user.email || user.correo || 'Usuario'}</p>
                    <p className="text-white/70 text-xs truncate">{user.email || user.correo || ''}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Dashboard Button - only show if user has access */}
                {hasDashboardAccess() && (
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-3 w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                    onClick={onClose}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                )}

                {/* Logout Button - Always visible for authenticated users */}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-3 bg-red-500/20 border border-red-400/30 text-red-200 rounded-lg hover:bg-red-500/30 hover:border-red-400/50 transition-all duration-300 backdrop-blur-sm"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Cerrar sesión</span>
                </button>
              </div>
            </>
          ) : (
            /* Authentication Buttons for non-authenticated users */
            <div className="space-y-2">
              <Link
                to="/login"
                className="flex items-center justify-center space-x-2 w-full px-4 py-3 border border-white text-white bg-transparent rounded-lg hover:bg-white hover:text-[#00457B] transition-all duration-300"
                onClick={onClose}
              >
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Iniciar sesión</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
