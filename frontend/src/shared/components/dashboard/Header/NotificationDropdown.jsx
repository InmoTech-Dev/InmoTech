import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Check, X, Clock, FileText as FileTextIcon, ChevronRight, User, Home } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import citaApiService from '../../../services/citaApiService';

const NotificationDropdown = ({
  isOpen,
  onClose,
  notifications = [],
  canViewSolicitudes = true,
  reports = [],
  seenReportIds = [],
  canViewCitas = true,
  canViewReportes = true,
  onAcceptAppointment,
  onRejectAppointment,
  onViewAppointment,
  onOpenReport,
  triggerRef,
  userRole
}) => {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, anchorX: 28, transformOrigin: '90% 0%' });
  const [isPositioned, setIsPositioned] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(canViewSolicitudes ? 'citas' : 'reportes');
  const { hasPermission } = useAuth();

  const dropdownMargin = 12;
  const maxDropdownWidth = 340;
  const minArrowInset = 22;
  const closeAnimationMs = 200;

  useEffect(() => {
    if (!canViewSolicitudes && activeTab === 'citas' && canViewReportes) {
      setActiveTab('reportes');
    } else if (!canViewReportes && activeTab === 'reportes' && canViewSolicitudes) {
      setActiveTab('citas');
    }
  }, [canViewSolicitudes, canViewReportes, activeTab]);

  const formatAppointmentDate = (dateValue) => {
    if (!dateValue) return 'Sin especificar';
    try {
      let parsedDate;
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        const isoDate = new Date(dateValue);
        if (Number.isNaN(isoDate.getTime())) return 'Sin especificar';
        parsedDate = new Date(isoDate.getUTCFullYear(), isoDate.getUTCMonth(), isoDate.getUTCDate());
      } else if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        parsedDate = new Date(`${dateValue}T00:00:00`);
      } else {
        parsedDate = new Date(dateValue);
      }

      if (Number.isNaN(parsedDate.getTime())) return 'Sin especificar';
      return parsedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Sin especificar';
    }
  };

  const formatAppointmentTime = (timeValue) => {
    if (!timeValue) return 'Sin especificar';
    try {
      return citaApiService.formatHoraDesdeAPI(timeValue);
    } catch (error) {
      console.error('Error formateando hora:', error);
      return 'Sin especificar';
    }
  };

  const formatNotificationDateTime = (dateValue) => {
    if (!dateValue) return 'Sin fecha';
    try {
      const parsedDate = new Date(dateValue);
      if (Number.isNaN(parsedDate.getTime())) return 'Sin fecha';
      return parsedDate.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha de notificacion:', error);
      return 'Sin fecha';
    }
  };

  const getClientName = (appointment) => {
    if (!appointment?.cliente) return 'Sin especificar';
    if (typeof appointment.cliente === 'object') {
      return `${appointment.cliente.nombre_completo || ''} ${appointment.cliente.apellido_completo || ''}`.trim() || 'Sin especificar';
    }
    return appointment.cliente;
  };

  const getServiceName = (appointment) => {
    if (!appointment?.servicio) return 'Sin especificar';
    if (typeof appointment.servicio === 'object') {
      return appointment.servicio.nombre_servicio || 'Sin especificar';
    }
    return appointment.servicio;
  };

  const getPropertyLocation = (appointment) => {
    const inmueble = appointment?.inmueble;
    if (!inmueble || typeof inmueble !== 'object') return null;
    const address = inmueble.direccion || '';
    const city = inmueble.ciudad || '';
    const location = [address, city].filter(Boolean).join(', ');
    return location || null;
  };

  const calculateDropdownLayout = (triggerRect, panelWidth) => {
    const safeWidth = Math.max(280, panelWidth);
    const minLeft = dropdownMargin;
    const maxLeft = Math.max(minLeft, window.innerWidth - safeWidth - dropdownMargin);
    const preferredLeft = triggerRect.right - safeWidth;
    const left = Math.min(Math.max(preferredLeft, minLeft), maxLeft);
    const top = triggerRect.bottom + 8;
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const anchorX = Math.min(Math.max(triggerCenter - left, minArrowInset), safeWidth - minArrowInset);
    return { top, left, anchorX, transformOrigin: `${Math.round((anchorX / safeWidth) * 100)}% 0%` };
  };

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const updatePosition = () => {
        const rect = triggerRef.current.getBoundingClientRect();
        const measuredWidth = dropdownRef.current?.offsetWidth;
        setPosition(calculateDropdownLayout(rect, measuredWidth || maxDropdownWidth));
        setIsPositioned(true);
      };

      setShouldRender(true);
      updatePosition();
      const rafId = requestAnimationFrame(() => {
        updatePosition();
        setIsVisible(true);
      });
      window.addEventListener('resize', updatePosition);
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', updatePosition);
      };
    }

    setIsVisible(false);
    const timer = setTimeout(() => {
      setShouldRender(false);
      setIsPositioned(false);
    }, closeAnimationMs);
    return () => clearTimeout(timer);
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && triggerRef.current && !triggerRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!shouldRender || !isPositioned) return null;

  const unseenReportsCount = reports.filter((r) => !seenReportIds.includes(r.id_reporte || r.id)).length;

  const renderLeaseNotification = (notification, index) => (
    <motion.div
      key={notification.id_notificacion || notification.id || index}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.16 }}
    >
      <motion.article
        whileHover={{
          y: -1,
          borderColor: 'rgba(251, 191, 36, 0.7)',
          boxShadow: '0 0 0 1px rgba(251, 191, 36, 0.22), 0 8px 16px -12px rgba(245, 158, 11, 0.55)'
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm"
      >
        <div className="border-b border-amber-100 bg-amber-50/70 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-amber-900">Finalizacion de arriendo</p>
              <p className="mt-0.5 text-[9px] text-amber-700">Falta un mes para el vencimiento</p>
            </div>
            <p className="text-right text-[10px] font-semibold text-amber-800">
              {formatNotificationDateTime(notification.fecha_creacion)}
            </p>
          </div>
        </div>

        <div className="px-3 py-2">
          <p className="text-[11px] font-semibold text-slate-800">
            {notification.titulo || 'Arriendo proximo a finalizar'}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            {notification.mensaje || 'Hay un arriendo proximo a finalizar.'}
          </p>
        </div>
      </motion.article>
    </motion.div>
  );

  const renderAppointmentNotification = (notification, index) => (
    <motion.div
      key={notification.id || notification.id_cita || index}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.16 }}
    >
      <motion.article
        whileHover={{
          y: -1,
          borderColor: 'rgba(96, 165, 250, 0.7)',
          boxShadow: '0 0 0 1px rgba(96, 165, 250, 0.28), 0 8px 16px -12px rgba(59, 130, 246, 0.65)'
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 px-2.5 py-1.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-slate-800">Nueva cita solicitada</p>
              <p className="mt-0.5 text-[9px] text-slate-500">Pendiente de gestion</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500">
                {formatAppointmentDate(notification.fecha_cita || notification.fecha)}
              </p>
              <p className="text-[10px] text-slate-500">
                {formatAppointmentTime(notification.hora_inicio || notification.hora)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-2.5 py-1.5">
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500">
              <span className="font-bold uppercase tracking-wide text-[8px]">Cliente:</span>{' '}
              <span className="text-[11px] text-slate-800 normal-case font-medium">
                {getClientName(notification)}
              </span>
            </p>
            <p className="text-[10px] text-slate-500">
              <span className="font-bold uppercase tracking-wide text-[8px]">Servicio:</span>{' '}
              <span className="text-[11px] text-slate-800 normal-case font-medium">
                {getServiceName(notification)}
              </span>
            </p>
            {getPropertyLocation(notification) && (
              <p className="text-[10px] text-slate-500">
                <span className="font-bold uppercase tracking-wide text-[8px]">Inmueble:</span>{' '}
                <span className="text-[11px] text-slate-800 normal-case block truncate font-medium">
                  {getPropertyLocation(notification)}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/40 px-2.5 py-1.5">
          <div className="grid grid-cols-3 gap-2">
            <motion.button
              disabled={!hasPermission('citas', 'ver')}
              whileHover={hasPermission('citas', 'ver') ? { y: -1 } : {}}
              whileTap={hasPermission('citas', 'ver') ? { scale: 0.98 } : {}}
              onClick={() => (hasPermission('citas', 'ver') ? onViewAppointment(notification) : null)}
              className={`inline-flex h-7 items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-bold transition-colors ${
                hasPermission('citas', 'ver')
                  ? 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
              }`}
            >
              <Eye className="h-3 w-3" /> Ver
            </motion.button>

            <motion.button
              disabled={!hasPermission('citas', 'editar')}
              whileHover={hasPermission('citas', 'editar') ? { y: -1 } : {}}
              whileTap={hasPermission('citas', 'editar') ? { scale: 0.98 } : {}}
              onClick={() => (hasPermission('citas', 'editar') ? onAcceptAppointment(notification) : null)}
              className={`inline-flex h-7 items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-bold transition-colors ${
                hasPermission('citas', 'editar')
                  ? 'border-green-200 bg-white text-green-700 hover:bg-green-50'
                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
              }`}
            >
              <Check className="h-3 w-3" /> Aceptar
            </motion.button>

            <motion.button
              disabled={!hasPermission('citas', 'eliminar')}
              whileHover={hasPermission('citas', 'eliminar') ? { y: -1 } : {}}
              whileTap={hasPermission('citas', 'eliminar') ? { scale: 0.98 } : {}}
              onClick={() => (hasPermission('citas', 'eliminar') ? onRejectAppointment(notification) : null)}
              className={`inline-flex h-7 items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-bold transition-colors ${
                hasPermission('citas', 'eliminar')
                  ? 'border-red-200 bg-white text-red-700 hover:bg-red-50'
                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
              }`}
            >
              <X className="h-3 w-3" /> Rechazar
            </motion.button>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );

  return ReactDOM.createPortal(
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -10, scale: 0.95 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'circOut' }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: 'min(92vw, 340px)',
        transformOrigin: position.transformOrigin,
        zIndex: 10000
      }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-100 bg-white">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-base font-bold tracking-tight text-slate-800">Centro de Notificaciones</h3>
          </div>

          <div className="flex px-1 pb-1">
            {canViewSolicitudes && (
              <button
                onClick={() => setActiveTab('citas')}
                className={`relative flex-1 py-2.5 text-xs font-bold transition-all duration-300 ${
                  activeTab === 'citas' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Solicitudes</span>
                  {notifications.length > 0 && (
                    <span className="min-w-[16px] rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] text-white">
                      {notifications.length}
                    </span>
                  )}
                </div>
                {activeTab === 'citas' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-600"
                  />
                )}
              </button>
            )}

            {canViewReportes && (
              <button
                onClick={() => setActiveTab('reportes')}
                className={`relative flex-1 py-2.5 text-xs font-bold transition-all duration-300 ${
                  activeTab === 'reportes' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Reportes</span>
                  {unseenReportsCount > 0 && (
                    <span className="min-w-[16px] rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white">
                      {unseenReportsCount}
                    </span>
                  )}
                </div>
                {activeTab === 'reportes' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-600"
                  />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[480px] overflow-y-auto overflow-x-hidden bg-slate-50/20 p-3">
          <AnimatePresence mode="wait">
            {activeTab === 'citas' ? (
              <motion.div
                key="citas"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <Clock className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">No hay notificaciones pendientes</p>
                    <p className="mt-1 px-8 text-[10px] text-slate-500">Las nuevas solicitudes y alertas apareceran aqui en tiempo real.</p>
                  </div>
                ) : (
                  notifications.map((notification, index) =>
                    notification?.notificationKind === 'lease'
                      ? renderLeaseNotification(notification, index)
                      : renderAppointmentNotification(notification, index)
                  )
                )}
              </motion.div>
            ) : (
              <motion.div
                key="reportes"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {reports.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <FileTextIcon className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">Sin reportes registrados</p>
                    <p className="mt-1 px-8 text-[10px] text-slate-500">Los reportes generados apareceran en este listado.</p>
                  </div>
                ) : (
                  reports.map((report, index) => {
                    const isSeen = seenReportIds.includes(report.id_reporte || report.id);
                    return (
                      <motion.div
                        key={report.id_reporte || report.id || index}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <button
                          onClick={() => onOpenReport(report)}
                          className="group relative w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-all duration-300 hover:border-blue-400 hover:shadow-md"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                                isSeen ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-600'
                              }`}
                            >
                              <FileTextIcon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {!isSeen && <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />}
                                <h4 className="truncate text-xs font-bold text-slate-800">
                                  {report.titulo || report.titulo_reporte || (report.tipo_reporte || '').replace('Mantenimineto', 'Mantenimiento') || report.tipoReporte || 'Sin titulo'}
                                </h4>
                              </div>
                              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                                {formatAppointmentDate(report.fecha_creacion || report.fecha || report.createdAt)}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                {report.descripcion || report.descripcion_reporte || report.seguimiento_general || 'Sin descripcion disponible'}
                              </p>

                              {(userRole === 'Super Administrador' || userRole === 'Administrador') && (
                                <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                    <User size={10} className="flex-shrink-0 text-blue-500" />
                                    <span className="whitespace-nowrap font-medium">Via:</span>
                                    <span className="truncate text-slate-700">{report.reporta_nombre || 'Desconocido'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                                    <Home size={10} className="flex-shrink-0 text-blue-500" />
                                    <span className="whitespace-nowrap font-medium">Inmueble:</span>
                                    <span className="truncate text-slate-700">{report.inmueble_direccion || report.direccion || `Referencia: ${report.inmueble_referencia || ''}`}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-blue-500" />
                          </div>
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>,
    document.body
  );
};

export default NotificationDropdown;
