import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import { useSidebar } from '../../../hooks/useSidebar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../hooks/use-toast';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const {
    isCollapsed,
    expandedItem,
    activeItem,
    activeSubItem,
    toggleSidebar,
    handleItemClick,
    handleSubItemClick,
    sidebarRef
  } = useSidebar();

  const handleLogout = async () => {
    try {
      console.log('🔐 Cerrando sesión...');

      // Redirigir inmediatamente a la landing page para evitar que React Router detecte la falta de autenticación
      navigate('/', { replace: true });

      // Luego hacer logout
      await logout();

      // Mostrar notificación de éxito
      toast({
        title: "👋 ¡Hasta luego!",
        description: "Tu sesión ha sido cerrada exitosamente.",
        variant: "success",
      });

      console.log('✅ Sesión cerrada exitosamente');

    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);

      // Mostrar notificación de error pero no redirigir ya que ya estamos en la home
      toast({
        title: "⚠️ Error al cerrar sesión",
        description: "Tu sesión se cerró pero hubo un problema técnico.",
        variant: "destructive",
      });
    }
  };

  const handleGoToSite = () => {
    navigate('/');
  };

  const contentVariants = {
    expanded: {
      marginLeft: ['80px', '280px', '280px', '280px'],
      transition: { duration: 0.3, ease: "easeOut" }
    },
    collapsed: {
      marginLeft: ['20px', '80px', '80px', '80px'],
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className={"absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%23E2E8F0\' fillOpacity=\'0.3\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"}></div>

      {/* Sidebar */}
      <div className="fixed top-0 left-0 z-30 h-full">
        <Sidebar
          isCollapsed={isCollapsed}
          expandedItem={expandedItem}
          activeItem={activeItem}
          activeSubItem={activeSubItem}
          onToggleSidebar={toggleSidebar}
          onItemClick={handleItemClick}
          onSubItemClick={handleSubItemClick}
          onLogout={handleLogout}
          onGoToSite={handleGoToSite}
          ref={sidebarRef}
        />
      </div>

      {/* Main Content */}
      <motion.div
        variants={contentVariants}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        className="relative z-10"
      >
        <Header />

        <main className="p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/20 p-4 md:p-8 min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-8rem)]"
          >
            {children}
          </motion.div>
        </main>
      </motion.div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
