import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, LayoutDashboard, ChevronDown, Calendar, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

/**
 * Action buttons component (Login/Register or User Profile)
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onButtonClick - Callback when a button is clicked
 */
const ActionButtons = ({ className = '', onButtonClick }) => {
  const { isAuthenticated, user, logout, getAvailableModules } = useAuth();
  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false);
      // Mostrar toast de cierre de sesión exitoso
      toast({
        title: "Cierre de sesión exitoso",
        description: "Hasta luego. ¡Gracias por usar nuestro sistema!",
        variant: "default"
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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
      user?.roles?.some(role =>
        typeof role === 'object' ? role.nombre_rol?.includes('Empleado') : role?.includes('Empleado')
      ) ||
      availableModules.includes('administrativos');

    return hasAdministrativeAccess;
  };

  const isOwnerUser = () => {
    if (!user) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return roles.some((role) => {
      const roleName = typeof role === 'object' ? role.nombre_rol : role;
      return String(roleName || '').toLowerCase().includes('propietario');
    });
  };

  if (isAuthenticated && user) {
    const displayName = user.nombre_completo || user.email || 'Usuario';
    const displayInfo = user.nombre_completo ? `${displayName} (${user.email || user.correo || ''})` : (user.email || user.correo || '');
    const shouldShowDashboard = hasDashboardAccess();
    const showOwnerProperties = isOwnerUser();
    const userInitials = displayName
      ? displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : '';
    const avatarUrl = user?.foto_perfil_url || user?.foto || user?.avatarUrl || null;

    return (
      <div className={`hidden md:flex items-center ${className}`}>
        <div className="relative" ref={dropdownRef}>
          {/* User Profile Button - modern design */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-full hover:bg-white/20 transition-all duration-300 shadow-lg"
          >
            {/* User Avatar Circle */}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                userInitials || <User className="h-4 w-4" />
              )}
            </div>

            {/* User Name and Chevron */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium truncate max-w-[140px]">
                {displayName}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Dropdown Menu */}
          <div className={`absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 transition-all duration-300 ease-in-out transform ${
            isDropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
          }`}>
              {/* Triangle Indicator */}
              <div className={`absolute -top-2 right-6 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white transition-all duration-300 ${
                isDropdownOpen ? 'opacity-100' : 'opacity-0'
              }`} style={{ transform: isDropdownOpen ? 'translateY(0)' : 'translateY(-4px)' }}></div>
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      userInitials || <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Options */}
              <div className="py-2">
                {/* Dashboard Option */}
                {shouldShowDashboard && (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors duration-200"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Ir al Dashboard</span>
                  </Link>
                )}

                {/* Mis Citas Option */}
                {!shouldShowDashboard && (
                  <>
                    <Link
                      to="/mis-citas"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors duration-200"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Mis Citas</span>
                    </Link>

                    {showOwnerProperties && (
                      <Link
                        to="/mis-inmuebles"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors duration-200"
                      >
                        <Building2 className="h-4 w-4" />
                        <span>Mis Inmuebles</span>
                      </Link>
                    )}
                  </>
                )}

                {/* Logout Option */}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
        </div>
      </div>
    );
  }

  const buttons = [
    {
      to: '/login',
      icon: User,
      label: 'Iniciar sesión',
      primary: true
    }
  ];

  return (
    <div className={`hidden md:flex flex-nowrap items-center gap-2 lg:gap-3 ${className}`}>
      {buttons.map((button) => {
        const Icon = button.icon;
        return (
          <Link
            key={button.to}
            to={button.to}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 border border-white text-white bg-transparent rounded-full hover:bg-white hover:text-[#00457B] transition-all duration-300 whitespace-nowrap min-w-[120px] justify-center"
            onClick={onButtonClick}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">{button.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default ActionButtons;
