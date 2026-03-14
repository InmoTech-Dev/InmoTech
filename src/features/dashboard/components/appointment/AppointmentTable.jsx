import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Edit, Trash2, ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Phone, Mail, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { formatPhoneNumber } from '../../../../shared/utils/phoneFormatter';
import StatusSelector from '../../../../shared/components/ui/StatusSelector';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import AgentAssignmentSection from './AgentAssignmentSection';
import RescheduleAppointmentModal from './RescheduleAppointmentModal';
import citaApiService from '../../../../shared/services/citaApiService';

const clamp2 = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
};

const badgeConfig = {
  programada: ['bg-yellow-100', 'border-yellow-200', 'text-yellow-800', 'Programada'],
  confirmada: ['bg-green-100', 'border-green-200', 'text-green-800', 'Confirmada'],
  cancelada: ['bg-red-100', 'border-red-200', 'text-red-800', 'Cancelada'],
  completada: ['bg-purple-100', 'border-purple-200', 'text-purple-800', 'Completada'],
  're agendada': ['bg-orange-100', 'border-orange-200', 'text-orange-800', 'Re Agendada'],
  solicitada: ['bg-indigo-100', 'border-indigo-200', 'text-indigo-800', 'Solicitada']
};

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
  const { user, hasPermission } = useAuth();
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, cita: null });
  const safeTotalPages = Math.max(totalPages || 0, 1);

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      let date;
      if (value.includes('T')) {
        const parsed = new Date(value);
        date = new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
      } else if (value.includes('-')) {
        date = new Date(`${value}T00:00:00`);
      } else if (value.includes('/')) {
        const [day, month, year] = value.split('/');
        date = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`);
      } else {
        return value;
      }
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return value;
    }
  };

  const formatTime = (value) => {
    if (!value) return '-';
    try { return citaApiService.formatHoraDesdeAPI(value); } catch { return value || '-'; }
  };

  const pick = (items, fallback = '') => items.find(Boolean) || fallback;
  const getClientName = (cita) => pick([
    typeof cita.cliente === 'string' ? cita.cliente : '',
    cita.cliente?.nombre_completo && cita.cliente?.apellido_completo ? `${cita.cliente.nombre_completo} ${cita.cliente.apellido_completo}`.trim() : '',
    cita.nombre_completo && cita.apellido_completo ? `${cita.nombre_completo} ${cita.apellido_completo}`.trim() : '',
    cita.cliente?.correo
  ], 'Cliente');
  const getServiceName = (cita) => pick([typeof cita.servicio === 'string' ? cita.servicio : '', cita.servicio?.nombre_servicio], 'Servicio');
  const getPropertyName = (cita) => pick([typeof cita.propiedad === 'string' ? cita.propiedad : '', cita.propiedad?.titulo, cita.propiedad?.direccion, cita.inmueble?.direccion], 'Propiedad');
  const getPhone = (cita) => pick([cita.telefono, cita.cliente?.telefono, cita.cliente?.dataValues?.telefono], '-');
  const getEmail = (cita) => pick([cita.email, cita.cliente?.correo, cita.cliente?.email, cita.cliente?.dataValues?.correo, cita.cliente?.dataValues?.email], '-');
  const getDocumentType = (cita) => pick([cita.tipoDocumento, cita.tipo_documento, cita.cliente?.tipoDocumento, cita.cliente?.tipo_documento, cita.cliente?.dataValues?.tipoDocumento, cita.cliente?.dataValues?.tipo_documento]);
  const getDocumentNumber = (cita) => pick([cita.numeroDocumento, cita.numero_documento, cita.cliente?.numeroDocumento, cita.cliente?.numero_documento, cita.cliente?.dataValues?.numeroDocumento, cita.cliente?.dataValues?.numero_documento]);
  const getDateValue = (cita) => cita.fecha_cita || cita.fecha;
  const getTimeValue = (cita) => cita.hora_inicio || cita.hora;

  const hasConflict = (cita) => Boolean(
    user?.id && citas.some((candidate) => (
      candidate.id_agente_asignado === user.id &&
      (candidate.fecha_cita === getDateValue(cita) || candidate.fecha === getDateValue(cita)) &&
      (candidate.hora_inicio === getTimeValue(cita) || candidate.hora === getTimeValue(cita)) &&
      (candidate.id_estado_cita === 2 || candidate.id_estado_cita === 4) &&
      candidate.id !== cita.id &&
      candidate.id_cita !== cita.id_cita
    ))
  );

  const renderBadge = (estado, extra = '') => {
    const [bg, border, text, label] = badgeConfig[estado] || badgeConfig.programada;
    return <span className={`inline-flex max-w-full items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium truncate whitespace-nowrap ${bg} ${border} ${text} ${estado === 'cancelada' ? 'opacity-60' : ''} ${extra}`}>{label}</span>;
  };

  const renderStatus = (cita, extra = '') => (
    cita.estado === 'solicitada'
      ? renderBadge(cita.estado, extra)
      : (
        <StatusSelector
          value={cita.id_estado_cita}
          onChange={(next) => onStatusChange(cita, next)}
          loading={loadingStatusChanges.has(cita.id)}
          disabled={!hasPermission('citas', 'editar')}
          size="compact"
          className={extra}
        />
      )
  );

  const renderAction = (cfg, variant = 'icon') => (
    <motion.button
      key={cfg.key}
      disabled={!cfg.enabled}
      whileHover={cfg.enabled ? { scale: 1.05 } : {}}
      whileTap={cfg.enabled ? { scale: 0.95 } : {}}
      onClick={() => (cfg.enabled ? cfg.onClick() : null)}
      title={cfg.title}
      className={`flex items-center justify-center gap-2 rounded-lg transition-colors ${variant === 'icon' ? 'p-1.5' : 'min-w-[112px] flex-1 px-3 py-2 text-sm'} ${cfg.enabled ? cfg.active : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'}`}
    >
      <cfg.icon className={`h-4 w-4 ${cfg.iconClassName || ''}`.trim()} />
      {variant !== 'icon' && cfg.label}
    </motion.button>
  );

  const renderActions = (cita, conflict, variant = 'icon') => {
    const requested = cita.estado === 'solicitada';
    const actions = requested
      ? [
        { key: `view-${cita.id}`, enabled: hasPermission('citas', 'ver'), onClick: () => onView(cita), icon: Eye, label: 'Ver', title: hasPermission('citas', 'ver') ? 'Ver detalles' : 'No tienes permiso para ver', active: variant === 'icon' ? 'text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700' },
        { key: `accept-${cita.id}`, enabled: hasPermission('citas', 'editar') && !conflict, onClick: () => onAcceptAppointment(cita), icon: Check, iconClassName: conflict ? 'text-red-400' : '', label: 'Aceptar', title: !hasPermission('citas', 'editar') ? 'No tienes permiso para aceptar' : conflict ? 'Tienes otra cita confirmada en este horario' : 'Aceptar cita', active: variant === 'icon' ? 'text-green-600 hover:bg-green-50' : 'bg-green-600 text-white hover:bg-green-700' },
        { key: `reject-${cita.id}`, enabled: hasPermission('citas', 'eliminar'), onClick: () => onRejectAppointment(cita), icon: X, label: 'Cancelar', title: hasPermission('citas', 'eliminar') ? 'Cancelar cita' : 'No tienes permiso para cancelar', active: variant === 'icon' ? 'text-red-600 hover:bg-red-50' : 'bg-red-600 text-white hover:bg-red-700' }
      ]
      : [
        { key: `view-${cita.id}`, enabled: hasPermission('citas', 'ver'), onClick: () => onView(cita), icon: Eye, label: 'Ver', title: hasPermission('citas', 'ver') ? 'Ver detalles' : 'No tienes permiso para ver', active: variant === 'icon' ? 'text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700' },
        { key: `edit-${cita.id}`, enabled: hasPermission('citas', 'editar'), onClick: () => onEdit(cita), icon: Edit, label: 'Editar', title: hasPermission('citas', 'editar') ? 'Editar cita' : 'No tienes permiso para editar', active: variant === 'icon' ? 'text-blue-600 hover:bg-blue-50' : 'bg-slate-700 text-white hover:bg-slate-800' },
        { key: `delete-${cita.id}`, enabled: hasPermission('citas', 'eliminar'), onClick: () => onDelete(cita), icon: Trash2, label: 'Eliminar', title: hasPermission('citas', 'eliminar') ? 'Eliminar cita' : 'No tienes permiso para eliminar', active: variant === 'icon' ? 'text-red-600 hover:bg-red-50' : 'bg-red-600 text-white hover:bg-red-700' }
      ];
    return actions.map((action) => renderAction(action, variant));
  };

  const renderClientBlock = (cita) => {
    const documentInfo = [getDocumentType(cita), getDocumentNumber(cita)].filter(Boolean).join(' ') || '-';
    return (
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 break-words" style={clamp2} title={getClientName(cita)}>{getClientName(cita)}</p>
        <p className="mt-1 text-xs text-slate-500 break-words" style={clamp2} title={documentInfo}>{documentInfo}</p>
      </div>
    );
  };

  const renderServiceBlock = (cita) => (
    <div className="min-w-0">
      <p className="text-sm text-slate-900 break-words" style={clamp2} title={getServiceName(cita)}>{getServiceName(cita)}</p>
      <div className="mt-1 flex min-w-0 items-start gap-1.5">
        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
        <p className="min-w-0 break-words text-xs text-slate-500" style={clamp2} title={getPropertyName(cita)}>{getPropertyName(cita)}</p>
      </div>
    </div>
  );

  const renderDateTime = (cita) => (
    <div className="space-y-1.5 min-w-0">
      <div className="flex min-w-0 items-center gap-1.5 text-sm text-slate-900">
        <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
        <span className="truncate" title={formatDate(getDateValue(cita))}>{formatDate(getDateValue(cita))}</span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 text-sm text-slate-500">
        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
        <span className="truncate" title={formatTime(getTimeValue(cita))}>{formatTime(getTimeValue(cita))}</span>
        {cita.estado !== 'solicitada' && hasPermission('citas', 'editar') && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setRescheduleModal({ isOpen: true, cita })} className="flex-shrink-0 rounded p-1 text-orange-600 transition-colors hover:bg-orange-50" title="Reagendar cita">
            <RefreshCw className="h-3 w-3" />
          </motion.button>
        )}
      </div>
    </div>
  );

  const renderContact = (cita) => {
    const phone = formatPhoneNumber(getPhone(cita));
    const email = getEmail(cita);
    return (
      <div className="space-y-1.5 min-w-0">
        <div className="flex min-w-0 items-start gap-1.5">
          <Phone className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <p className="min-w-0 break-words text-sm text-slate-900" style={clamp2} title={phone}>{phone}</p>
        </div>
        <div className="flex min-w-0 items-start gap-1.5">
          <Mail className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <p className="min-w-0 break-words text-xs text-slate-500" style={clamp2} title={email}>{email}</p>
        </div>
      </div>
    );
  };

  const ResponsiveCard = ({ cita, compact = false }) => {
    const conflict = hasConflict(cita);
    const cancelled = cita.estado === 'cancelada';
    const requested = cita.estado === 'solicitada';
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${cancelled ? 'opacity-60' : ''} ${conflict ? 'border-l-4 border-l-red-500 shadow-red-50' : ''}`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              {renderClientBlock(cita)}
              {conflict && <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-red-600 sm:text-[11px]"><AlertCircle className="h-3 w-3" />CONFLICTO DE AGENTE EN ESTE HORARIO</p>}
            </div>
            <div className="w-full min-w-0 sm:w-auto sm:min-w-[140px] lg:w-[200px]">{renderStatus(cita, 'w-full')}</div>
          </div>
          <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Servicio / Inmueble</p>
              {renderServiceBlock(cita)}
            </div>
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fecha / Hora</p>
              {renderDateTime(cita)}
            </div>
            {!compact && (
              <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3 lg:col-span-2">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado / Agente</p>
                <AgentAssignmentSection cita={cita} allCitas={citas} compact={true} showHistory={true} showEdit={true} className="w-full" onAgentAssigned={(updated) => console.log('Cita actualizada:', updated)} />
              </div>
            )}
          </div>
          {compact && !requested && (
            <AgentAssignmentSection cita={cita} allCitas={citas} compact={true} showHistory={true} showEdit={true} className="w-full" onAgentAssigned={(updated) => console.log('Cita actualizada:', updated)} />
          )}
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contacto</p>
              {renderContact(cita)}
            </div>
            <div className="lg:max-w-[380px] lg:min-w-[300px]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Acciones</p>
              <div className="flex flex-wrap gap-2">{renderActions(cita, conflict, 'compact')}</div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl">
      {citas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">No hay citas para mostrar</h3>
            <p className="mt-2 text-sm text-slate-500">Ajusta los filtros o crea una nueva cita para ver resultados.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden min-h-0 flex-1 overflow-auto xl:block">
            <table className="w-full table-fixed">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="w-[18%] px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Cliente</th>
                  <th className="w-[20%] px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Servicio / Inmueble</th>
                  <th className="w-[16%] px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Fecha / Hora</th>
                  <th className="w-[23%] px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Estado / Agente</th>
                  <th className="w-[23%] px-4 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Contacto / Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {citas.map((cita, index) => {
                  const conflict = hasConflict(cita);
                  return (
                    <motion.tr key={cita.id || `cita-${index}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`transition-colors hover:bg-slate-50 ${cita.estado === 'cancelada' ? 'opacity-60' : ''}`}>
                      <td className="min-w-0 px-4 py-4 align-top">{renderClientBlock(cita)}</td>
                      <td className="min-w-0 px-4 py-4 align-top">{renderServiceBlock(cita)}</td>
                      <td className="min-w-0 px-4 py-4 align-top">{renderDateTime(cita)}</td>
                      <td className="min-w-0 px-4 py-4 align-top">
                        <div className="min-w-0 space-y-3">
                          <div className="min-w-0">{renderStatus(cita, 'w-full max-w-[180px]')}</div>
                          <AgentAssignmentSection cita={cita} allCitas={citas} compact={true} showHistory={true} showEdit={true} className="w-full" onAgentAssigned={(updated) => console.log('Cita actualizada:', updated)} />
                        </div>
                      </td>
                      <td className="min-w-0 px-4 py-4 align-top">
                        {renderContact(cita)}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">{renderActions(cita, conflict, 'icon')}</div>
                        {cita.estado === 'solicitada' && conflict && <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-red-600"><AlertCircle className="h-3 w-3" />Conflicto de horario</p>}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="hidden min-h-0 flex-1 overflow-y-auto p-4 md:block xl:hidden">
            <div className="space-y-3">{citas.map((cita) => <ResponsiveCard key={cita.id || `tablet-${getDateValue(cita)}-${getTimeValue(cita)}`} cita={cita} compact={false} />)}</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:hidden">
            <div className="space-y-3">{citas.map((cita) => <ResponsiveCard key={cita.id || `mobile-${getDateValue(cita)}-${getTimeValue(cita)}`} cita={cita} compact={true} />)}</div>
          </div>
        </>
      )}
      <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">Pagina {currentPage} de {safeTotalPages}</div>
          <div className="flex flex-wrap items-center gap-2">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onPageChange(Math.max(currentPage - 1, 1))} disabled={currentPage <= 1} className="rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></motion.button>
            {totalPages > 1 && [...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              return <motion.button key={page} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onPageChange(page)} className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors duration-200 ${page === currentPage ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-white'}`}>{page}</motion.button>;
            })}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))} disabled={currentPage >= safeTotalPages} className="rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"><ChevronRight className="h-4 w-4" /></motion.button>
          </div>
        </div>
      </div>
      <RescheduleAppointmentModal isOpen={rescheduleModal.isOpen} onClose={() => setRescheduleModal({ isOpen: false, cita: null })} cita={rescheduleModal.cita} onRescheduled={(updated) => console.log('Cita reagendada:', updated)} />
    </div>
  );
};

export default AppointmentTable;
