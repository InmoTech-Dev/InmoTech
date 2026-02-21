import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { Eye, Check, X, Clock } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import citaApiService from '../../../services/citaApiService';

const NotificationDropdown = ({
  isOpen,
  onClose,
  notifications,
  onAcceptAppointment,
  onRejectAppointment,
  onViewAppointment,
  triggerRef
}) => {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, anchorX: 28, transformOrigin: '90% 0%' });
  const [isPositioned, setIsPositioned] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { hasPermission } = useAuth();
  const dropdownMargin = 12;
  const maxDropdownWidth = 320;
  const minArrowInset = 22;
  const closeAnimationMs = 180;

  const formatAppointmentDate = (dateValue) => {
    if (!dateValue) return 'Sin especificar';

    try {
      let parsedDate;

      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        const isoDate = new Date(dateValue);
        if (isNaN(isoDate.getTime())) return 'Sin especificar';
        parsedDate = new Date(
          isoDate.getUTCFullYear(),
          isoDate.getUTCMonth(),
          isoDate.getUTCDate()
        );
      } else if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        parsedDate = new Date(`${dateValue}T00:00:00`);
      } else {
        parsedDate = new Date(dateValue);
      }

      if (isNaN(parsedDate.getTime())) return 'Sin especificar';

      return parsedDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha en NotificationDropdown:', error);
      return 'Sin especificar';
    }
  };

  const formatAppointmentTime = (timeValue) => {
    if (!timeValue) return 'Sin especificar';
    try {
      return citaApiService.formatHoraDesdeAPI(timeValue);
    } catch (error) {
      console.error('Error formateando hora en NotificationDropdown:', error);
      return 'Sin especificar';
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
    const safeWidth = Math.max(240, panelWidth);
    const minLeft = dropdownMargin;
    const maxLeft = Math.max(minLeft, window.innerWidth - safeWidth - dropdownMargin);
    const preferredLeft = triggerRect.right - safeWidth;
    const left = Math.min(Math.max(preferredLeft, minLeft), maxLeft);
    const top = triggerRect.bottom + 6;

    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const rawAnchorX = triggerCenter - left;
    const anchorX = Math.min(
      Math.max(rawAnchorX, minArrowInset),
      Math.max(minArrowInset, safeWidth - minArrowInset)
    );

    const originPercent = Math.round((anchorX / safeWidth) * 100);

    return {
      top,
      left,
      anchorX,
      transformOrigin: `${originPercent}% 0%`
    };
  };

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const updatePosition = () => {
        const rect = triggerRef.current.getBoundingClientRect();
        const measuredWidth = dropdownRef.current?.offsetWidth;
        const fallbackWidth = Math.min(window.innerWidth * 0.90, maxDropdownWidth);
        const panelWidth = measuredWidth || fallbackWidth;

        setPosition(calculateDropdownLayout(rect, panelWidth));
        setIsPositioned(true);
      };

      setShouldRender(true);
      updatePosition();

      const rafId = requestAnimationFrame(() => {
        updatePosition();
        setIsVisible(true);
      });

      const handleResize = () => updatePosition();
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
      };
    }

    setIsVisible(false);
    const closeTimer = setTimeout(() => {
      setShouldRender(false);
      setIsPositioned(false);
    }, closeAnimationMs);

    return () => clearTimeout(closeTimer);
  }, [isOpen, triggerRef]);

  // Close dropdown on page scroll (but keep open when scrolling inside dropdown content)
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleScrollClose = (event) => {
      const target = event?.target;
      if (target instanceof Node && dropdownRef.current?.contains(target)) return;
      onClose();
    };

    window.addEventListener('scroll', handleScrollClose, true);
    return () => {
      window.removeEventListener('scroll', handleScrollClose, true);
    };
  }, [isOpen, onClose]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target) && triggerRef.current && !triggerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!shouldRender || !isPositioned) return null;

  const dropdownContent = (
    <motion.div
      ref={dropdownRef}
      initial={false}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
      transition={{
        duration: closeAnimationMs / 1000,
        ease: 'easeOut',
      }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: 'min(90vw, 320px)',
        transformOrigin: position.transformOrigin
      }}
      className="z-[10000]"
    >
      <div className="rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">Notificaciones</h3>
            <span className="inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-1 text-[10px] font-semibold text-slate-700">
              {notifications.length}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            {notifications.length} cita{notifications.length !== 1 ? 's' : ''} solicitada{notifications.length !== 1 ? 's' : ''} pendiente{notifications.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="max-h-[44vh] overflow-y-auto bg-slate-50/30 p-2">
          {notifications.length === 0 ? (
            <div className="px-3 py-4 text-center text-slate-500">
              <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                <Clock className="h-3.5 w-3.5 opacity-70" />
              </div>
              <p className="text-sm font-medium text-slate-700">No hay notificaciones pendientes</p>
              <p className="mt-1 text-[10px] text-slate-500">
                Cuando lleguen nuevas solicitudes apareceran aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((appointment, index) => (
                <motion.div
                  key={appointment.id || appointment.id_cita || index}
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
                          <p className="text-sm font-semibold text-slate-800">
                            Nueva cita solicitada
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            Pendiente de gestion
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-medium text-slate-700">
                            {formatAppointmentDate(appointment.fecha_cita || appointment.fecha)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatAppointmentTime(appointment.hora_inicio || appointment.hora)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-2.5 py-1.5">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-500">
                          <span className="font-semibold uppercase tracking-wide">Cliente:</span>{' '}
                          <span className="text-xs text-slate-800 normal-case">{getClientName(appointment)}</span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                          <span className="font-semibold uppercase tracking-wide">Servicio:</span>{' '}
                          <span className="text-xs text-slate-800 normal-case">{getServiceName(appointment)}</span>
                        </p>
                        {getPropertyLocation(appointment) && (
                          <p className="text-[10px] text-slate-500">
                            <span className="font-semibold uppercase tracking-wide">Inmueble:</span>{' '}
                            <span className="text-xs text-slate-800 normal-case block truncate">{getPropertyLocation(appointment)}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/40 px-2.5 py-1.5">
                      <div className="grid grid-cols-3 gap-2">
                        <motion.button
                          disabled={!hasPermission("citas", "ver")}
                          whileHover={hasPermission("citas", "ver") ? { y: -1 } : {}}
                          whileTap={hasPermission("citas", "ver") ? { scale: 0.98 } : {}}
                          onClick={() => hasPermission("citas", "ver") ? onViewAppointment(appointment) : null}
                          className={`inline-flex h-7 items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-medium transition-colors ${
                            hasPermission("citas", "ver")
                              ? 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
                              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                          }`}
                          title={hasPermission("citas", "ver") ? "Ver detalles" : "No tienes permiso para ver"}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </motion.button>

                        <motion.button
                          disabled={!hasPermission("citas", "editar")}
                          whileHover={hasPermission("citas", "editar") ? { y: -1 } : {}}
                          whileTap={hasPermission("citas", "editar") ? { scale: 0.98 } : {}}
                          onClick={() => hasPermission("citas", "editar") ? onAcceptAppointment(appointment) : null}
                          className={`inline-flex h-7 items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-medium transition-colors ${
                            hasPermission("citas", "editar")
                              ? 'border-green-200 bg-white text-green-700 hover:bg-green-50'
                              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                          }`}
                          title={hasPermission("citas", "editar") ? "Aceptar cita" : "No tienes permiso para aceptar"}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Aceptar
                        </motion.button>

                        <motion.button
                          disabled={!hasPermission("citas", "eliminar")}
                          whileHover={hasPermission("citas", "eliminar") ? { y: -1 } : {}}
                          whileTap={hasPermission("citas", "eliminar") ? { scale: 0.98 } : {}}
                          onClick={() => hasPermission("citas", "eliminar") ? onRejectAppointment(appointment) : null}
                          className={`inline-flex h-7 items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-medium transition-colors ${
                            hasPermission("citas", "eliminar")
                              ? 'border-red-200 bg-white text-red-700 hover:bg-red-50'
                              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                          }`}
                          title={hasPermission("citas", "eliminar") ? "Rechazar cita" : "No tienes permiso para rechazar"}
                        >
                          <X className="h-3.5 w-3.5" />
                          Rechazar
                        </motion.button>
                      </div>
                    </div>
                  </motion.article>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return ReactDOM.createPortal(dropdownContent, document.body);
};

export default NotificationDropdown;
