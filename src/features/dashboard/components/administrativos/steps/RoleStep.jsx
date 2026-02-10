import React, { useState, useEffect } from 'react';
import { Label } from '../../../../../shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../shared/components/ui/select';
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
          .filter(rol => !excluidos.includes(rol.nombre_rol))
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

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Rol Administrativo</h3>
        <p className="text-slate-600 text-sm">Selecciona el rol que tendrá este administrativo en el sistema</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rol" className="text-sm font-medium text-slate-700">
          Rol Administrativo *
        </Label>
        <Select
          value={formData.rol}
          onValueChange={(value) => updateFormData('rol', value)}
          disabled={loading}
        >
          <SelectTrigger className={`h-11 ${errors.rol ? 'border-red-500' : ''}`}>
            <SelectValue placeholder={loading ? 'Cargando roles...' : 'Seleccionar rol'} />
          </SelectTrigger>
          <SelectContent>
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
    </div>
  );
};

export default RoleStep;
