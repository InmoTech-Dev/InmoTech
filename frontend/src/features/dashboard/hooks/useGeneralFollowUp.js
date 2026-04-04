import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../shared/hooks/use-toast';
import reportesInmobiliariosService from '../services/reportesInmobiliarios.service';

export const useGeneralFollowUp = (reportId, currentUser) => {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  
  // Reemplazo: usar toasts estilo Citas
  const { toast } = useToast();

  // Cargar seguimientos al montar el componente
  useEffect(() => {
    if (reportId) {
      loadFollowUps();
    }
  }, [reportId]);

  // Cargar seguimientos desde la API
  const loadFollowUps = useCallback(async () => {
    if (!reportId) return;
    
    setLoading(true);
    try {
      const response = await reportesInmobiliariosService.obtenerHistorialSeguimientos(reportId);
      setFollowUps(response.data || []);
    } catch (err) {
      console.error('Error cargando seguimientos:', err);
      
      // Detect dev environment safely for Vite (import.meta.env.DEV) and CRA (process.env.NODE_ENV)
      const isDev =
        (typeof import.meta !== 'undefined' && import.meta.env?.DEV === true) ||
        ((typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'));

      if (isDev || err.statusCode === 404) {
        setFollowUps([
          {
            id_seguimiento: 1,
            id_reporte: reportId,
            descripcion: 'Se programó inspección inicial para el próximo lunes. Se contactará al propietario para coordinar acceso.',
            fecha: '2024-01-15T10:30:00Z',
            estado: 'Completado',
            id_responsable: 1,
            responsable: {
              id_persona: 1,
              primer_nombre: 'Juan',
              primer_apellido: 'Pérez'
            },
            fecha_creacion: '2024-01-15T10:30:00Z'
          },
          {
            id_seguimiento: 2,
            id_reporte: reportId,
            descripcion: 'Inspección realizada. Se encontraron problemas menores en la instalación eléctrica. Se requiere cotización de electricista.',
            fecha: '2024-01-16T14:15:00Z',
            estado: 'En Proceso',
            id_responsable: 1,
            responsable: {
              id_persona: 1,
              primer_nombre: 'Juan',
              primer_apellido: 'Pérez'
            },
            fecha_creacion: '2024-01-16T14:15:00Z'
          }
        ]);
      } else {
        toast({
          title: 'Error al cargar el historial',
          description: 'Error al cargar el historial de seguimientos',
          variant: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  // Agregar nuevo seguimiento
  const addFollowUp = useCallback(async (descripcion) => {
    if (!descripcion.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      let newFollowUp;
      
      if (reportId) {
        // Si el reporte ya existe, crear el seguimiento en la API
        const response = await reportesInmobiliariosService.crearSeguimiento(
          reportId, 
          descripcion.trim()
        );
        newFollowUp = response.data;
      } else {
        // Si es un reporte nuevo, crear un seguimiento temporal
        newFollowUp = {
          id_seguimiento: `temp_${Date.now()}`,
          id_reporte: reportId,
          descripcion: descripcion.trim(),
          fecha: new Date().toISOString(),
          estado: 'Pendiente',
          id_responsable: currentUser.id_persona,
          responsable: {
            id_persona: currentUser.id_persona,
            primer_nombre: currentUser.primer_nombre,
            primer_apellido: currentUser.primer_apellido
          },
          fecha_creacion: new Date().toISOString(),
          temporal: true // Marca para identificar seguimientos temporales
        };
      }
      
      setFollowUps(prev => [newFollowUp, ...prev]);
      setNewFollowUpNote('');
      toast({
        title: 'Seguimiento agregado',
        description: 'Nota de seguimiento agregada exitosamente',
        variant: 'success',
      });
    } catch (err) {
      console.error('Error creando seguimiento:', err);
      toast({
        title: 'Error al guardar seguimiento',
        description: 'Error al guardar la nota de seguimiento',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }, [reportId, currentUser]);

  // Actualizar estado de seguimiento
  const updateFollowUpStatus = useCallback(async (followUpId, newStatus) => {
    try {
      if (reportId && !followUpId.toString().startsWith('temp_')) {
        // Solo actualizar en la API si no es temporal
        await reportesInmobiliariosService.actualizarEstadoSeguimiento(
          reportId, 
          followUpId, 
          newStatus
        );
      }
      
      setFollowUps(prev => 
        prev.map(followUp => 
          followUp.id_seguimiento === followUpId 
            ? { ...followUp, estado: newStatus }
            : followUp
        )
      );
      toast({
        title: 'Estado actualizado',
        description: `El estado fue cambiado a ${newStatus}`,
        variant: 'success',
      });
    } catch (err) {
      console.error('Error actualizando estado:', err);
      toast({
        title: 'Error al actualizar estado',
        description: 'Error al actualizar el estado',
        variant: 'error',
      });
    }
  }, [reportId]);

  // Manejar cambio en la nueva nota
  const handleNewFollowUpChange = useCallback((value) => {
    setNewFollowUpNote(value);
  }, []);

  // Obtener seguimientos para enviar al backend (solo los temporales)
  const getTemporaryFollowUps = useCallback(() => {
    return followUps.filter(followUp => followUp.temporal);
  }, [followUps]);

  // Limpiar seguimientos temporales después de guardar el reporte
  const clearTemporaryFollowUps = useCallback(() => {
    setFollowUps(prev => prev.filter(followUp => !followUp.temporal));
    setNewFollowUpNote('');
  }, []);

  return {
    followUps,
    loading,
    submitting,
    newFollowUpNote,
    addFollowUp,
    updateFollowUpStatus,
    handleNewFollowUpChange,
    refreshFollowUps: loadFollowUps,
    getTemporaryFollowUps,
    clearTemporaryFollowUps
  };
};