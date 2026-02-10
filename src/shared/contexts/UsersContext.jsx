import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import usersApiService from '../services/usersApiService';
import invitacionApiService from '../services/invitacionApiService';
import authService from '../services/authService';
import { useToast } from '../hooks/use-toast';
import { useAuth } from './AuthContext';

const UsersContext = createContext();

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers debe ser usado dentro de un UsersProvider');
  }
  return context;
};

export const UsersProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingInvites, setLoadingInvites] = useState(new Set());
  const { toast } = useToast();
  const { isAuthenticated, hasRole } = useAuth();

  const computeInvitacionEstado = useCallback((user) => {
    if (!user) return 'Cuenta activa';
    if (user.estado === false) return 'Cuenta deshabilitada';
    const correoVerificado = user.correo_verificado ?? user.tiene_cuenta ?? false;
    if (correoVerificado === false) return 'Verificacion de correo pendiente';
    if (user.tiene_cuenta === false) return 'Pendiente de activacion (sin contrasena)';
    return 'Cuenta activa';
  }, []);

  // Cargar usuarios
  const loadUsers = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApiService.getUsers(params);
      setUsers((response.data.personas || []).filter(Boolean));
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios');
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Agregar usuario
  const addUser = useCallback((nuevoUser) => {
    setUsers(prev => [nuevoUser, ...prev]);
  }, []);

  // Actualizar usuario
  const updateUser = useCallback((userActualizado) => {
    if (!userActualizado || !userActualizado.id_persona) {
      console.error('updateUser: userActualizado invalido', userActualizado);
      return;
    }
    setUsers(prev =>
      prev.map(userItem =>
        userItem?.id_persona === userActualizado.id_persona
          ? userActualizado
          : userItem
      ).filter(Boolean)
    );
  }, []);

  // Eliminar usuario
  const deleteUser = useCallback((id) => {
    setUsers(prev =>
      prev.filter(userItem => userItem?.id_persona !== id)
    );
  }, []);

  // Cambiar estado de usuario
  const changeUserStatus = useCallback(async (id, nuevoEstado) => {
    try {
      const estadoData = { estado: nuevoEstado };
      await usersApiService.changeUserStatus(id, estadoData);

      setUsers(prev =>
        prev.map(userItem =>
          userItem?.id_persona === id
            ? { ...userItem, estado: nuevoEstado }
            : userItem
        ).filter(Boolean)
      );

      return true;
    } catch (error) {
      console.error('Error cambiando estado:', error);
      throw error;
    }
  }, []);

  // Crear usuario
  const createUser = useCallback(async (userData) => {
    try {
      console.log('👤 USERS CONTEXT: Creando usuario con datos:', userData);

      const sanitizedUserData = {
        ...userData,
        nombre_completo: userData.nombre_completo?.trim() || '',
        apellido_completo: userData.apellido_completo?.trim() || '',
        correo: userData.correo?.trim() || userData.email?.trim() || '',
        telefono: userData.telefono?.trim() || userData.phone?.trim() || '',
        tipo_documento: userData.tipo_documento?.trim() || '',
        numero_documento: userData.numero_documento?.trim() || ''
      };

      console.log('👤 USERS CONTEXT: Datos sanitizados antes de enviar:', sanitizedUserData);

      const response = await usersApiService.createUser(sanitizedUserData);
      const userFromResponse = response.data?.user || response.data;

      console.log('👤 USERS CONTEXT: Usuario creado en BD:', userFromResponse);

      const hasPassword = Boolean((sanitizedUserData.password || '').trim());
      const tieneCuenta = userFromResponse.tiene_cuenta !== undefined ? userFromResponse.tiene_cuenta : hasPassword;
      const correoVerificado = userFromResponse.correo_verificado !== undefined ? userFromResponse.correo_verificado : hasPassword;

      const invitacionEstado = userFromResponse.estado === false
        ? 'Cuenta deshabilitada'
        : correoVerificado === false
          ? 'Verificacion de correo pendiente'
          : tieneCuenta === false
            ? 'Pendiente de activacion (sin contrasena)'
            : 'Cuenta activa';

      const userWithEstado = {
        id_persona: userFromResponse.id_persona,
        estado: true,
        tiene_cuenta: tieneCuenta,
        correo_verificado: correoVerificado,
        invitacion_estado: invitacionEstado,
        nombre_completo: (userFromResponse.nombre_completo !== 'undefined' ? userFromResponse.nombre_completo : '') || sanitizedUserData.nombre_completo,
        apellido_completo: (userFromResponse.apellido_completo !== 'undefined' ? userFromResponse.apellido_completo : '') || sanitizedUserData.apellido_completo,
        correo: userFromResponse.correo || userFromResponse.email || sanitizedUserData.correo,
        telefono: userFromResponse.telefono || sanitizedUserData.telefono,
        tipo_documento: userFromResponse.tipo_documento || sanitizedUserData.tipo_documento,
        numero_documento: userFromResponse.numero_documento || sanitizedUserData.numero_documento,
        fecha_registro: userFromResponse.fecha_registro || new Date().toISOString()
      };

      console.log('👤 USERS CONTEXT: Agregando usuario al estado local:', userWithEstado);
      addUser(userWithEstado);

      toast({
        title: "✅ Éxito!",
        description: "Usuario creado correctamente",
        variant: "default"
      });

      return userWithEstado;
    } catch (error) {
      console.error('Error creando usuario:', error);

      let errorMessage = "Error al crear usuario";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.map(err => err.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  }, [addUser, toast]);

  const updateUserComplete = useCallback(async (id, userData) => {
    try {
      const response = await usersApiService.updateUser(id, userData);
      const userActualizado = response.data.data || response.data;

      console.log('updateUserComplete: response.data', response.data);
      console.log('updateUserComplete: userActualizado', userActualizado);

      if (userActualizado && userActualizado.id_persona) {
        const previo = Array.isArray(users) ? users.find(u => u?.id_persona === id) : null;
        const merged = {
          ...previo,
          ...userActualizado
        };

        const correoCambio = previo?.correo && userActualizado?.correo &&
          previo.correo.toLowerCase() !== userActualizado.correo.toLowerCase();

        merged.estado = userActualizado.estado ?? previo?.estado ?? merged.estado ?? true;
        merged.correo_verificado = correoCambio ? false : (userActualizado.correo_verificado ?? previo?.correo_verificado ?? merged.correo_verificado ?? false);
        merged.tiene_cuenta = userActualizado.tiene_cuenta ?? previo?.tiene_cuenta ?? merged.tiene_cuenta ?? true;
        merged.invitacion_estado = computeInvitacionEstado(merged);

        updateUser(merged);
      } else {
        console.warn('Usuario actualizado no valido, recargando lista...');
        loadUsers();
      }

      toast({
        title: "✅ Éxito!",
        description: "Usuario actualizado correctamente",
        variant: "default"
      });

      return userActualizado;
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Error al actualizar usuario",
        variant: "destructive"
      });
      throw error;
    }
  }, [updateUser, loadUsers, toast, users, computeInvitacionEstado]);

  const removeUser = useCallback(async (id) => {
    try {
      await usersApiService.deleteUser(id);
      deleteUser(id);

      toast({
        title: "✅ Éxito!",
        description: "Usuario eliminado correctamente",
        variant: "default"
      });

      return true;
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Error al eliminar usuario",
        variant: "destructive"
      });
      throw error;
    }
  }, [deleteUser, toast]);

  const getUserById = useCallback(async (id) => {
    try {
      const response = await usersApiService.getUserById(id);
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }, []);

  // Reenviar invitacion/activacion
  const resendInvitation = useCallback(async (user) => {
    if (!user?.id_persona) return false;
    setLoadingInvites(prev => {
      const next = new Set(prev);
      next.add(user.id_persona);
      return next;
    });
    try {
      // Para cuentas con correo sin verificar, usa el flujo de verificación de correo
      if (user.correo && user.correo_verificado === false) {
        await authService.resendVerificationCode(user.correo);
      } else {
        await invitacionApiService.crearInvitacion(user.id_persona);
      }
      setUsers(prev => prev.map(u => {
        if (u?.id_persona === user.id_persona) {
          return {
            ...u,
            invitacion_estado: 'Verificacion de correo pendiente',
            correo_verificado: u.correo_verificado ?? false,
            tiene_cuenta: u.tiene_cuenta ?? false
          };
        }
        return u;
      }));
      toast({
        title: 'Invitacion reenviada',
        description: `Se envio un nuevo correo a ${user.correo || 'el usuario'}.`,
        variant: 'default'
      });
      return true;
    } catch (error) {
      console.error('Error reenviando invitacion:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'No se pudo reenviar la invitacion',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoadingInvites(prev => {
        const next = new Set(prev);
        next.delete(user.id_persona);
        return next;
      });
    }
  }, [toast]);

  useEffect(() => {
    const isAdminRole = hasRole(['Super Administrador', 'Administrador']);
    const canReadUsers = isAdminRole;

    if (isAuthenticated && canReadUsers) {
      loadUsers();
    } else {
      setLoading(false);
      if (!canReadUsers) {
        setUsers([]);
        setError(null);
      }
    }
  }, [loadUsers, isAuthenticated, hasRole]);

  const value = {
    users,
    loading,
    error,
    loadingInvites,
    loadUsers,
    addUser,
    updateUser,
    deleteUser,
    changeUserStatus,
    createUser,
    updateUserComplete,
    removeUser,
    getUserById,
    resendInvitation
  };

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
};
