import React, { useState, useEffect } from 'react';
import { Label } from '../../../../../shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../../../../shared/components/ui/select';
import rolesApiService from '../../../../../shared/services/rolesApiService';

const RoleStep = ({ formData, errors, updateFormData }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const all = await rolesApiService.obtenerRoles();
        const excluidos = ['Super Administrador', 'Administrador', 'Usuario', 'Propietario'];
        const filtrados = all
          .filter((rol) => !excluidos.includes(rol.nombre_rol))
          .sort((a, b) => (a.nombre_rol || '').localeCompare(b.nombre_rol || ''));
        setRoles(filtrados);
      } catch (error) {
        console.error('Error cargando roles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const selectedRole = roles.find((role) => (role.id_rol || role.id).toString() === formData.rol);
  const selectedRoleName = selectedRole?.nombre_rol || formData.rolNombre || '';

  const handleRoleChange = (selectedId) => {
    const matchedRole = roles.find((role) => (role.id_rol || role.id).toString() === selectedId);
    updateFormData('rol', selectedId);
    updateFormData('rolNombre', matchedRole?.nombre_rol || '');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-800">Rol Administrativo</h3>
        <p className="text-slate-600 text-sm">Selecciona el rol que tendra este administrativo en el sistema</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rol" className="text-sm font-medium text-slate-700">
          Rol Administrativo *
        </Label>
        <Select
          value={formData.rol}
          onValueChange={handleRoleChange}
          disabled={loading}
        >
          <SelectTrigger disabled={loading} className={`h-11 ${errors.rol ? 'border-red-500' : ''}`}>
            <span className={!selectedRoleName ? 'text-slate-500' : ''}>
              {selectedRoleName || (loading ? 'Cargando roles...' : 'Seleccionar rol')}
            </span>
          </SelectTrigger>
          <SelectContent
            autoScrollOnOpen={false}
            constrainToBoundary={true}
            boundarySelector='[data-create-admin-content="true"]'
            bottomOffset={16}
            maxListHeight={240}
          >
            {roles.map((rol) => (
              <SelectItem key={rol.id_rol || rol.id} value={(rol.id_rol || rol.id).toString()}>
                {rol.nombre_rol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.rol && (
          <p className="text-sm text-red-600">{errors.rol}</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        El rol define el nivel de acceso del administrativo en el sistema.
      </div>
    </div>
  );
};

export default RoleStep;
