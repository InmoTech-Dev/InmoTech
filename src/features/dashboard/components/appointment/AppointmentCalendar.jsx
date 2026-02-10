import React, { useState, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, MapPin, Plus } from 'lucide-react';
import AppointmentCard from './AppointmentCard';
import ActionsPopover from './ActionsPopover';
import UserActionsPopover from '../../../../features/appointments/components/UserActionsPopover';
import DayListModal from './DayListModal';
import ConfirmationDialog from '../../../../shared/components/ui/ConfirmationDialog';
import RescheduleConfirmModal from './RescheduleConfirmModal';
import { useToast } from '../../../../shared/hooks/use-toast';
import { useAuth } from '../../../../shared/contexts/AuthContext';

// Componente para zonas de navegación invisibles
const NavigationZone = ({ id, direction, onNavigate }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: 'navigation',
      direction: direction
    }
  });

  const [hoverTimeout, setHoverTimeout] = React.useState(null);

  React.useEffect(() => {
    if (isOver) {
      // Esperar 800ms antes de navegar para dar tiempo al usuario
      const timeout = setTimeout(() => {
        onNavigate(direction);
      }, 800);
      setHoverTimeout(timeout);
    } else {
      // Limpiar timeout si deja de estar over
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        setHoverTimeout(null);
      }
    }

    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [isOver, direction, onNavigate]);

  return (
    <div
      ref={setNodeRef}
      className={`absolute inset-0 pointer-events-auto transition-all duration-200 ${
        isOver ? 'bg-blue-100 bg-opacity-20' : ''
      }`}
      style={{ background: 'transparent' }}
    />
  );
};

const DayCell = ({
  day,
  appointments,
  isToday,
  activeAppointment,
  onAppointmentClick,
  onEmptyCellClick,
  onMoreClick,
  currentDate,
  isActive,
  onCreateAppointment
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day || 'empty'}`,
    data: {
      type: 'day',
      day: day,
      date: day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
    }
  });

  const visibleAppointments = appointments.slice(0, 3);
  const hasMore = appointments.length > 3;

  const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = cellDate < today;

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        day-cell min-h-[100px] max-h-[120px] p-1.5 border border-slate-200 rounded-lg transition-all duration-200 relative
        ${day ? 'hover:shadow-md cursor-pointer' : ''}
        ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-slate-50'}
        ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-25' : ''}
      `}
      onClick={() => {
        if (!day) return;
        onEmptyCellClick(day);
      }}
    >
      {day && (
        <>
          <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
            {day}
          </div>

          <div className="space-y-1 max-h-[80px] overflow-y-auto">
            {visibleAppointments.map((appointment) => (
              activeAppointment?.id === appointment.id ? null : (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppointmentClick(appointment, e);
                  }}
                />
              )
            ))}

            {hasMore && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoreClick(appointments);
                }}
                className="w-full text-xs text-slate-500 text-center py-1 hover:text-slate-700 transition-colors"
              >
                +{appointments.length - 3} más
              </button>
            )}
          </div>

          {isActive && !isPast && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                onCreateAppointment(dateString);
              }}
              className="absolute bottom-2 right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm px-3 py-2 rounded-full shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-1 font-medium"
            >
              <Plus className="w-4 h-4" />
              Crear Cita
            </motion.button>
          )}
        </>
      )}
    </motion.div>
  );
};

