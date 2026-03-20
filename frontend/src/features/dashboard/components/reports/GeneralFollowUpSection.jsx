import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../shared/components/ui/button';
import { Textarea } from '../../../../shared/components/ui/textarea';
import { Badge } from '../../../../shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../../../shared/components/ui/select';
import {
  MessageSquare,
  Calendar,
  User,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';

const formatResponsableName = (responsable) => {
  if (!responsable) return 'Desconocido';
  if (typeof responsable === 'string') {
    return responsable.trim() || 'Desconocido';
  }
  const nombres = [
    responsable.nombre_completo,
    responsable.primer_nombre,
    responsable.segundo_nombre,
    responsable.nombre
  ].filter(Boolean);
  const apellidos = [
    responsable.apellido_completo,
    responsable.primer_apellido,
    responsable.segundo_apellido,
    responsable.apellido
  ].filter(Boolean);
  const nombreCompleto = [...nombres, ...apellidos].join(' ').trim();
  return nombreCompleto || responsable.email || responsable.correo || 'Desconocido';
};

const getResponsibleSortName = (responsable) => {
  if (!responsable) return '';
  if (typeof responsable === 'string') return responsable.toLowerCase();
  return formatResponsableName(responsable).toLowerCase();
};

function GeneralFollowUpSection({
  reportId,
  followUps,
  onAddFollowUp,
  onUpdateFollowUpStatus,
  currentUser,
  isEditing,
  newFollowUpNote,
  onNewFollowUpChange,
  isSubmitting
}) {
  const [showHistory, setShowHistory] = useState(true);
  const [filterBy, setFilterBy] = useState('all'); // all, date, responsible, pending, completed
  const [filteredFollowUps, setFilteredFollowUps] = useState(followUps);

  useEffect(() => {
    let filtered = [...followUps];

    switch (filterBy) {
      case 'date':
        filtered = filtered.sort((a, b) => new Date(b.fecha || b.fecha_creacion || 0) - new Date(a.fecha || a.fecha_creacion || 0));
        break;
      case 'responsible':
        filtered = filtered.sort(
          (a, b) =>
            getResponsibleSortName(a.responsable).localeCompare(getResponsibleSortName(b.responsable)) || 0
        );
        break;
      case 'pending':
        filtered = filtered.filter((f) => f.estado === 'Pendiente');
        break;
      case 'completed':
        filtered = filtered.filter((f) => f.estado === 'Completado');
        break;
      default:
        filtered = filtered.sort((a, b) => new Date(b.fecha || b.fecha_creacion || 0) - new Date(a.fecha || a.fecha_creacion || 0));
    }

    setFilteredFollowUps(filtered);
  }, [followUps, filterBy]);

  const getStatusIcon = (estado) => {
    switch (estado) {
      case 'Completado':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'En Proceso':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'Cancelado':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadgeColor = (estado) => {
    switch (estado) {
      case 'Completado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'En Proceso':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleSaveNote = () => {
    if (newFollowUpNote.trim() && onAddFollowUp) {
      onAddFollowUp(newFollowUpNote.trim(), 'Pendiente');
    }
  };

  const getFilterLabel = (value) => {
    switch (value) {
      case 'all':
        return 'Todos';
      case 'date':
        return 'Por fecha';
      case 'responsible':
        return 'Por responsable';
      case 'pending':
        return 'Pendientes';
      case 'completed':
        return 'Completados';
      default:
        return 'Todos';
    }
  };

  const normalizeEstado = (estado) => {
    const s = String(estado || '').toLowerCase().replace(/[\s_-]/g, '');
    if (s === 'pendiente') return 'Pendiente';
    if (s === 'enproceso') return 'En Proceso';
    if (s === 'completado') return 'Completado';
    if (s === 'cancelado') return 'Cancelado';
    return 'Pendiente';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Seguimiento General</h3>
            <p className="text-sm text-gray-600">Notas y seguimiento del progreso del reporte</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {followUps.length} {followUps.length === 1 ? 'nota' : 'notas'}
        </Badge>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center mb-3">
          <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-700">Nueva Nota de Seguimiento</h4>
        </div>

        <Textarea
          value={newFollowUpNote}
          onChange={(e) => onNewFollowUpChange && onNewFollowUpChange(e.target.value)}
          placeholder="Escriba una nueva nota de seguimiento general para este reporte..."
          rows={3}
          className="mb-3 resize-none"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
            <User className="w-3 h-3 mr-1" />
            <span>{currentUser ? formatResponsableName(currentUser) : 'Usuario actual'}</span>
            <Calendar className="w-3 h-3 ml-3 mr-1" />
            <span>{new Date().toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          </div>

          {isEditing && (
            <Button
              type="button"
              onClick={handleSaveNote}
              disabled={!newFollowUpNote.trim() || isSubmitting}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-2" />
                  Guardar Nota
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {followUps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {showHistory ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              Historial de Seguimientos ({followUps.length})
            </button>

            {showHistory && (
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger className="w-56 h-8 text-xs">
                    <span>{getFilterLabel(filterBy)}</span>
                  </SelectTrigger>
                  <SelectContent className="min-w-[220px]">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="date">Por fecha</SelectItem>
                    <SelectItem value="responsible">Por responsable</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="completed">Completados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {filteredFollowUps.length > 0 ? (
                  filteredFollowUps.map((followUp, index) =>
                    followUp ? (
                      <motion.div
                        key={followUp.id_seguimiento || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">{getStatusIcon(followUp.estado || '')}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {formatResponsableName(followUp.responsable) || 'Usuario desconocido'}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-2 py-0.5 ${getStatusBadgeColor(followUp.estado || '')}`}
                                >
                                  {followUp.estado || 'Desconocido'}
                                </Badge>
                              </div>
                              <div className="flex flex-col text-xs text-gray-500 space-y-1">
                                <div className="flex items-center">
                                  <span>{formatDate(followUp.fecha || followUp.fecha_creacion)}</span>
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  <span>Creado: {formatDate(followUp.fecha_creacion || followUp.fecha)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {followUp.descripcion || ''}
                        </div>

                        {isEditing &&
                          currentUser &&
                          (followUp.id_persona === currentUser.id_persona ||
                            followUp.id_responsable === currentUser.id_persona) && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">Cambiar estado:</span>
                                <Select
                                  value={normalizeEstado(followUp.estado)}
                                  onValueChange={(newStatus) =>
                                    onUpdateFollowUpStatus &&
                                    onUpdateFollowUpStatus(followUp.id_seguimiento, newStatus)
                                  }
                                >
                                  <SelectTrigger className="w-44 h-7 text-xs">
                                    <span>{normalizeEstado(followUp.estado)}</span>
                                  </SelectTrigger>
                                  <SelectContent className="min-w-[180px]">
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    <SelectItem value="En Proceso">En Proceso</SelectItem>
                                    <SelectItem value="Completado">Completado</SelectItem>
                                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                      </motion.div>
                    ) : null
                  )
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay seguimientos que coincidan con el filtro</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {followUps.length === 0 && (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium mb-1">Sin seguimientos registrados</p>
          <p className="text-xs">
            {isEditing
              ? 'Agregue la primera nota de seguimiento arriba'
              : 'No hay notas de seguimiento para este reporte'}
          </p>
        </div>
      )}
    </div>
  );
}

export default GeneralFollowUpSection;
