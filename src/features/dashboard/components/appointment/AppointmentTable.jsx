import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Edit, Trash2, ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Phone, Mail, Check, X, RefreshCw } from 'lucide-react';
import { formatPhoneNumber } from '../../../../shared/utils/phoneFormatter';
import StatusSelector from '../../../../shared/components/ui/StatusSelector';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import AgentAssignmentSection from './AgentAssignmentSection';
import RescheduleAppointmentModal from './RescheduleAppointmentModal';
import citaApiService from '../../../../shared/services/citaApiService';

const AppointmentTable = ({
  citas,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onAcceptAppointment,
  onRejectAppointment,
  loadingStatusChanges,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const { hasPermission } = useAuth();
  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    cita: null
  });

  const twoLineClampStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  };
  const getStatusBadge = (estado) => {
    const statusConfig = {
      programada: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Programada'
      },
      confirmada: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Confirmada'
      },
      cancelada: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Cancelada'
      },
      completada: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Completada'
      },
      're agendada': {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        label: 'Re Agendada'
      },
      solicitada: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        label: 'Solicitada'
      }
    };

    const config = statusConfig[estado] || statusConfig.programada;

    return (
      <span
        className={`inline-flex w-[124px] min-w-0 flex-none items-center gap-1 px-1.5 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 truncate whitespace-nowrap justify-center ${config.bg} ${config.borderColor} ${config.text} ${estado === 'cancelada' ? 'opacity-60' : ''}`}
      >
        {config.label}
      </span>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';

    try {
      // Si ya es una fecha válida, formatearla
      let date;

      // Manejar diferentes formatos de fecha
      if (dateString.includes('T')) {
        // Formato ISO (2023-12-25T10:30:00Z) - puede venir en UTC
        date = new Date(dateString);
        // Si vienen en zona UTC y necesitamos Colombia, ajustar la hora pero NO la fecha
        // Solo ajustar por zona horaria si afecta la fecha del día
        const utcDate = date.getUTCDate();
        const utcMonth = date.getUTCMonth();
        const utcYear = date.getUTCFullYear();

        // Crear fecha local usando componentes UTC para evitar problemas de zona horaria
        date = new Date(utcYear, utcMonth, utcDate);
      } else if (dateString.includes('-')) {
        // Formato YYYY-MM-DD - tratar como fecha local
        date = new Date(dateString + 'T00:00:00');
      } else if (dateString.includes('/')) {
        // Formato DD/MM/YYYY o MM/DD/YYYY - asumir DD/MM/YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
          // DD/MM/YYYY
          date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`);
        }
      } else {
        // Si no es un formato reconocible, devolver el string original
        return dateString;
      }

      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return dateString;
      }

      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('❌ Error formateando fecha en AppointmentTable:', error, dateString);
      return dateString;
    }
  };

  const getDocumentTypeLabel = (tipoDocumento) => {
    const documentTypes = {
      'CC': 'Cédula de Ciudadanía',
      'CE': 'Cédula de Extranjería',
      'NIT': 'NIT',
      'PASAPORTE': 'Pasaporte',
      'TI': 'Tarjeta de Identidad'
    };
    return documentTypes[tipoDocumento] || tipoDocumento;
  };

  const formatDocumentInfo = (tipoDocumento, numeroDocumento) => {
    if (!tipoDocumento || !numeroDocumento) return '-';
    return `${tipoDocumento} ${numeroDocumento}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';

    try {
      // Usar la función centralizada corregida para zona horaria
      return citaApiService.formatHoraDesdeAPI(timeString);
    } catch (error) {
      console.error('❌ Error formateando hora en componente:', error, timeString);
      return timeString || '-';
    }
  };

  // Helper para obtener el nombre del cliente
  const getClientName = (cita) => {
    // Si cliente es un string (formato simple)
    if (typeof cita.cliente === 'string') return cita.cliente;

    // Si cliente es un objeto con datos anidados (formato de API)
    if (cita.cliente?.nombre_completo && cita.cliente?.apellido_completo) {
      const nombreCompleto = `${cita.cliente.nombre_completo} ${cita.cliente.apellido_completo}`.trim();
      if (nombreCompleto) return nombreCompleto;
    }

    // Si los datos están directamente en la cita (formato plano)
    if (cita.nombre_completo && cita.apellido_completo) {
      const nombreCompleto = `${cita.nombre_completo} ${cita.apellido_completo}`.trim();
      if (nombreCompleto) return nombreCompleto;
    }

    // Si cliente tiene primer_nombre y primer_apellido (formato separado)
    if (cita.cliente?.primer_nombre && cita.cliente?.primer_apellido) {
      const nombre = [cita.cliente.primer_nombre, cita.cliente.segundo_nombre].filter(Boolean).join(' ');
      const apellido = [cita.cliente.primer_apellido, cita.cliente.segundo_apellido].filter(Boolean).join(' ');
      const nombreCompleto = `${nombre} ${apellido}`.trim();
      if (nombreCompleto) return nombreCompleto;
    }

    // Si los datos separados están directamente en la cita
    if (cita.primer_nombre && cita.primer_apellido) {
      const nombre = [cita.primer_nombre, cita.segundo_nombre].filter(Boolean).join(' ');
      const apellido = [cita.primer_apellido, cita.segundo_apellido].filter(Boolean).join(' ');
      const nombreCompleto = `${nombre} ${apellido}`.trim();
      if (nombreCompleto) return nombreCompleto;
    }

    // Si cliente tiene dataValues (formato Sequelize)
    if (cita.cliente?.dataValues?.nombre_completo && cita.cliente?.dataValues?.apellido_completo) {
      const nombreCompleto = `${cita.cliente.dataValues.nombre_completo} ${cita.cliente.dataValues.apellido_completo}`.trim();
      if (nombreCompleto) return nombreCompleto;
    }

    // Fallback: usar información disponible
    if (cita.cliente?.tipo_documento && cita.cliente?.numero_documento) {
      return `${cita.cliente.tipo_documento} ${cita.cliente.numero_documento}`;
    }

    if (cita.cliente?.correo) {
      return cita.cliente.correo;
    }

    // Último recurso: mostrar "Cliente"
    return 'Cliente';
  };

  // Helper para obtener la fecha de la cita
  const getAppointmentDate = (cita) => {
    return cita.fecha_cita || cita.fecha;
  };

  // Helper para obtener la hora de la cita
  const getAppointmentTime = (cita) => {
    return cita.hora_inicio || cita.hora;
  };

  // Helper para obtener el nombre del servicio
  const getServiceName = (cita) => {
    if (typeof cita.servicio === 'string') return cita.servicio;
    if (cita.servicio?.nombre_servicio) return cita.servicio.nombre_servicio;
    return 'Servicio';
  };

  // Helper para obtener el nombre de la propiedad
  const getPropertyName = (cita) => {
    if (typeof cita.propiedad === 'string') return cita.propiedad;
    if (cita.propiedad?.titulo) return cita.propiedad.titulo;
    if (cita.propiedad?.direccion) return cita.propiedad.direccion;
    return 'Propiedad';
  };

  // Helper para obtener el teléfono
  const getClientPhone = (cita) => {
    // Formato plano en la cita
    if (cita.telefono) return cita.telefono;

    // Formato anidado en cliente
    if (cita.cliente?.telefono) return cita.cliente.telefono;

    // Formato Sequelize
    if (cita.cliente?.dataValues?.telefono) return cita.cliente.dataValues.telefono;

    return '-';
  };

  // Helper para obtener el email
  const getClientEmail = (cita) => {
    // Formato plano en la cita
    if (cita.email) return cita.email;

    // Formato anidado en cliente (puede ser 'correo' o 'email')
    if (cita.cliente?.correo) return cita.cliente.correo;
    if (cita.cliente?.email) return cita.cliente.email;

    // Formato Sequelize
    if (cita.cliente?.dataValues?.correo) return cita.cliente.dataValues.correo;
    if (cita.cliente?.dataValues?.email) return cita.cliente.dataValues.email;

    return '-';
  };

  // Helper para obtener tipo de documento
  const getClientDocumentType = (cita) => {
    // Formato plano en la cita
    if (cita.tipoDocumento) return cita.tipoDocumento;
    if (cita.tipo_documento) return cita.tipo_documento;

    // Formato anidado en cliente
    if (cita.cliente?.tipoDocumento) return cita.cliente.tipoDocumento;
    if (cita.cliente?.tipo_documento) return cita.cliente.tipo_documento;

    // Formato Sequelize
    if (cita.cliente?.dataValues?.tipoDocumento) return cita.cliente.dataValues.tipoDocumento;
    if (cita.cliente?.dataValues?.tipo_documento) return cita.cliente.dataValues.tipo_documento;

    return '';
  };

  // Helper para obtener número de documento
  const getClientDocumentNumber = (cita) => {
    // Formato plano en la cita
    if (cita.numeroDocumento) return cita.numeroDocumento;
    if (cita.numero_documento) return cita.numero_documento;

    // Formato anidado en cliente
    if (cita.cliente?.numeroDocumento) return cita.cliente.numeroDocumento;
    if (cita.cliente?.numero_documento) return cita.cliente.numero_documento;

    // Formato Sequelize
    if (cita.cliente?.dataValues?.numeroDocumento) return cita.cliente.dataValues.numeroDocumento;
    if (cita.cliente?.dataValues?.numero_documento) return cita.cliente.dataValues.numero_documento;

    return '';
  };

  // Función para manejar reagendamiento exitoso
  const handleRescheduled = (citaActualizada) => {
    // Aquí puedes actualizar la lista de citas o mostrar una notificación
    console.log('Cita reagendada:', citaActualizada);
    // Si tienes un método para refrescar los datos, lo llamarías aquí
    // onRefreshData();
  };

  // Componente para vista móvil
  const MobileAppointmentCard = ({ cita }) => {
    const isSolicitada = cita.estado === 'solicitada';
    const isCancelled = cita.estado === 'cancelada';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-lg border border-slate-200 p-4 mb-4 ${isCancelled ? 'opacity-60' : ''}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-slate-800">{getClientName(cita)}</h3>
            <p className="text-sm text-slate-600">{getServiceName(cita)}</p>
          </div>
          {isSolicitada ? (
            getStatusBadge(cita.estado)
          ) : (
            <StatusSelector
              value={cita.id_estado_cita}
              onChange={(newStatus) => onStatusChange(cita, newStatus)}
              loading={loadingStatusChanges.has(cita.id)}
              className="w-32"
            />
          )}
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(cita.fecha_cita || cita.fecha)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>{formatTime(cita.hora_inicio || cita.hora)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4" />
            <span>{getPropertyName(cita)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-4 h-4" />
            <span>{formatPhoneNumber(getClientPhone(cita))}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4" />
            <span>{getClientEmail(cita)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {isSolicitada ? (
            <>
              {/* Para citas solicitadas - TODOS LOS BOTONES APARECEN */}
              <motion.button
                key={`mobile-view-${cita.id}`}
                disabled={!hasPermission("citas", "ver")}
                whileHover={hasPermission("citas", "ver") ? { scale: 1.05 } : {}}
                whileTap={hasPermission("citas", "ver") ? { scale: 0.95 } : {}}
                onClick={() => hasPermission("citas", "ver") ? onView(cita) : null}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasPermission("citas", "ver") ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'}`}
                title={hasPermission("citas", "ver") ? "Ver detalles" : "No tienes permiso para ver"}
              >
                <Eye className="w-4 h-4" />
                Ver
              </motion.button>
              <motion.button
                key={`mobile-accept-${cita.id}`}
                disabled={!hasPermission("citas", "editar")}
                whileHover={hasPermission("citas", "editar") ? { scale: 1.05 } : {}}
                whileTap={hasPermission("citas", "editar") ? { scale: 0.95 } : {}}
                onClick={() => hasPermission("citas", "editar") ? onAcceptAppointment(cita) : null}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasPermission("citas", "editar") ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'}`}
                title={hasPermission("citas", "editar") ? "Aceptar cita" : "No tienes permiso para aceptar"}
              >
                <Check className="w-4 h-4" />
                Aceptar
              </motion.button>
              <motion.button
                key={`mobile-reject-${cita.id}`}
                disabled={!hasPermission("citas", "eliminar")}
                whileHover={hasPermission("citas", "eliminar") ? { scale: 1.05 } : {}}
                whileTap={hasPermission("citas", "eliminar") ? { scale: 0.95 } : {}}
                onClick={() => hasPermission("citas", "eliminar") ? onRejectAppointment(cita) : null}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasPermission("citas", "eliminar") ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'}`}
                title={hasPermission("citas", "eliminar") ? "Cancelar cita" : "No tienes permiso para cancelar"}
              >
                <X className="w-4 h-4" />
                Cancelar
              </motion.button>
            </>
          ) : (
            <>
              {/* Para citas confirmadas - TODOS LOS BOTONES APARECEN */}
              <motion.button
                key={`mobile-view-${cita.id}`}
                disabled={!hasPermission("citas", "ver")}
                whileHover={hasPermission("citas", "ver") ? { scale: 1.05 } : {}}
                whileTap={hasPermission("citas", "ver") ? { scale: 0.95 } : {}}
                onClick={() => hasPermission("citas", "ver") ? onView(cita) : null}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasPermission("citas", "ver") ? 'bg-slate-600 text-white hover:bg-slate-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'}`}
                title={hasPermission("citas", "ver") ? "Ver detalles" : "No tienes permiso para ver"}
              >
                <Eye className="w-4 h-4" />
                Ver
              </motion.button>
              <motion.button
                key={`mobile-edit-${cita.id}`}
                disabled={!hasPermission("citas", "editar")}
                whileHover={hasPermission("citas", "editar") ? { scale: 1.05 } : {}}
                whileTap={hasPermission("citas", "editar") ? { scale: 0.95 } : {}}
                onClick={() => hasPermission("citas", "editar") ? onEdit(cita) : null}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasPermission("citas", "editar") ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'}`}
                title={hasPermission("citas", "editar") ? "Editar cita" : "No tienes permiso para editar"}
              >
                <Edit className="w-4 h-4" />
                Editar
              </motion.button>
              <motion.button
                key={`mobile-delete-${cita.id}`}
                disabled={!hasPermission("citas", "eliminar")}
                whileHover={hasPermission("citas", "eliminar") ? { scale: 1.05 } : {}}
                whileTap={hasPermission("citas", "eliminar") ? { scale: 0.95 } : {}}
                onClick={() => hasPermission("citas", "eliminar") ? onDelete(cita) : null}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasPermission("citas", "eliminar") ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'}`}
                title={hasPermission("citas", "eliminar") ? "Eliminar cita" : "No tienes permiso para eliminar"}
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  const safeTotalPages = Math.max(totalPages || 0, 1);

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block flex-1 min-h-0 overflow-hidden">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-[23%]" />
            <col className="w-[23%]" />
          </colgroup>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Servicio / Inmueble
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Fecha / Hora
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Estado / Agente
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Contacto / Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {citas.map((cita, index) => {
              const isSolicitada = cita.estado === 'solicitada';
              const isCancelled = cita.estado === 'cancelada';
              const clientName = getClientName(cita);
              const serviceName = getServiceName(cita);
              const propertyName = getPropertyName(cita);
              const phone = formatPhoneNumber(getClientPhone(cita));
              const email = getClientEmail(cita);
              const documentInfo = formatDocumentInfo(getClientDocumentType(cita), getClientDocumentNumber(cita));

              return (
                <motion.tr
                  key={cita.id || `cita-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`hover:bg-slate-50 transition-colors ${isCancelled ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-4 align-top min-w-0">
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium text-slate-900 break-words"
                        style={twoLineClampStyle}
                        title={clientName}
                      >
                        {clientName}
                      </p>
                      <p
                        className="mt-1 text-xs text-slate-500 break-words"
                        style={twoLineClampStyle}
                        title={documentInfo}
                      >
                        {documentInfo}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top min-w-0">
                    <div className="min-w-0">
                      <p
                        className="text-sm text-slate-900 break-words"
                        style={twoLineClampStyle}
                        title={serviceName}
                      >
                        {serviceName}
                      </p>
                      <div className="flex items-start gap-1.5 mt-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p
                          className="text-xs text-slate-500 break-words min-w-0"
                          style={twoLineClampStyle}
                          title={propertyName}
                        >
                          {propertyName}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top min-w-0">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-900 truncate" title={formatDate(cita.fecha_cita || cita.fecha)}>
                          {formatDate(cita.fecha_cita || cita.fecha)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-500 truncate" title={formatTime(cita.hora_inicio || cita.hora)}>
                          {formatTime(cita.hora_inicio || cita.hora)}
                        </span>
                        {!isSolicitada && hasPermission("citas", "editar") && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setRescheduleModal({ isOpen: true, cita })}
                            className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors flex-shrink-0"
                            title="Reagendar cita"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top min-w-0">
                    <div className="space-y-3 min-w-0">
                      <div className="min-w-0">
                        {isSolicitada ? (
                          getStatusBadge(cita.estado)
                        ) : (
                          <StatusSelector
                            value={cita.id_estado_cita}
                            onChange={(newStatus) => onStatusChange(cita, newStatus)}
                            loading={loadingStatusChanges.has(cita.id)}
                            disabled={!hasPermission("citas", "editar")}
                            className="w-full max-w-[180px]"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <AgentAssignmentSection
                          cita={cita}
                          compact={true}
                          showHistory={true}
                          showEdit={true}
                          onAgentAssigned={(citaActualizada) => {
                            console.log('Cita actualizada:', citaActualizada);
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top min-w-0">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p
                          className="text-sm text-slate-900 break-words min-w-0"
                          style={twoLineClampStyle}
                          title={phone}
                        >
                          {phone}
                        </p>
                      </div>
                      <div className="flex items-start gap-1.5 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p
                          className="text-xs text-slate-500 break-words min-w-0"
                          style={twoLineClampStyle}
                          title={email}
                        >
                          {email}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {isSolicitada ? (
                        <>
                          <motion.button
                            key={`view-${cita.id}`}
                            disabled={!hasPermission("citas", "ver")}
                            whileHover={hasPermission("citas", "ver") ? { scale: 1.05 } : {}}
                            whileTap={hasPermission("citas", "ver") ? { scale: 0.95 } : {}}
                            onClick={() => hasPermission("citas", "ver") ? onView(cita) : null}
                            className={`p-1.5 rounded-lg transition-colors ${hasPermission("citas", "ver") ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
                            title={hasPermission("citas", "ver") ? "Ver detalles" : "No tienes permiso para ver"}
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            key={`accept-${cita.id}`}
                            disabled={!hasPermission("citas", "editar")}
                            whileHover={hasPermission("citas", "editar") ? { scale: 1.05 } : {}}
                            whileTap={hasPermission("citas", "editar") ? { scale: 0.95 } : {}}
                            onClick={() => hasPermission("citas", "editar") ? onAcceptAppointment(cita) : null}
                            className={`p-1.5 rounded-lg transition-colors ${hasPermission("citas", "editar") ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
                            title={hasPermission("citas", "editar") ? "Aceptar cita" : "No tienes permiso para aceptar"}
                          >
                            <Check className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            key={`reject-${cita.id}`}
                            disabled={!hasPermission("citas", "eliminar")}
                            whileHover={hasPermission("citas", "eliminar") ? { scale: 1.05 } : {}}
                            whileTap={hasPermission("citas", "eliminar") ? { scale: 0.95 } : {}}
                            onClick={() => hasPermission("citas", "eliminar") ? onRejectAppointment(cita) : null}
                            className={`p-1.5 rounded-lg transition-colors ${hasPermission("citas", "eliminar") ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
                            title={hasPermission("citas", "eliminar") ? "Cancelar cita" : "No tienes permiso para cancelar"}
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </>
                      ) : (
                        <>
                          <motion.button
                            key={`view-${cita.id}`}
                            disabled={!hasPermission("citas", "ver")}
                            whileHover={hasPermission("citas", "ver") ? { scale: 1.05 } : {}}
                            whileTap={hasPermission("citas", "ver") ? { scale: 0.95 } : {}}
                            onClick={() => hasPermission("citas", "ver") ? onView(cita) : null}
                            className={`p-1.5 rounded-lg transition-colors ${hasPermission("citas", "ver") ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
                            title={hasPermission("citas", "ver") ? "Ver detalles" : "No tienes permiso para ver"}
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            key={`edit-${cita.id}`}
                            disabled={!hasPermission("citas", "editar")}
                            whileHover={hasPermission("citas", "editar") ? { scale: 1.05 } : {}}
                            whileTap={hasPermission("citas", "editar") ? { scale: 0.95 } : {}}
                            onClick={() => hasPermission("citas", "editar") ? onEdit(cita) : null}
                            className={`p-1.5 rounded-lg transition-colors ${hasPermission("citas", "editar") ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
                            title={hasPermission("citas", "editar") ? "Editar cita" : "No tienes permiso para editar"}
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            key={`delete-${cita.id}`}
                            disabled={!hasPermission("citas", "eliminar")}
                            whileHover={hasPermission("citas", "eliminar") ? { scale: 1.05 } : {}}
                            whileTap={hasPermission("citas", "eliminar") ? { scale: 0.95 } : {}}
                            onClick={() => hasPermission("citas", "eliminar") ? onDelete(cita) : null}
                            className={`p-1.5 rounded-lg transition-colors ${hasPermission("citas", "eliminar") ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
                            title={hasPermission("citas", "eliminar") ? "Eliminar cita" : "No tienes permiso para eliminar"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden p-4">
        {citas.map((cita, index) => (
          <MobileAppointmentCard key={cita.id || `mobile-cita-${index}`} cita={cita} />
        ))}
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Página {currentPage} de {safeTotalPages}
          </div>
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage <= 1}
              className="p-2 text-slate-600 hover:bg-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>

            {totalPages > 1 && [...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              const isCurrentPage = page === currentPage;

              return (
                <motion.button
                  key={page}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${isCurrentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-white'
                    }`}
                >
                  {page}
                </motion.button>
              );
            })}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))}
              disabled={currentPage >= safeTotalPages}
              className="p-2 text-slate-600 hover:bg-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      <RescheduleAppointmentModal
        isOpen={rescheduleModal.isOpen}
        onClose={() => setRescheduleModal({ isOpen: false, cita: null })}
        cita={rescheduleModal.cita}
        onRescheduled={handleRescheduled}
      />
    </div>
  );
};

export default AppointmentTable;
