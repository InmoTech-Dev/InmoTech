import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, Filter, ChevronRight } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../shared/components/ui/select';
import { formatTimeTo12Hour, formatTimeTo24Hour } from '../../../../shared/utils/time';

const AppointmentSidebar = ({ citas, onAppointmentClick }) => {
  const [internalFilter, setInternalFilter] = React.useState('Todos los estados');
  const getCitaFecha = (cita) => {
    const raw = cita?.fecha_cita || cita?.fecha || null;
    if (!raw) return null;

    if (typeof raw === 'string') {
      if (raw.includes('T')) return raw.split('T')[0];
      const simpleMatch = raw.match(/^\d{4}-\d{2}-\d{2}$/);
      if (simpleMatch) return raw;
    }

    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return null;
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getCitaHora = (cita) => cita?.hora_inicio || cita?.hora || null;

  // Get upcoming appointments (next 10 appointments sorted by date and time)
  const upcomingAppointments = useMemo(() => {
    const filtered = Array.isArray(citas) ? citas : [];
    
    return filtered
      .filter(cita => {
        const fechaCita = getCitaFecha(cita);
        if (!fechaCita) return false;

        if (internalFilter !== 'Todos los estados' && cita.estado !== internalFilter) {
          return false;
        }

        // Fix date comparison by using string comparison for "today" logic
        // Assuming fecha is YYYY-MM-DD
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        return fechaCita >= todayStr && cita.estado !== 'cancelada';
      })
      .sort((a, b) => {
        // Sort by date, then by time
        const fechaA = getCitaFecha(a);
        const fechaB = getCitaFecha(b);
        const dateCompare = fechaA.localeCompare(fechaB);
        if (dateCompare !== 0) return dateCompare;
        
        // Compare times if dates are equal
        const timeA = formatTimeTo24Hour(getCitaHora(a)) || '00:00';
        const timeB = formatTimeTo24Hour(getCitaHora(b)) || '00:00';
        return timeA.localeCompare(timeB);
      })
      .slice(0, 10); // Show next 10 appointments
  }, [citas, internalFilter]);

  const formatDate = (dateString) => {
    // Parse YYYY-MM-DD manually to avoid UTC conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const checkDate = new Date(date);
    checkDate.setHours(0,0,0,0);
    
    const checkTime = checkDate.getTime();
    const todayTime = today.getTime();
    const tomorrowTime = tomorrow.getTime();

    if (checkTime === todayTime) {
      return 'Hoy';
    } else if (checkTime === tomorrowTime) {
      return 'Mañana';
    } else {
      return new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      }).format(date);
    }
  };

  const getStatusColor = (estado) => {
    const colors = {
      programada: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      confirmada: 'bg-green-100 text-green-700 border-green-200',
      completada: 'bg-purple-100 text-purple-700 border-purple-200',
      cancelada: 'bg-red-100 text-red-700 border-red-200',
      're agendada': 'bg-orange-100 text-orange-700 border-orange-200',
      solicitada: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    };
    return colors[estado] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getClientName = (cita) => {
    if (!cita) return 'Sin cliente';
    
    // Si ya existe clienteNombreCompleto (caché o pre-calculado)
    if (cita.clienteNombreCompleto) return cita.clienteNombreCompleto;

    if (typeof cita.cliente === 'object' && cita.cliente) {
      const nombre = (cita.cliente.nombre_completo || cita.cliente.nombre || '').trim();
      const apellido = (cita.cliente.apellido_completo || cita.cliente.apellido || '').trim();
      const completo = `${nombre} ${apellido}`.trim();
      return completo || 'Sin nombre';
    }
    
    return cita.cliente || 'Sin nombre';
  };

  const getPropertyName = (cita) => {
    if (!cita) return 'Sin propiedad';
    
    // Si ya existe direccion (caché o pre-calculado)
    if (cita.direccion) return cita.direccion;

    if (cita.inmueble && typeof cita.inmueble === 'object') {
      return cita.inmueble.direccion || 'Sin dirección';
    }
    
    // Caso de respaldo (propiedad puede ser string o un campo antiguo)
    if (cita.propiedad) {
       return typeof cita.propiedad === 'object' 
        ? (cita.propiedad.direccion || 'Sin dirección') 
        : cita.propiedad;
    }

    return 'Sin propiedad';
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Próximas Citas</h3>
        
        {/* Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filtrar por estado
          </label>
          <Select value={internalFilter} onValueChange={setInternalFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los estados"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos los estados">Todos los estados</SelectItem>
              <SelectItem value="programada">Programadas</SelectItem>
              <SelectItem value="confirmada">Confirmadas</SelectItem>
              <SelectItem value="completada">Completadas</SelectItem>
              <SelectItem value="re agendada">Re Agendadas</SelectItem>
              <SelectItem value="solicitada">Solicitadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable appointments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {upcomingAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No hay citas próximas</p>
          </div>
        ) : (
          upcomingAppointments.map((cita, index) => (
            <motion.div
              key={cita.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onAppointmentClick && onAppointmentClick(cita)}
              className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
            >
              {/* Date and Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {formatDate(getCitaFecha(cita))}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(cita.estado)}`}>
                  {cita.estado}
                </span>
              </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTimeTo12Hour(getCitaHora(cita))}
                </div>

              {/* Client */}
              <div className="flex items-center gap-2 text-sm text-slate-800 font-medium mb-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{getClientName(cita)}</span>
              </div>

              {/* Property */}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{getPropertyName(cita)}</span>
              </div>

              {/* Hover indicator */}
              <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer - Fixed */}
      {upcomingAppointments.length > 0 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <p className="text-xs text-slate-600 text-center">
            Mostrando {upcomingAppointments.length} próxima{upcomingAppointments.length !== 1 ? 's' : ''} cita{upcomingAppointments.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default AppointmentSidebar;