const AppointmentCalendar = ({
  citas,
  onViewAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onRescheduleAppointment,
  onCreateAppointment,
  onAcceptAppointment,
  onRejectAppointment,
  onOpenRescheduleModal,
  userMode = false
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [popoverState, setPopoverState] = useState({ isOpen: false, position: null, appointment: null, date: null });
  const [dayListModal, setDayListModal] = useState({ isOpen: false, date: null, appointments: [] });
  const [rescheduleConfirm, setRescheduleConfirm] = useState({ isOpen: false, appointment: null, newDate: null });
  const [tempRescheduledAppointments, setTempRescheduledAppointments] = useState({});
  const [isNavigating, setIsNavigating] = useState(false);
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Close active day on click outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.day-cell')) {
        setActiveDay(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  // Get appointments for a specific date, considering temporary reschedules
  const getAppointmentsForDate = (day) => {
    if (!day) return [];
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // ✅ CORREGIDO: Usar fecha_cita en lugar de fecha
    const originalAppointments = citas.filter(cita => cita.fecha_cita === dateString || cita.fecha === dateString);
    
    // Include appointments temporarily rescheduled to this date
    const tempAppointments = Object.entries(tempRescheduledAppointments)
      .filter(([_, newDate]) => newDate === dateString)
      .map(([id, _]) => citas.find(cita => 
        (cita.id_cita?.toString() === id) || (cita.id?.toString() === id)
      ))
      .filter(Boolean);
    
    const result = [...originalAppointments, ...tempAppointments];
    return result;
  };
  
  // Navigate months
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const days = getDaysInMonth(currentDate);
  const monthName = formatDate(currentDate);

  const handleDragStart = (event) => {
    const { active } = event;
    const appointment = active.data.current?.appointment;
    if (appointment) {
      setActiveAppointment(appointment);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveAppointment(null);

    if (!over) return;

    // ✅ CORREGIDO: Buscar por id_cita o id
    const appointment = active.data.current?.appointment ||
      (active.id && citas.find(cita =>
        `appointment-${cita.id_cita}` === active.id || `appointment-${cita.id}` === active.id
      ));

    const targetDay = over.data.current?.day;
    const targetDate = over.data.current?.date;

    if (!appointment || !targetDate) return;

    // ✅ CORREGIDO: Comparar con fecha_cita
    const appointmentDate = appointment.fecha_cita || appointment.fecha;
    if (appointmentDate === targetDate) return;

    // Validate date is not in the past
    const today = new Date().toISOString().split('T')[0];
    if (targetDate < today) {
      toast({
        title: "Fecha inválida",
        description: "No se puede reagendar a una fecha anterior a hoy.",
        variant: "destructive"
      });
      return;
    }

    const maxEdits = appointment.ediciones_maximas ?? 2;
    const usedEdits = appointment.ediciones_realizadas ?? 0;

    if (userMode && usedEdits >= maxEdits) {
      toast({
        title: "Límite de ediciones alcanzado",
        description: "No puedes mover esta cita nuevamente.",
        variant: "destructive"
      });
      return;
    }

    // ✅ CORREGIDO: Usar id_cita o id
    const appointmentId = appointment.id_cita || appointment.id;

    // Temporarily update appointment date for visual feedback
    setTempRescheduledAppointments(prev => ({
      ...prev,
      [appointmentId]: targetDate
    }));

    // Show confirmation modal - use custom modal for user mode or default modal
    if (userMode && onOpenRescheduleModal) {
      onOpenRescheduleModal(appointment, targetDate);
      // Clean up temp state since we'll handle it in the parent component
      setTempRescheduledAppointments(prev => {
        const copy = { ...prev };
        delete copy[appointmentId];
        return copy;
      });
    } else {
      setRescheduleConfirm({
        isOpen: true,
        appointment,
        newDate: targetDate
      });
    }
  };

  // Función para manejar navegación automática durante drag
  const handleNavigate = (direction) => {
    if (isNavigating) return; // Evitar navegación múltiple

    setIsNavigating(true);
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });

    // Reset navigation flag after a short delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  };

  // Nueva función para manejar navegación automática durante drag
  const handleDragOver = (event) => {
    const { active, over } = event;

    if (!active || !over) return;

    // Solo procesar si estamos arrastrando una cita
    const appointment = active.data.current?.appointment;
    if (!appointment) return;

    // Detectar si estamos sobre un área especial de navegación
    if (over.id === 'nav-prev-month' || over.id === 'nav-next-month') {
      const direction = over.id === 'nav-prev-month' ? -1 : 1;
      handleNavigate(direction);
    }
  };
      
  const handleRescheduleConfirm = (reagendamientoData) => {
    if (rescheduleConfirm.appointment && reagendamientoData) {
      // ✅ CORREGIDO: Usar id_cita o id
      const appointmentId = rescheduleConfirm.appointment.id_cita || rescheduleConfirm.appointment.id;

      // Pasar todos los datos de reagendamiento (incluyendo motivo y nueva hora)
      onRescheduleAppointment(appointmentId, reagendamientoData);

      setTempRescheduledAppointments(prev => {
        const copy = { ...prev };
        delete copy[appointmentId];
        return copy;
      });
    }
    setRescheduleConfirm({ isOpen: false, appointment: null, newDate: null });
  };
  
  const handleRescheduleCancel = () => {
    // Remove from temp reschedules to revert visual change
    if (rescheduleConfirm.appointment) {
      // ✅ CORREGIDO: Usar id_cita o id
      const appointmentId = rescheduleConfirm.appointment.id_cita || rescheduleConfirm.appointment.id;
      setTempRescheduledAppointments(prev => {
        const copy = { ...prev };
        delete copy[appointmentId];
        return copy;
      });
    }
    setRescheduleConfirm({ isOpen: false, appointment: null, newDate: null });
  };
  
  const handleAppointmentClick = (appointment, event) => {
    setPopoverState({
      isOpen: true,
      position: null,
      appointment,
      date: null,
      referenceElement: event.currentTarget,
    });
  };

  const handleEmptyCellClick = (day) => {
    setActiveDay(day);
  };

  const handleMoreClick = (appointments) => {
    // ✅ CORREGIDO: Usar fecha_cita
    const date = appointments[0]?.fecha_cita || appointments[0]?.fecha;
    setDayListModal({ isOpen: true, date, appointments });
  };
  
  const closePopover = () => {
    setPopoverState({ isOpen: false, position: null, appointment: null, date: null, referenceElement: null });
  };

  const closeDayListModal = () => {
    setDayListModal({ isOpen: false, date: null, appointments: [] });
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        {/* Zonas invisibles para navegación automática durante drag */}
        <div className="fixed inset-0 pointer-events-none z-10">
          {/* Zona izquierda para mes anterior */}
          <div className="absolute left-0 top-0 w-20 h-full">
            <NavigationZone
              id="nav-prev-month"
              direction={-1}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Zona derecha para mes siguiente */}
          <div className="absolute right-0 top-0 w-20 h-full">
            <NavigationZone
              id="nav-next-month"
              direction={1}
              onNavigate={handleNavigate}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6 relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Calendario de Citas
            </h3>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              <span className="font-medium text-slate-700 min-w-[150px] text-center">
                {monthName}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Days of week header */}
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="p-3 text-center font-medium text-slate-600 text-sm">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day, index) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isToday = day === new Date().getDate() &&
                             currentDate.getMonth() === new Date().getMonth() &&
                             currentDate.getFullYear() === new Date().getFullYear();
              const isActive = activeDay === day && (userMode || hasPermission("citas", "crear")); // Mostrar para usuarios o admin con permisos

              return (
                <DayCell
                  key={index}
                  day={day}
                  appointments={dayAppointments}
                  isToday={isToday}
                  activeAppointment={activeAppointment}
                  onAppointmentClick={handleAppointmentClick}
                  onEmptyCellClick={handleEmptyCellClick}
                  onMoreClick={handleMoreClick}
                  currentDate={currentDate}
                  isActive={isActive}
                  onCreateAppointment={onCreateAppointment}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span>Programada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span>Confirmada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
              <span>Completada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>Cancelada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
              <span>Re Agendada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-100 border border-indigo-200 rounded"></div>
              <span>Solicitada</span>
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        {createPortal(
          <DragOverlay adjustScale={false}>
            {activeAppointment ? (
              <AppointmentCard
                appointment={activeAppointment}
                isDragging={true}
                className="rotate-3 shadow-2xl"
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {/* Actions Popover */}
      {userMode ? (
        <UserActionsPopover
          isOpen={popoverState.isOpen}
          onClose={closePopover}
          referenceElement={popoverState.referenceElement}
          appointment={popoverState.appointment}
          onView={onViewAppointment}
          onEdit={onEditAppointment}
          onCancel={onDeleteAppointment}
        />
      ) : (
        <ActionsPopover
          isOpen={popoverState.isOpen}
          onClose={closePopover}
          referenceElement={popoverState.referenceElement}
          appointment={popoverState.appointment}
          date={popoverState.date}
          onView={onViewAppointment}
          onEdit={onEditAppointment}
          onDelete={onDeleteAppointment}
          onCreate={onCreateAppointment}
          onAccept={onAcceptAppointment}
          onReject={onRejectAppointment}
        />
      )}

      {/* Day List Modal */}
      <DayListModal
        isOpen={dayListModal.isOpen}
        onClose={closeDayListModal}
        date={dayListModal.date}
        appointments={dayListModal.appointments}
        onViewAppointment={onViewAppointment}
        onEditAppointment={onEditAppointment}
        onDeleteAppointment={onDeleteAppointment}
        onAcceptAppointment={onAcceptAppointment}
        onRejectAppointment={onRejectAppointment}
      />

      {/* Reschedule Confirmation Modal */}
      <RescheduleConfirmModal
        isOpen={rescheduleConfirm.isOpen}
        appointment={rescheduleConfirm.appointment}
        newDate={rescheduleConfirm.newDate}
        onConfirm={handleRescheduleConfirm}
        onCancel={handleRescheduleCancel}
      />
    </>
  );
};

export default AppointmentCalendar;
