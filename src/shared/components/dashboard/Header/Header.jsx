import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdNotifications, MdKeyboardArrowDown } from 'react-icons/md';
import NotificationDropdown from './NotificationDropdown';
import ProfileDropdown from './ProfileDropdown';
import ViewAppointmentModal from '../../../../features/dashboard/components/appointment/ViewAppointmentModal';
import ConfirmationDialog from '../../../components/ui/ConfirmationDialog';
import { useAppointments } from '../../../contexts/AppointmentContext';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '@/shared/contexts/AuthContext';
import SettingsModal from '../Header/SettingsModal';
import notificacionApiService from '../../../services/notificacionApiService';
import reportesInmobiliariosService from '../../../../features/dashboard/services/reportesInmobiliarios.service';
import ViewReportModal from '../../../../features/dashboard/components/reports/ViewReportModal';
import realtimeBus from '../../../services/realtimeBus';

const UNREAD_FETCH_COOLDOWN_MS = 15000;
let unreadFetchInFlightGlobal = null;
let lastUnreadFetchAtGlobal = 0;

const Header = () => {
  const { appointments, updateAppointmentStatus } = useAppointments();
  const { user, hasPermission } = useAuth();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBellFxActive, setIsBellFxActive] = useState(false);
  const [unreadNotificationIds, setUnreadNotificationIds] = useState([]);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [reports, setReports] = useState([]);
  const [seenReportIds, setSeenReportIds] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const notificationButtonRef = useRef(null);
  const userMenuRef = useRef(null);
  const userMenuButtonRef = useRef(null);
  const userMenuDropdownRef = useRef(null);
  const bellFxTimeoutRef = useRef(null);
  const unreadNotificationIdsRef = useRef([]);
  const { toast } = useToast();

  // Filtrar citas solicitadas pendientes
  const pendingAppointments = Array.isArray(appointments) ? appointments.filter(cita => cita.estado === 'solicitada') : [];
  const notificationScopeKey = user?.id || user?.id_persona || user?.email || user?.correo || 'anon';
  
  const canViewCitas = hasPermission('citas', 'ver');
  const canViewReportes = hasPermission('reportes', 'ver');
  const canViewAnyNotifications = canViewCitas || canViewReportes;

  // Cargar reportes vistos de localStorage
  useEffect(() => {
    if (!notificationScopeKey) return;
    try {
      const stored = localStorage.getItem(`inmotech_seen_reports_${notificationScopeKey}`);
      if (stored) {
        setSeenReportIds(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Error cargando reportes vistos:', e);
    }
  }, [notificationScopeKey]);

  // Guardar reportes vistos en localStorage
  useEffect(() => {
    if (!notificationScopeKey) return;
    localStorage.setItem(`inmotech_seen_reports_${notificationScopeKey}`, JSON.stringify(seenReportIds));
  }, [seenReportIds, notificationScopeKey]);

  // Cargar reportes reales
  const fetchReports = useCallback(async () => {
    if (!canViewReportes) return;
    try {
      const response = await reportesInmobiliariosService.listarReportes();
      const allReports = response.data || response || [];
      // Ordenar por fecha desc (considerando varios posibles nombres de campo)
      const sorted = [...allReports].sort((a, b) => {
        const dateA = new Date(a.fecha_creacion || a.fecha || a.createdAt || 0);
        const dateB = new Date(b.fecha_creacion || b.fecha || b.createdAt || 0);
        return dateB - dateA;
      });
      setReports(sorted);
    } catch (error) {
      console.error('Error fetching reports for notifications:', error);
    }
  }, [canViewReportes]);

  useEffect(() => {
    if (canViewReportes) {
      fetchReports();
    }
  }, [canViewReportes, fetchReports]);

  const unseenReportsCount = reports.filter(r => !seenReportIds.includes(r.id_reporte || r.id)).length;
  const totalNotificationsCount = (canViewCitas ? pendingAppointments.length : 0) + (canViewReportes ? unseenReportsCount : 0);

  const triggerBellFx = useCallback(() => {
    if (bellFxTimeoutRef.current) {
      clearTimeout(bellFxTimeoutRef.current);
      bellFxTimeoutRef.current = null;
    }

    setIsBellFxActive(true);
    bellFxTimeoutRef.current = setTimeout(() => {
      setIsBellFxActive(false);
      bellFxTimeoutRef.current = null;
    }, 850);
  }, []);

  const loadUnreadNotifications = useCallback(async ({ triggerAnimation = true, force = false } = {}) => {
    if (!canViewCitas) {
      setUnreadNotificationIds([]);
      setPreviousUnreadCount(0);
      unreadNotificationIdsRef.current = [];
      return [];
    }

    const now = Date.now();
    const cacheIsFresh = now - lastUnreadFetchAtGlobal < UNREAD_FETCH_COOLDOWN_MS;

    if (unreadFetchInFlightGlobal) {
      return unreadFetchInFlightGlobal;
    }

    if (cacheIsFresh && !force) {
      return unreadNotificationIdsRef.current;
    }

    try {
      unreadFetchInFlightGlobal = (async () => {
        const response = await notificacionApiService.obtenerNoLeidas();
        const unreadNotifications = Array.isArray(response?.data) ? response.data : [];
        const unreadIds = unreadNotifications
          .map((item) => item?.id_notificacion ?? item?.id)
          .filter((id) => id !== undefined && id !== null)
          .map((id) => String(id));

        unreadNotificationIdsRef.current = unreadIds;
        setUnreadNotificationIds(unreadIds);
        setPreviousUnreadCount((previousValue) => {
          if (triggerAnimation && unreadIds.length > previousValue) {
            triggerBellFx();
          }
          return unreadIds.length;
        });

        lastUnreadFetchAtGlobal = Date.now();
        return unreadIds;
      });
      return await unreadFetchInFlightGlobal;
    } catch (error) {
      console.warn('No se pudieron cargar notificaciones no leidas desde backend:', error);
      return unreadNotificationIdsRef.current;
    } finally {
      unreadFetchInFlightGlobal = null;
    }
  }, [canViewCitas, triggerBellFx]);

  const markUnreadAsReadOnOpen = useCallback(async (idsToMark = unreadNotificationIdsRef.current) => {
    if (isMarkingRead) return;

    const numericIds = Array.from(
      new Set(
        (Array.isArray(idsToMark) ? idsToMark : [])
          .map((id) => Number.parseInt(id, 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      )
    );

    if (numericIds.length === 0) return;

    try {
      setIsMarkingRead(true);
      await notificacionApiService.marcarVariasComoLeidas(numericIds);
      setUnreadNotificationIds((currentIds) =>
        {
          const nextUnreadIds = currentIds.filter((id) => !numericIds.includes(Number.parseInt(id, 10)));
          unreadNotificationIdsRef.current = nextUnreadIds;
          return nextUnreadIds;
        }
      );
      setPreviousUnreadCount((currentValue) => Math.max(0, currentValue - numericIds.length));
    } catch (error) {
      console.warn('No se pudieron marcar notificaciones como leidas en backend:', error);
    } finally {
      setIsMarkingRead(false);
    }
  }, [isMarkingRead]);

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith('inmotech_seen_notification_ids_'));
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('No se pudieron limpiar keys legacy de notificaciones vistas:', error);
    }
  }, []);

  useEffect(() => {
    if (!notificationScopeKey) return;
    loadUnreadNotifications();
  }, [loadUnreadNotifications, notificationScopeKey]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUnreadNotifications({ triggerAnimation: false });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadUnreadNotifications]);

  useEffect(() => {
    if (!canViewCitas) return undefined;

    const offNotificationChanged = realtimeBus.on('notification.changed', () => {
      loadUnreadNotifications({ triggerAnimation: true, force: true });
    });
    const offFallbackTick = realtimeBus.on('realtime.fallback.tick', () => {
      loadUnreadNotifications({ triggerAnimation: false, force: true });
    });
    const offReconcile = realtimeBus.on('realtime.reconcile_requested', () => {
      loadUnreadNotifications({ triggerAnimation: false, force: true });
    });

    return () => {
      offNotificationChanged();
      offFallbackTick();
      offReconcile();
    };
  }, [canViewCitas, loadUnreadNotifications]);

  useEffect(() => {
    return () => {
      if (bellFxTimeoutRef.current) {
        clearTimeout(bellFxTimeoutRef.current);
      }
    };
  }, []);

  const handleAcceptAppointmentRequest = (appointment) => {
    setSelectedAppointment(appointment);
    setIsAcceptDialogOpen(true);
    setIsNotificationOpen(false);
  };

  const handleRejectAppointmentRequest = (appointment) => {
    setSelectedAppointment(appointment);
    setIsRejectDialogOpen(true);
    setIsNotificationOpen(false);
  };

  const handleAcceptAppointment = async () => {
    if (selectedAppointment) {
      try {
        const appointmentId = selectedAppointment.id || selectedAppointment.id_cita;
        await updateAppointmentStatus(appointmentId, 2); // 2 = confirmada
        setIsAcceptDialogOpen(false);
        setSelectedAppointment(null);
        const clientName = typeof selectedAppointment.cliente === 'object'
          ? `${selectedAppointment.cliente.nombre_completo} ${selectedAppointment.cliente.apellido_completo}`.trim()
          : selectedAppointment.cliente;
        toast({
          title: "¡Cita aceptada exitosamente!",
          description: `La cita con ${clientName} ha sido confirmada.`,
          variant: "default"
        });
      } catch (error) {
        console.error('Error al aceptar cita:', error);
        toast({
          title: "Error al aceptar cita",
          description: "No se pudo confirmar la cita. Inténtalo de nuevo.",
          variant: "destructive"
        });
      }
    }
  };

  const handleRejectAppointment = async () => {
    if (selectedAppointment) {
      try {
        const appointmentId = selectedAppointment.id || selectedAppointment.id_cita;
        await updateAppointmentStatus(appointmentId, 6); // 6 = cancelada
        setIsRejectDialogOpen(false);
        setSelectedAppointment(null);
        const clientName = typeof selectedAppointment.cliente === 'object'
          ? `${selectedAppointment.cliente.nombre_completo} ${selectedAppointment.cliente.apellido_completo}`.trim()
          : selectedAppointment.cliente;
        toast({
          title: "¡Cita rechazada exitosamente!",
          description: `La cita con ${clientName} ha sido cancelada.`,
          variant: "default"
        });
      } catch (error) {
        console.error('Error al rechazar cita:', error);
        toast({
          title: "Error al rechazar cita",
          description: "No se pudo cancelar la cita. Inténtalo de nuevo.",
          variant: "destructive"
        });
      }
    }
  };

  const handleViewAppointment = (appointment) => {
    // Abrir modal de vista de cita
    setSelectedAppointment(appointment);
    setIsViewModalOpen(true);
    setIsNotificationOpen(false);
  };

  const handleOpenReport = (report) => {
    const reportId = report.id_reporte || report.id;
    if (!seenReportIds.includes(reportId)) {
      setSeenReportIds(prev => [...prev, reportId]);
    }
    setSelectedReport(report);
    setIsReportModalOpen(true);
    setIsNotificationOpen(false);
  };

  const handleNotificationToggle = async () => {
    const willOpen = !isNotificationOpen;
    setIsNotificationOpen(willOpen);

    if (!willOpen) return;

    // Actualizar reportes al abrir
    if (canViewReportes) {
      fetchReports();
    }

    const shouldRefreshBeforeMark = Date.now() - lastUnreadFetchAtGlobal >= UNREAD_FETCH_COOLDOWN_MS;
    const latestUnreadIds = shouldRefreshBeforeMark
      ? await loadUnreadNotifications({ triggerAnimation: false })
      : unreadNotificationIdsRef.current;
    await markUnreadAsReadOnOpen(latestUnreadIds);
  };

  // Función para obtener el nombre completo del usuario
  const getUserFullName = () => {
    if (!user) return 'Usuario';

    // Intentar diferentes campos para el nombre
    const firstName = user.nombre_completo || user.primer_nombre || user.nombres || '';
    const lastName = user.apellido_completo || user.primer_apellido || user.apellidos || '';

    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.email || 'Usuario';
  };

  // Función para obtener el rol principal del usuario
  const getUserRole = () => {
    if (!user || !user.roles) return 'Usuario';

    // Extraer nombres de roles (manejar tanto objetos como strings)
    const roleNames = user.roles.map(rol =>
      typeof rol === 'object' ? rol.nombre_rol : rol
    ).filter(Boolean);

    // Si es Super Administrador, mostrar eso
    if (roleNames.includes('Super Administrador')) {
      return 'Super Administrador';
    }

    // Si es Administrador
    if (roleNames.includes('Administrador')) {
      return 'Administrador';
    }

    // Mostrar el primer rol disponible
    return roleNames[0] || 'Usuario';
  };

  const getUserInitial = () => {
    const fullName = getUserFullName();
    if (fullName && fullName.trim().length > 0) {
      return fullName.trim().charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserAvatar = () => {
    return user?.foto_perfil_url || user?.foto || user?.avatarUrl || '';
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickOutsideButton = userMenuRef.current && !userMenuRef.current.contains(event.target);
      const clickOutsideMenu = userMenuDropdownRef.current && !userMenuDropdownRef.current.contains(event.target);

      if (isUserMenuOpen && clickOutsideButton && clickOutsideMenu) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -30, rotateX: -5 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 relative z-50 overflow-hidden"
      style={{
        backdropFilter: 'blur(20px)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.9) 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      {/* Elementos decorativos sutiles en 3D */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(0,0,0,0.1) 1px, transparent 2px),
          radial-gradient(circle at 75% 75%, rgba(0,0,0,0.1) 1px, transparent 2px)
        `,
        backgroundSize: '40px 40px'
      }}></div>
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200/80 to-transparent"></div>

      <div className="flex items-center space-x-3">
        <div>
          <motion.p
            initial={{ opacity: 0.8, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
            className="text-sm tracking-wide text-gray-400 font-light leading-relaxed"
          >
            Bienvenido 👋
          </motion.p>
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="flex items-center space-x-3"
          >
            <h2 className="text-2xl font-light text-gray-800 leading-tight">
              {getUserFullName()}
            </h2>
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-100 rounded-full shadow-sm"
            >
              {getUserRole()}
            </motion.span>
          </motion.div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <motion.button
            ref={notificationButtonRef}
            animate={isBellFxActive
              ? {
                  rotate: [0, -12, 10, -8, 6, -4, 2, 0],
                  scale: [1, 1.07, 1]
                }
              : { rotate: 0, scale: 1 }
            }
            transition={isBellFxActive
              ? {
                  duration: 0.8,
                  ease: 'easeInOut',
                  times: [0, 0.12, 0.24, 0.36, 0.5, 0.64, 0.78, 1]
                }
              : { duration: 0.2 }
            }
            whileHover={{
              scale: 1.05,
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
            }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNotificationToggle}
            className="relative p-2.5 text-gray-600 hover:text-blue-600 rounded-xl transition-all duration-300 hover:bg-blue-50/50"
            style={{
              border: '1px solid transparent',
              backgroundColor: 'rgba(255, 255, 255, 0.4)'
            }}
          >
            <AnimatePresence>
              {isBellFxActive && (
                <motion.span
                  initial={{ opacity: 0.65, scale: 0.75 }}
                  animate={{ opacity: 0, scale: 1.7 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.85, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 rounded-xl border-2 border-blue-300/70"
                />
              )}
            </AnimatePresence>
            <MdNotifications size={22} />
            {totalNotificationsCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full w-5 h-5 flex items-center justify-center font-bold border-2 border-white shadow-sm pointer-events-none"
              >
                {totalNotificationsCount}
              </motion.span>
            )}
          </motion.button>

          <NotificationDropdown
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            notifications={pendingAppointments}
            reports={reports}
            seenReportIds={seenReportIds}
            canViewCitas={canViewCitas}
            canViewReportes={canViewReportes}
            onAcceptAppointment={handleAcceptAppointmentRequest}
            onRejectAppointment={handleRejectAppointmentRequest}
            onViewAppointment={handleViewAppointment}
            onOpenReport={handleOpenReport}
            triggerRef={notificationButtonRef}
          />
        </div>

        {/* User Profile */}
        <div className="relative" ref={userMenuRef}>
          <motion.button
            ref={userMenuButtonRef}
            whileHover={{
              scale: 1.03,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-3 bg-white/60 border border-gray-200/60 rounded-full px-3 py-1.5 shadow-sm hover:border-gray-300/80 transition-all duration-300"
            aria-expanded={isUserMenuOpen}
            aria-label="Menú de usuario"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold flex items-center justify-center uppercase text-sm shadow-md overflow-hidden"
            >
              {getUserAvatar() ? (
                <img
                  src={getUserAvatar()}
                  alt={getUserFullName()}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                getUserInitial()
              )}
            </motion.div>
            <motion.span
              animate={{ rotate: isUserMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-600"
            >
              <MdKeyboardArrowDown size={20} />
            </motion.span>
          </motion.button>

          <ProfileDropdown
            isOpen={isUserMenuOpen}
            onClose={() => setIsUserMenuOpen(false)}
            triggerRef={userMenuButtonRef}
            onOpenSettings={() => {
              setIsUserMenuOpen(false);
              setIsSettingsModalOpen(true);
            }}
            userFullName={getUserFullName()}
            userRole={getUserRole()}
            userInitial={getUserInitial()}
            userAvatar={getUserAvatar()}
          />
        </div>
      </div>

      {/* View Appointment Modal */}
      <ViewAppointmentModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedAppointment(null);
        }}
        cita={selectedAppointment}
      />

      {/* View Report Modal */}
      <ViewReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setSelectedReport(null);
        }}
        reporte={selectedReport}
      />

      {/* Accept Appointment Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isAcceptDialogOpen}
        onClose={() => {
          setIsAcceptDialogOpen(false);
          setSelectedAppointment(null);
        }}
        onConfirm={handleAcceptAppointment}
        title="Confirmar Cita"
        description={`¿Estás seguro de que deseas confirmar la cita con ${typeof selectedAppointment?.cliente === 'object' ? `${selectedAppointment.cliente.nombre_completo} ${selectedAppointment.cliente.apellido_completo}`.trim() : selectedAppointment?.cliente}?`}
        confirmText="Confirmar"
        cancelText="Cancelar"
        variant="default"
      />

      {/* Reject Appointment Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isRejectDialogOpen}
        onClose={() => {
          setIsRejectDialogOpen(false);
          setSelectedAppointment(null);
        }}
        onConfirm={handleRejectAppointment}
        title="Rechazar Cita"
        description={`¿Estás seguro de que deseas rechazar la cita con ${typeof selectedAppointment?.cliente === 'object' ? `${selectedAppointment.cliente.nombre_completo} ${selectedAppointment.cliente.apellido_completo}`.trim() : selectedAppointment?.cliente}?`}
        confirmText="Rechazar"
        cancelText="Cancelar"
        variant="destructive"
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </motion.header>
  );
};

export default Header;
