// Importa rutas centralizadas y datos de navegación
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationItems } from '../utils/navigationData';
import { dashboardRoutes } from '../../routes/index';

export const useSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [activeSubItem, setActiveSubItem] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const toggleExpandedItem = useCallback((itemId) => {
    setExpandedItem(prev => prev === itemId ? null : itemId);
  }, []);

  const handleItemClick = useCallback((item) => {
    if (item.isExpandable) {
      if (isCollapsed) {
        setIsCollapsed(false);
      }
      toggleExpandedItem(item.id);
      setActiveItem(item.id);
    } else {
      setActiveItem(item.id);
      setActiveSubItem(null);
      setExpandedItem(null);
      if (item.path) {
        navigate(item.path);
      }
    }
  }, [isCollapsed, toggleExpandedItem, navigate]);

  const handleSubItemClick = useCallback((subItemId) => {
    const allSubItems = navigationItems.flatMap(item =>
      item.subItems ? item.subItems.map(sub => ({ ...sub, parentId: item.id })) : []
    );
    const subItem = allSubItems.find(item => item.id === subItemId);
    if (subItem) {
      navigate(subItem.path);
    }
  }, [navigate]);

  // Efecto para sincronizar el estado activo con la URL actual usando rutas centralizadas
  useEffect(() => {
    const currentPath = location.pathname;

    // Crear mapeo dinámico para todas las rutas basado en navigationItems
    const dynamicRouteMapping = {};
    navigationItems.forEach(item => {
      if (item.path) {
        dynamicRouteMapping[item.path] = { activeItem: item.id, activeSubItem: null, expandedItem: null };
      }
      if (item.subItems) {
        item.subItems.forEach(sub => {
          dynamicRouteMapping[sub.path] = { activeItem: item.id, activeSubItem: sub.id, expandedItem: item.id };
        });
      }
    });

    // Ordenar las rutas por longitud descendente para que las rutas más específicas se verifiquen primero
    const sortedRoutes = Object.entries(dynamicRouteMapping).sort(([a], [b]) => b.length - a.length);

    const matchingRoute = sortedRoutes.find(([path]) =>
      currentPath === path || currentPath.startsWith(path + '/')
    );

    if (matchingRoute) {
      const [path, state] = matchingRoute;
      setActiveItem(state.activeItem);
      setActiveSubItem(state.activeSubItem);
      // Siempre colapsar la sidebar al navegar a una nueva ruta
      setExpandedItem(null);
    } else {
      // Fallback para rutas que no coincidan exactamente
      navigationItems.forEach(item => {
        if (currentPath.startsWith(item.path)) {
          setActiveItem(item.id);
          setActiveSubItem(null);
          setExpandedItem(item.id);
          return;
        }
        if (item.subItems) {
          item.subItems.forEach(sub => {
            if (currentPath.startsWith(sub.path)) {
              setActiveItem(item.id);
              setActiveSubItem(sub.id);
              setExpandedItem(item.id);
              return;
            }
          });
        }
      });
      // Si no hay match, resetear a dashboard
      setActiveItem('dashboard');
      setActiveSubItem(null);
      setExpandedItem(null);
    }
  }, [location.pathname]);

  // Efecto para cerrar la sidebar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setExpandedItem(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return {
    isCollapsed,
    toggleSidebar,
    expandedItem,
    toggleExpandedItem,
    activeItem,
    activeSubItem,
    handleItemClick,
    handleSubItemClick,
    sidebarRef,
  };
};
