import React, { useRef, useLayoutEffect, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Clock, User, MapPin } from 'lucide-react';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { formatTimeTo12Hour } from '../../../../shared/utils/time';

const AppointmentCard = ({
  appointment,
  isDragging = false,
  onClick,
  className = '',
  ...props
}) => {
  const cardRef = useRef(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const { user, hasPermission } = useAuth();

  // Measure card size for overlay centering
  useLayoutEffect(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCardSize({ width: rect.width, height: rect.height });
    }
  }, []);

  const canEdit = hasPermission("citas", "editar");
  const remainingEdits = (appointment?.ediciones_maximas ?? 2) - (appointment?.ediciones_realizadas ?? 0);
  const userCanDrag = user && !canEdit && remainingEdits > 0;

  // Permitir drag si:
  // 1. Es admin con permisos, O
  // 2. Es usuario normal y aún tiene ediciones disponibles
  const canDrag = canEdit || userCanDrag;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDndDragging,
  } = useDraggable({
    id: `appointment-${appointment.id_cita || appointment.id}`,
    data: {
      type: 'appointment',
      appointment,
      size: cardSize,
    },
    disabled: isDragging || !canDrag,
  });

  const getStatusColor = (status) => {
    const colors = {
      programada: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmada: 'bg-green-100 text-green-800 border-green-200',
      completada: 'bg-purple-100 text-purple-800 border-purple-200',
      cancelada: 'bg-red-100 text-red-800 border-red-200',
      're agendada': 'bg-orange-100 text-orange-800 border-orange-200',
      solicitada: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return formatTimeTo12Hour(timeString) || timeString;
  };
  
  // Extraer datos de objetos anidados
  const cliente = appointment.cliente || {};
  const servicio = appointment.servicio || {};

  const clienteNombre = cliente.nombre_completo && cliente.apellido_completo
    ? `${cliente.nombre_completo} ${cliente.apellido_completo}`
    : cliente.nombre_completo || 'Cliente no especificado';

  const servicioNombre = servicio.nombre_servicio || 'Servicio no especificado';
  const hora = formatTime(appointment.hora_inicio || appointment.hora || '');
  const fechaCita = appointment.fecha_cita || appointment.fecha || '';

  return (
    <motion.div
      ref={(node) => {
        setNodeRef(node);
        cardRef.current = node;
      }}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`
        p-1 rounded border text-[10px] ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        transition-all duration-200 hover:shadow-sm select-none
        ${getStatusColor(appointment.estado)}
        ${isDndDragging ? 'opacity-50' : ''}
        ${className}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Cita con ${clienteNombre} para ${servicioNombre} el ${fechaCita} a las ${hora}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      }}
      {...props}
    >
      {/* ✅ CORREGIDO: Usar variable hora */}
      <div className="flex items-center gap-0.5 mb-0.5">
        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="font-medium truncate">{hora}</span>
      </div>
      
      {/* ✅ CORREGIDO: Usar variable clienteNombre */}
      <div className="flex items-center gap-0.5 mb-0.5">
        <User className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="truncate">{clienteNombre}</span>
      </div>
      
      {/* ✅ CORREGIDO: Usar variable servicioNombre */}
      <div className="flex items-center gap-0.5">
        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="truncate">{servicioNombre}</span>
      </div>
    </motion.div>
  );
};

export default AppointmentCard;
