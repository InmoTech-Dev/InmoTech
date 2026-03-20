import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import administrativosApiService from '../services/administrativosApiService';
import { useToast } from '../hooks/use-toast';
import { useAuth } from './AuthContext';
import sseService from '../services/sseService';

const AdministrativosContext = createContext();

export const useAdministrativos = () => {
  const context = useContext(AdministrativosContext);
  if (!context) {
    throw new Error('useAdministrativos debe ser usado dentro de un AdministrativosProvider');
  }
  return context;
};

export const AdministrativosProvider = ({ children }) => {
  const [administrativos, setAdministrativos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const getAdministrativoId = useCallback(
    (admin) => admin?.id_administrativo ?? admin?.administrativo?.id_administrativo ?? null,
    []
  );

  // Cargar administrativos
  const loadAdministrativos = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await administrativosApiService.getAdministrativos(params);
      const administrativosResponse = response?.data?.data?.administrativos
        || response?.data?.administrativos
        || response?.administrativos
        || [];
      setAdministrativos(Array.isArray(administrativosResponse) ? administrativosResponse.filter(Boolean) : []);
    } catch (err) {
      setError(err.message || 'Error al cargar administrativos');
      toast({
        title: "Error",
        description: "No se pudieron cargar los administrativos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Agregar administrativo
  const addAdministrativo = useCallback((nuevoAdministrativo) => {
    if (!nuevoAdministrativo || typeof nuevoAdministrativo !== 'object') {
      return;
    }
    setAdministrativos(prev => [...prev, nuevoAdministrativo]);
  }, []);

  // Actualizar administrativo
  const updateAdministrativo = useCallback((administrativoActualizado) => {
    const idActualizado = getAdministrativoId(administrativoActualizado);
    if (!idActualizado) {
      return;
    }

    setAdministrativos(prev =>
      prev.map(admin =>
        getAdministrativoId(admin) === idActualizado
          ? administrativoActualizado
          : admin
      )
    );
  }, [getAdministrativoId]);

  // Eliminar administrativo
  const deleteAdministrativo = useCallback((id) => {
    setAdministrativos(prev =>
      prev.filter(admin => getAdministrativoId(admin) !== id)
    );
  }, [getAdministrativoId]);

  // Cambiar estado de administrativo
  const changeEstadoAdministrativo = useCallback(async (id, nuevoEstado, fechaRetiro = null) => {
    try {
      const estadoData = { estado_laboral: nuevoEstado };
      if (fechaRetiro) {
        estadoData.fecha_retiro = fechaRetiro;
      }

      await administrativosApiService.cambiarEstadoAdministrativo(id, estadoData);

      // Actualizar el estado local
      setAdministrativos(prev =>
        prev.map(admin =>
          getAdministrativoId(admin) === id
            ? { ...admin, estado_laboral: nuevoEstado, fecha_retiro: fechaRetiro }
            : admin
        )
      );

      return true;
    } catch (error) {
      console.error('Error cambiando estado:', error);
      throw error;
    }
  }, [getAdministrativoId]);

  // Crear administrativo
  const createAdministrativo = useCallback(async (adminData) => {
    try {
      const response = await administrativosApiService.createAdministrativo(adminData);
      const nuevoAdmin = response?.data?.data || response?.data || response;

      // Agregar a la lista local
      addAdministrativo(nuevoAdmin);

      toast({
        title: "¡Éxito!",
        description: "Administrativo creado correctamente",
        variant: "default"
      });

      return nuevoAdmin;
    } catch (error) {
      console.error('Error creando administrativo:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Error al crear administrativo",
        variant: "destructive"
      });
      throw error;
    }
  }, [addAdministrativo, toast]);

  // Actualizar administrativo completo
  const updateAdministrativoComplete = useCallback(async (id, adminData) => {
    try {
      const response = await administrativosApiService.updateAdministrativo(id, adminData);
      const adminActualizado = response?.data?.data || response?.data || response;

      // Actualizar en la lista local
      updateAdministrativo(adminActualizado);

      toast({
        title: "¡Éxito!",
        description: "Administrativo actualizado correctamente",
        variant: "default"
      });

      return adminActualizado;
    } catch (error) {
      console.error('Error actualizando administrativo:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Error al actualizar administrativo",
        variant: "destructive"
      });
      throw error;
    }
  }, [updateAdministrativo, toast]);

  // Eliminar administrativo
  const removeAdministrativo = useCallback(async (id) => {
    try {
      await administrativosApiService.deleteAdministrativo(id);

      // Remover de la lista local
      deleteAdministrativo(id);

      toast({
        title: "¡Éxito!",
        description: "Administrativo eliminado correctamente",
        variant: "default"
      });

      return true;
    } catch (error) {
      console.error('Error eliminando administrativo:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Error al eliminar administrativo",
        variant: "destructive"
      });
      throw error;
    }
  }, [deleteAdministrativo, toast]);

  // Obtener administrativo por ID
  const getAdministrativoById = useCallback(async (id) => {
    try {
      const response = await administrativosApiService.getAdministrativoById(id);
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo administrativo:', error);
      throw error;
    }
  }, []);

  // Cargar datos iniciales solo si hay autenticación y roles adecuados
  useEffect(() => {
    // Solo cargar si está autenticado y tiene rol Super Administrador o Administrador
    const hasRequiredRole = user?.roles?.some(role => ['Super Administrador', 'Administrador'].includes(role));
    if (isAuthenticated && hasRequiredRole) {
      loadAdministrativos();
    } else {
      setLoading(false);
    }
  }, [loadAdministrativos, isAuthenticated, user]);

  // Escuchar cambios en tiempo real vía SSE
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUserChanged = (data) => {
      console.log('Realtime: User change detected in AdministrativosContext', data);
      // Recargar la lista de administrativos para reflejar cambios de estado o rol
      loadAdministrativos();
    };

    const unsubscribe = sseService.on('user.changed', handleUserChanged);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated, loadAdministrativos]);

  const value = {
    administrativos,
    loading,
    error,
    loadAdministrativos,
    addAdministrativo,
    updateAdministrativo,
    deleteAdministrativo,
    changeEstadoAdministrativo,
    createAdministrativo,
    updateAdministrativoComplete,
    removeAdministrativo,
    getAdministrativoById
  };

  return (
    <AdministrativosContext.Provider value={value}>
      {children}
    </AdministrativosContext.Provider>
  );
};
