import React, { useState, useEffect } from 'react';
import { Label } from '../../../../../shared/components/ui/label';
import { Briefcase } from 'lucide-react';
import rolesApiService from '../../../../../shared/services/rolesApiService';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../../../shared/components/ui/select';

const LaboralEditStep = ({ formData, errors, updateFormData, administrativo }) => {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await rolesApiService.obtenerRoles();
        setRoles(data.map((rol) => ({ value: rol.id, label: rol.nombre })));
      } catch (error) {
        console.error('Error al cargar los roles:', error);
      }
    };

    fetchRoles();
  }, []);

  const selectedRolLabel = roles.find((rol) => rol.value === formData.rol)?.label;

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-800">Editar Informacion Laboral</h3>
        <p className="text-sm text-slate-600">Actualiza el rol del administrativo</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rol" className="text-sm font-medium text-slate-700">
          Rol *
        </Label>
        <Select value={formData.rol} onValueChange={(value) => updateFormData('rol', value)}>
          <SelectTrigger className={`${errors.rol ? 'border-red-500' : ''}`}>
            <span className="block truncate">{selectedRolLabel || 'Selecciona un rol'}</span>
          </SelectTrigger>
          <SelectContent
            autoScrollOnOpen={false}
            constrainToBoundary={true}
            boundarySelector='[data-edit-admin-content="true"]'
            bottomOffset={16}
            maxListHeight={240}
            className="max-h-56"
          >
            {roles.map((rol) => (
              <SelectItem key={rol.value} value={rol.value}>
                {rol.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.rol && (
          <p className="text-xs text-red-600">{errors.rol}</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Informacion laboral actual</span>
        </div>
        <div className="grid grid-cols-1 gap-1 text-sm text-slate-600 md:grid-cols-3 md:gap-3">
          <p><strong>Codigo:</strong> {administrativo?.codigo_empleado}</p>
          <p>
            <strong>Ingreso:</strong>{' '}
            {administrativo?.fecha_ingreso
              ? new Date(administrativo.fecha_ingreso).toLocaleDateString('es-CO')
              : 'No registrada'}
          </p>
          <p><strong>Estado:</strong> {administrativo?.estado_laboral}</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
        <div className="mb-1 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Informacion importante</span>
        </div>
        <ul className="space-y-0.5 text-xs text-amber-700">
          <li>- Codigo y fecha de ingreso no se pueden modificar.</li>
          <li>- Si cambias el rol, revisa sus permisos activos.</li>
        </ul>
      </div>
    </div>
  );
};

export default LaboralEditStep;
