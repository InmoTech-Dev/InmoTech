import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit, Trash2, Plus, Check, X } from 'lucide-react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { useAuth } from '../../../../shared/contexts/AuthContext';

const ActionsPopover = ({
  isOpen,
  onClose,
  referenceElement,
  appointment = null,
  onView,
  onEdit,
  onDelete,
  onCreate,
  onAccept,
  onReject,
  date = null
}) => {
  const popoverRef = useRef(null);
  const { hasPermission } = useAuth();

  const { x, y, reference, floating, strategy, refs } = useFloating({
    placement: 'right-start',
    middleware: [offset(5), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // Sync reference element
  React.useEffect(() => {
    if (referenceElement) {
      refs.setReference(referenceElement);
    }
  }, [referenceElement, refs]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleAction = (action) => {
    action();
    onClose();
  };

  const actions = [];

  if (appointment) {
    if (appointment.estado === 'solicitada') {
      // Para citas solicitadas - TODOS LOS BOTONES APARECEN
      actions.push({
        label: 'Ver',
        icon: Eye,
        action: () => hasPermission("citas", "ver") ? onView(appointment) : null,
        disabled: !hasPermission("citas", "ver"),
        color: hasPermission("citas", "ver") ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed'
      });

      // Aceptar y Cancelar - asumimos que administrativos pueden aprobar/rechazar
      actions.push({
        label: 'Aceptar',
        icon: Check,
        action: () => hasPermission("citas", "editar") ? (onAccept && onAccept(appointment)) : null,
        disabled: !hasPermission("citas", "editar"),
        color: hasPermission("citas", "editar") ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 cursor-not-allowed'
      });

      actions.push({
        label: 'Cancelar',
        icon: X,
        action: () => hasPermission("citas", "eliminar") ? (onReject && onReject(appointment)) : null,
        disabled: !hasPermission("citas", "eliminar"),
        color: hasPermission("citas", "eliminar") ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'
      });
    } else {
      // Para citas confirmadas - TODOS LOS BOTONES APARECEN
      actions.push({
        label: 'Ver',
        icon: Eye,
        action: () => hasPermission("citas", "ver") ? onView(appointment) : null,
        disabled: !hasPermission("citas", "ver"),
        color: hasPermission("citas", "ver") ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed'
      });

      actions.push({
        label: 'Editar',
        icon: Edit,
        action: () => hasPermission("citas", "editar") ? onEdit(appointment) : null,
        disabled: !hasPermission("citas", "editar"),
        color: hasPermission("citas", "editar") ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 cursor-not-allowed'
      });

      actions.push({
        label: 'Eliminar',
        icon: Trash2,
        action: () => hasPermission("citas", "eliminar") ? onDelete(appointment) : null,
        disabled: !hasPermission("citas", "eliminar"),
        color: hasPermission("citas", "eliminar") ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'
      });
    }
  } else {
    // Acción para crear cita - TODOS LOS BOTONES APARECEN
    actions.push({
      label: 'Crear cita',
      icon: Plus,
      action: () => hasPermission("citas", "crear") ? onCreate(date) : null,
      disabled: !hasPermission("citas", "crear"),
      color: hasPermission("citas", "crear") ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed'
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={(node) => {
            popoverRef.current = node;
            refs.setFloating(node);
          }}
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.15 }}
          className="z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px] max-w-[90vw] w-auto"
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
          }}
          role="menu"
          aria-label={appointment ? "Acciones de cita" : "Acciones de día"}
        >
          {actions.map((item, index) => (
            <button
              key={index}
              onClick={() => item.disabled ? null : handleAction(item.action)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${item.color} ${item.disabled ? 'opacity-50' : ''}`}
              role="menuitem"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActionsPopover;
