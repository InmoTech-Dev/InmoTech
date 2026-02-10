import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { cn } from '../../utils/cn';

const UserStatusSelector = ({
  value,
  onChange,
  disabled = false,
  loading = false,
  className,
  showLabel = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, position: 'bottom' });
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);

  // Configuración de estados para usuarios (boolean)
  const statusConfig = {
    true: {
      label: 'Habilitado',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      dotColor: 'bg-green-500'
    },
    false: {
      label: 'Deshabilitado',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      hoverColor: 'hover:bg-red-100',
      dotColor: 'bg-red-500'
    }
  };

  const currentStatus = statusConfig[value] || statusConfig.true;
  const StatusIcon = currentStatus.icon;

  // Calcular posición óptima del dropdown
  const calculateDropdownPosition = useCallback(() => {
    if (!selectRef.current) return;

    const rect = selectRef.current.getBoundingClientRect();
    const dropdownHeight = 120; // Altura estimada del dropdown
    const margin = 8; // Margen de seguridad

    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Determinar si hay más espacio abajo o arriba
    const hasSpaceBelow = spaceBelow >= dropdownHeight + margin;
    const hasSpaceAbove = spaceAbove >= dropdownHeight + margin;

    let position = 'bottom';
    let top = rect.bottom + margin;

    // Si no hay suficiente espacio abajo, intentar arriba
    if (!hasSpaceBelow && hasSpaceAbove) {
      position = 'top';
      top = rect.top - dropdownHeight - margin;
    }
    // Si no hay suficiente espacio en ninguna dirección, usar la que tenga más espacio
    else if (!hasSpaceBelow && !hasSpaceAbove) {
      if (spaceBelow >= spaceAbove) {
        position = 'bottom';
        top = rect.bottom + margin;
      } else {
        position = 'top';
        top = rect.top - dropdownHeight - margin;
      }
    }

    // Ajustar si se sale de la pantalla horizontalmente
    let left = rect.left;
    const dropdownWidth = rect.width;

    if (left + dropdownWidth > window.innerWidth) {
      left = window.innerWidth - dropdownWidth - margin;
    }

    if (left < margin) {
      left = margin;
    }

    setDropdownPosition({
      top,
      left,
      width: dropdownWidth,
      position
    });
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && selectRef.current && !selectRef.current.contains(event.target)) {
        // Verificar si el clic fue en el dropdown del portal
        const dropdownElement = document.querySelector('[data-user-status-selector-dropdown]');
        if (!dropdownElement || !dropdownElement.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Recalcular posición cuando se abra el dropdown
  useEffect(() => {
    if (isOpen) {
      calculateDropdownPosition();
    }
  }, [isOpen, calculateDropdownPosition]);

  // Manejar cambios de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, calculateDropdownPosition]);

  const handleStatusChange = async (newStatus) => {
    if (disabled || loading) return;

    // Validación: no permitir cambiar al mismo estado
    if (newStatus === value) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    setIsOpen(false);

    try {
      await onChange(newStatus);
    } catch (error) {
      console.error('Error changing status:', error);
    } finally {
      setTimeout(() => setIsChanging(false), 300);
    }
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!disabled && !loading) {
      setIsOpen(!isOpen);
    }
  };

  const handleDropdownClick = (e) => {
    // Prevenir que el clic en el dropdown cierre el dropdown
    e.stopPropagation();
  };

  return (
    <div className={cn("relative", className)} ref={selectRef}>
      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={handleToggle}
        disabled={disabled || loading}
        whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
        className={cn(
          "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 min-w-[150px] justify-between",
          currentStatus.bgColor,
          currentStatus.borderColor,
          currentStatus.color,
          !disabled && !loading && "cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 ring-opacity-50"
        )}
      >
        {/* Loading State */}
        <AnimatePresence mode="wait">
          {loading || isChanging ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cambiando...</span>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              {/* Status Icon with Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="relative"
              >
                <StatusIcon className="w-4 h-4" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 500, damping: 30 }}
                  className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full", currentStatus.dotColor)}
                />
              </motion.div>
              <span className="truncate">{currentStatus.label}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chevron Icon */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 opacity-70" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu usando Portal */}
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{
              opacity: 0,
              scale: 0.95,
              y: dropdownPosition.position === 'top' ? 10 : -10
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              x: 0
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: dropdownPosition.position === 'top' ? 10 : -10
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bg-white rounded-lg border border-gray-200 shadow-2xl overflow-hidden z-50 min-w-[150px]"
            data-user-status-selector-dropdown="true"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              transformOrigin: dropdownPosition.position === 'top' ? 'bottom center' : 'top center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1 max-h-48 overflow-y-auto">
              {Object.entries(statusConfig).map(([statusKey, config], index) => {
                const IconComponent = config.icon;
                const isSelected = value === (statusKey === 'true');

                return (
                  <motion.button
                    key={statusKey}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(statusKey === 'true');
                    }}
                    disabled={disabled || loading}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150",
                      "hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                      isSelected
                        ? `${config.bgColor} ${config.color} font-medium`
                        : "text-gray-700 hover:text-gray-900",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <motion.div
                      className="relative"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <IconComponent className="w-4 h-4" />
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full", config.dotColor)}
                        />
                      )}
                    </motion.div>
                    <span className="flex-1 text-left">{config.label}</span>

                    {/* Selected Indicator */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="w-2 h-2 rounded-full bg-current"
                        />
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default UserStatusSelector;
