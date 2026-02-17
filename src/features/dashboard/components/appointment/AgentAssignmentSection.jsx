import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Edit3, Check, X, MessageSquare, AlertCircle, Clock, RotateCcw, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../shared/components/ui/select';
import citaApiService from '../../../../shared/services/citaApiService';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { useToast } from '../../../../shared/hooks/use-toast';


const AgentAssignmentSection = ({
  cita,
  onAgentAssigned,
  className = "",
  compact = false,
  showHistory = false,
  showEdit = false
}) => {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentesDisponibles, setAgentesDisponibles] = useState([]);
  const [loadingAgentes, setLoadingAgentes] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historial, setHistorial] = useState([]);


  const agenteActual = cita.agente;


  const [agenteMostrado, setAgenteMostrado] = useState(cita.agente || null);

  useEffect(() => {
    setAgenteMostrado(cita.agente || null);
  }, [cita?.agente, cita?.id]);


  // Cargar agentes disponibles al editar
  useEffect(() => {
    if (isEditing) {
      cargarAgentesDisponibles();
    }
  }, [isEditing]);

  // Seleccionar agente actual cuando est   disponible en la lista
  useEffect(() => {
    if (isEditing && agenteMostrado && agentesDisponibles.length > 0) {
      const actualEnLista = agentesDisponibles.find(
        (agente) => agente.id_persona === agenteMostrado.id_persona
      );
      setSelectedAgent(actualEnLista || null);
    }
  }, [isEditing, agenteMostrado, agentesDisponibles]);


  const cargarAgentesDisponibles = async () => {
    setLoadingAgentes(true);
    try {
      const agentes = await citaApiService.obtenerAgentesDisponibles();
      const ordenados = [...agentes].sort((a, b) =>
        (a.nombre_completo || '').localeCompare(b.nombre_completo || '', 'es', { sensitivity: 'base' })
      );
      setAgentesDisponibles(ordenados);

      if (agenteMostrado) {
        const agenteEnLista = ordenados.find(
          (agente) => agente.id_persona === (agenteMostrado.id_persona || agenteMostrado.id)
        );
        setSelectedAgent(agenteEnLista || null);
      }
    } catch (error) {
      console.error('Error cargando agentes:', error);
      alert('Error al cargar agentes disponibles');
    } finally {
      setLoadingAgentes(false);
    }
  };

  
 const cargarHistorial = async () => {
  try {
   const hist = await citaApiService.obtenerHistorialAsignaciones(cita.id);
   setHistorial(hist);
  } catch (error) {
   console.error('Error cargando historial:', error);
   alert('Error al cargar historial de asignaciones');
  }
 };


  const handleAsignarAgente = async () => {
    if (!selectedAgent) {
      toast({
        title: 'Selecciona un agente',
        description: 'Debes elegir un agente para continuar',
        variant: 'destructive'
      });
      return;
    }

    // Validar comentario si es reasignaci  n
    if (agenteMostrado && !comentario.trim()) {
      toast({
        title: 'Motivo requerido',
        description: 'Debes ingresar el motivo cuando reasignas un agente',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const citaActualizada = await citaApiService.asignarAgente(
        cita.id,
        selectedAgent.id_persona,
        comentario.trim(),
        comentario.trim()
      );

      toast({
        title: agenteMostrado ? 'Agente reasignado' : 'Agente asignado',
        description: `${selectedAgent.nombre_completo} atendera esta cita`,
        variant: 'success'
      });

      // Refrescar agente en UI inmediatamente
      setAgenteMostrado({ ...selectedAgent });

      // Reset form
      setIsEditing(false);
      setSelectedAgent(null);
      setComentario('');

      // Notificar cambio
      if (onAgentAssigned) {
        onAgentAssigned(citaActualizada);
      }
    } catch (error) {
      console.error('Error asignando agente:', error);
      alert(error.message || 'Error al asignar agente');
    } finally {
      setLoading(false);
    }
  };


 const handleCancelar = () => {
  setIsEditing(false);
  setSelectedAgent(null);
  setComentario('');
 };


 const handleShowHistory = () => {
  if (historial.length === 0) {
   cargarHistorial();
  }
  setShowHistoryModal(true);
 };


 const formatFecha = (fecha) => {
  return new Date(fecha).toLocaleString('es-ES', {
   day: 'numeric',
   month: 'short',
   year: 'numeric',
   hour: '2-digit',
   minute: '2-digit'
  });
 };


 const getEstadoColor = (estado) => {
  switch (estado) {
   case 'Activa': return 'bg-green-100 text-green-800 border-green-200';
   case 'Reasignada': return 'bg-orange-100 text-orange-800 border-orange-200';
   case 'Cancelada': return 'bg-red-100 text-red-800 border-red-200';
   default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
 };


 if (compact) {
  return (
   <div className={`relative ${className}`}>
    {agenteMostrado ? (
     <div className="relative">
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg pr-8">
       <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
       <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 truncate">
         {agenteMostrado.nombre_completo || agenteMostrado.apellido_completo || 'Agente asignado'}
        </p>
        <div className="flex items-center gap-2">
         <p className="text-xs text-blue-600">Agente asignado</p>
         {showHistory && historial.length > 1 && (
          <button
           onClick={handleShowHistory}
           className="text-blue-600 hover:bg-blue-100 rounded p-0.5 transition-colors"
           title="Ver historial de asignaciones"
          >
           <Clock className="w-3 h-3" />
          </button>
         )}
        </div>
       </div>
      </div>
      {showEdit && hasPermission("citas", "editar") && (
       <button
        onClick={() => setIsEditing(true)}
        className="absolute -top-1 -right-1 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md"
        title="Reasignar agente"
       >
        <Edit3 className="w-3 h-3" />
       </button>
      )}
     </div>
    ) : (
     <div className="relative">
      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg pr-8">
       <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
       <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">Sin agente asignado</p>
        <p className="text-xs text-amber-600 truncate">Asigna un agente para continuar</p>
       </div>
      </div>
          {showEdit && hasPermission("citas", "editar") && cita.estado !== 'solicitada' && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute -top-1 -right-1 p-1.5 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors shadow-md"
              title="Asignar agente"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          )}
     </div>
    )}


{/* Modal de edici  n en modo compacto */}
{isEditing && ReactDOM.createPortal(
  <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsEditing(false)}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {agenteMostrado ? 'Reasignar Agente' : 'Asignar Agente'}
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsEditing(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>


        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Agente
            </label>
            {loadingAgentes ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <Users className="w-5 h-5 text-gray-400 animate-spin" />
                <span className="text-sm text-gray-500">Cargando agentes...</span>
              </div>
            ) : (
              <Select
                value={selectedAgent ? String(selectedAgent.id_persona) : ''}
                onValueChange={(value) => {
                  const agent = agentesDisponibles.find(a => String(a.id_persona) === value);
                  setSelectedAgent(agent || null);
                }}
                disabled={agentesDisponibles.length === 0}
              >
                <SelectTrigger className="w-full">
                  {selectedAgent ? (
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {selectedAgent.nombre_completo}
                        </div>
                        {selectedAgent.email && (
                          <div className="text-xs text-gray-500 truncate">
                            {selectedAgent.email}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <SelectValue placeholder="Seleccionar agente..." />
                  )}
                </SelectTrigger>
                <SelectContent className="z-[10000] max-h-96 overflow-y-auto">
                  {agentesDisponibles.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      No hay agentes con modulo de citas habilitado
                    </div>
                  ) : (
                    agentesDisponibles.map((agente) => (
                      <SelectItem key={agente.id_persona} value={String(agente.id_persona)}>
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {agente.nombre_completo}
                            </div>
                            {agente.email && (
                              <div className="text-xs text-gray-500 truncate">
                                {agente.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>


          {agenteMostrado && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Motivo de reagendamiento del agente <span className="text-red-500">*</span>
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Explica por qu   se est   reasignando este agente..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          )}


          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleAsignarAgente}
              disabled={loading || !selectedAgent || (agenteMostrado && !comentario.trim())}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {agenteMostrado ? 'Reasignar' : 'Asignar'}
                </>
              )}
            </button>


            <button
              onClick={handleCancelar}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>,
  document.body
)}


{/* Modal de historial */}
{showHistoryModal && ReactDOM.createPortal(
  <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowHistoryModal(false)}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full h-[95vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Historial de Asignaciones</h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowHistoryModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>


        <div className="p-6 max-h-[400px] overflow-y-auto">
          {historial.map((entry) => (
            <div key={entry.id_historial} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {entry.agente_nuevo.nombre_completo}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEstadoColor(entry.estado_asignacion)}`}>
                  {entry.estado_asignacion}
                </span>
              </div>


              {entry.agente_anterior && (
                <div className="text-xs text-gray-600 mb-2">
                  Anterior: {entry.agente_anterior.nombre_completo}
                </div>
              )}


              {entry.comentario && (
                <div className="mt-2 p-2 bg-white rounded border text-sm text-gray-700">
                  "{entry.comentario}"
                </div>
              )}


              <div className="text-xs text-gray-500 mt-2">
                {formatFecha(entry.fecha_asignacion)}
                {entry.usuario_realizo && (
                  <>
                    {"    "}Por: {entry.usuario_realizo.nombre_completo}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </AnimatePresence>,
  document.body
)}
   </div>
  );
 }


 return (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
   <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
     <User className="w-5 h-5" />
     Agente Asignado
    </h3>


    {!isEditing && (
     <div className="flex items-center gap-2">
      {showHistory && historial.length > 1 && (
       <button
        onClick={handleShowHistory}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="Ver historial de asignaciones"
       >
        <RotateCcw className="w-4 h-4" />
       </button>
      )}
          {hasPermission("citas", "editar") && (!agenteMostrado || cita.estado !== 'solicitada') && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Edit3 className="w-4 h-4" />
              {agenteMostrado ? 'Reasignar' : 'Asignar Agente'}
            </button>
          )}
     </div>
    )}
   </div>


   {!isEditing ? (
    <div className="space-y-4">
     {agenteMostrado ? (
      <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
       <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
        <User className="w-6 h-6 text-green-600" />
       </div>
       <div className="flex-1">
        <h4 className="text-lg font-medium text-green-900">
         {agenteMostrado.nombre_completo || agenteMostrado.apellido_completo || 'Agente asignado'}
        </h4>
        <p className="text-sm text-green-600">
         Agente asignado a esta cita
        </p>
       </div>
       <Check className="w-6 h-6 text-green-600" />
      </div>
     ) : (
      <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
       <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-amber-600" />
       </div>
       <div className="flex-1">
        <h4 className="text-lg font-medium text-amber-900">Sin agente asignado</h4>
        <p className="text-sm text-amber-600">
         Asigna un agente para continuar con esta cita
        </p>
       </div>
      </div>
     )}
    </div>
   ) : (
    <div className="space-y-4">
     <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
       Seleccionar Agente
      </label>
{loadingAgentes ? (
  <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
    <Users className="w-5 h-5 text-gray-400 animate-spin" />
    <span className="text-sm text-gray-500">Cargando agentes...</span>
  </div>
) : (
  <Select
    value={selectedAgent ? String(selectedAgent.id_persona) : ''}
    onValueChange={(value) => {
      const agent = agentesDisponibles.find(a => String(a.id_persona) === value);
      setSelectedAgent(agent || null);
    }}
    disabled={agentesDisponibles.length === 0}
  >
    <SelectTrigger className="w-full">
      <SelectValue placeholder="Seleccionar agente...">
        {selectedAgent?.nombre_completo}
      </SelectValue>
    </SelectTrigger>
                <SelectContent className="z-[10000] max-h-96 overflow-y-auto">
                  {agentesDisponibles.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      No hay agentes con modulo de citas habilitado
                    </div>
                  ) : (
                    agentesDisponibles.map((agente) => (
                      <SelectItem key={agente.id_persona} value={String(agente.id_persona)} className="!p-0">
                        <div className="flex items-center gap-3 py-2 px-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {agente.nombre_completo}
                            </div>
                            {agente.email && (
                              <div className="text-xs text-gray-500 truncate">
                                {agente.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
  </Select>
)}
      </div>


     {agenteMostrado && (
      <div>
       <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Motivo de reagendamiento del agente <span className="text-red-500">*</span>
       </label>
       <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Explica por qu   se est   reasignando este agente..."
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        required
       />
       <p className="mt-1 text-xs text-gray-500">
        Este comentario se guardar   en el historial de asignaciones
       </p>
      </div>
     )}


     <div className="flex items-center gap-3 pt-4">
      <button
       onClick={handleAsignarAgente}
       disabled={loading || !selectedAgent || (agenteMostrado && !comentario.trim())}
       className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
       {loading ? (
        <>
         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
         Asignando...
        </>
       ) : (
        <>
         <Check className="w-4 h-4" />
         {agenteMostrado ? 'Reasignar' : 'Asignar'}
        </>
       )}
      </button>


      <button
       onClick={handleCancelar}
       disabled={loading}
       className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
       <X className="w-4 h-4" />
       Cancelar
      </button>
     </div>
    </div>
   )}


{/* Modal de historial */}
{showHistoryModal && ReactDOM.createPortal(
  <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowHistoryModal(false)}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Historial de Asignaciones</h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowHistoryModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Historial completo de asignaciones para la cita #{cita.id}
          </p>
        </div>


        <div className="p-6 max-h-[400px] overflow-y-auto">
          <div className="space-y-4">
            {historial.map((entry) => (
              <div key={entry.id_historial} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {entry.agente_nuevo.nombre_completo}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEstadoColor(entry.estado_asignacion)}`}>
                          {entry.estado_asignacion}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{formatFecha(entry.fecha_asignacion)}</p>
                    </div>
                  </div>
                </div>


                {entry.agente_anterior && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowRight className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-900">Agente anterior removido</span>
                    </div>
                    <p className="text-sm text-red-800">{entry.agente_anterior.nombre_completo}</p>
                  </div>
                )}


                {entry.comentario && (
                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">"{entry.comentario}"</p>
                        {entry.usuario_realizo && (
                          <p className="text-xs text-gray-500 mt-1">
                            Realizado por: {entry.usuario_realizo.nombre_completo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>,
  document.body
)}
  </div>
 );
};


export default AgentAssignmentSection;





