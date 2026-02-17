import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdMenu, MdClose } from 'react-icons/md';
import SidebarItem from './SidebarItem';
import { navigationItems, logoutItem, goToSiteItem } from '../../../utils/navigationData';
import { useAuth } from '../../../contexts/AuthContext';
import '../../../styles/globals.css';

const Sidebar = React.forwardRef(({
  isCollapsed,
  expandedItem,
  activeItem,
  activeSubItem,
  onToggleSidebar,
  onItemClick,
  onSubItemClick,
  onLogout,
  onGoToSite
}, ref) => {
  const { user, getAvailableModules } = useAuth();

  const sidebarVariants = {
    expanded: {
      width: '280px',
      transition: { duration: 0.3, ease: "easeOut" }
    },
    collapsed: {
      width: '80px',
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  const logoVariants = {
    float: {
      y: [-2, 2, -2],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const navRef = useRef(null);
  const prevExpandedItem = useRef(null);

  const filteredNavigationItems = React.useMemo(() => {
    if (!user) {
      return navigationItems.filter(item => item.id === 'dashboard');
    }

    const availableModules = getAvailableModules();
    const moduleSet = new Set(availableModules);
    const roleNames = user.roles || [];

    if (roleNames.includes('Super Administrador') || roleNames.includes('Administrador')) {
      return navigationItems;
    }

    return navigationItems.filter(item => {
      if (item.id === 'dashboard') {
        return true;
      }

      if (item.id === 'seguridad') {
        return false;
      }

      return moduleSet.has(item.id);
    });
  }, [user, getAvailableModules]);

  useEffect(() => {
    if (navRef.current) {
      if (expandedItem === 'seguridad' && prevExpandedItem.current !== 'seguridad') {
        navRef.current.scrollTo({ top: navRef.current.scrollHeight, behavior: 'smooth' });
      } else if (expandedItem !== 'seguridad' && prevExpandedItem.current === 'seguridad') {
        navRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    prevExpandedItem.current = expandedItem;
  }, [expandedItem]);

  const handleGoToSiteClick = () => {
    if (onGoToSite) {
      onGoToSite();
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      className="relative h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 shadow-2xl shadow-slate-900/30 flex flex-col">

      {/* Efecto de brillo sutil */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

      {/* Header con Logo */}
      <div className={`relative flex items-center justify-between p-3  ${isCollapsed ? ' border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm' : 'from-slate-900 via-slate-800 to-slate-900'}`}>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="logo-container flex items-center justify-center"
            >
              <motion.div
                variants={logoVariants}
                animate="float"
                className="logo-container flex items-center justify-center"
              >
              <img src="/images/logo-matriz-sin-fondo.png" alt="Logo" className="w-42 h-42 movable-logo" />
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{
            scale: 1.1,
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSidebar}
          className={`p-2 rounded-lg text-slate-300 hover:text-white hover:bg-blue-500/10 transition-all duration-300 border border-transparent hover:border-blue-400/30 ${isCollapsed ? 'ml-2' : ''}`}
        >
          {isCollapsed ? <MdMenu size={20} /> : <MdClose size={20} />}
        </motion.button>
      </div>

      {/* Solo logo cuando está colapsada */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-4"
          >
            <motion.div
              variants={logoVariants}
              animate="float"
              className="logo-container flex items-center justify-center"
            >
              <img src="/images/logo-matriz-sin-fondo.png" alt="Logo" className="w-34 h-34 movable-logo" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navegación */}
      <div ref={navRef} className={`flex-1 py-4 ${expandedItem === 'seguridad' ? 'overflow-y-auto' : 'overflow-y-hidden'} overflow-x-hidden custom-scrollbar`}>
        <nav className="space-y-1">
          {filteredNavigationItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              isExpanded={expandedItem === item.id}
              isActive={activeItem === item.id}
              activeSubItem={activeSubItem}
              onItemClick={onItemClick}
              onSubItemClick={onSubItemClick}
            />
          ))}
        </nav>
      </div>

      {/* Botón "Ir al Sitio" encima del logout */}
      <div className="p-2 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <motion.div
          whileHover={{
            scale: 1.02,
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoToSiteClick}
          className={`flex items-center px-4 py-3 mx-2 rounded-xl cursor-pointer text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all duration-300 group border border-transparent hover:border-blue-400/30 ${isCollapsed ? 'ml-1.5' : ''}`}
        >
          <div className="flex items-center justify-center w-8 h-8 -ml-0.5">
            <goToSiteItem.icon size={20} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="ml-3 font-medium text-sm"
              >
                {goToSiteItem.title}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Logout Button Fijo */}
      <div className="p-2 bg-slate-800/30 backdrop-blur-sm">
        <motion.div
          whileHover={{
            scale: 1.02,
            backgroundColor: 'rgba(239, 68, 68, 0.1)'
          }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogout}
          className={`flex items-center px-4 py-3 mx-2 rounded-xl cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300 group border border-transparent hover:border-red-400/30 ${isCollapsed ? 'ml-1.5' : ''}`}
        >
          <div className="flex items-center justify-center w-8 h-8 ml-0">
            <logoutItem.icon size={20} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="ml-3 font-medium text-sm"
              >
                {logoutItem.title}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Efecto de luz en la parte inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
    </motion.div>
  );
});

export default Sidebar;
