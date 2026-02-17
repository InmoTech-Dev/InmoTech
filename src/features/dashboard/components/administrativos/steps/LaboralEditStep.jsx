import React, { useState, useEffect } from 'react';
import { Label } from '../../../../../shared/components/ui/label';
import { Input } from '../../../../../shared/components/ui/input';
import { Briefcase } from 'lucide-react';
import rolesApiService from '../../../../../shared/services/rolesApiService';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../../shared/components/ui/select';

const LaboralEditStep = ({ formData, errors, updateFormData, administrativo }) => {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await rolesApiService.obtenerRoles();
        setRoles(data.map(rol => ({ value: rol.id, label: rol.nombre })));
      } catch (error) {
        console.error("Error al cargar los roles:", error);
      }
    };
    fetchRoles();
  }, []);

  const selectedRolLabel = roles.find(rol => rol.value === formData.rol)?.label;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Editar Información Laboral</h3>
        <p className="text-slate-600 text-sm">Modifica los datos laborales del administrativo</p>
      </div>

      {/* Información del administrativo actual */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Información laboral actual</span>
        </div>
        <div className="text-sm text-slate-600 space-y-1">
          <p><strong>Código:</strong> {administrativo?.codigo_empleado}</p>
          <p><strong>Fecha de ingreso:</strong> {administrativo?.fecha_ingreso ? new Date(administrativo.fecha_ingreso).toLocaleDateString('es-CO') : 'No registrada'}</p>
          <p><strong>Estado laboral:</strong> {administrativo?.estado_laboral}</p>
        </div>
      </div>

      {/* Selector de Rol */}
      <div className="space-y-2">
        <Label htmlFor="rol" className="text-sm font-medium text-slate-700">
          Rol
        </Label>
        <div className="relative">
          <Select value={formData.rol} onValueChange={(value) => updateFormData('rol', value)}>
            <SelectTrigger>
              <span className="block truncate">
                {selectedRolLabel || "Selecciona un rol"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {roles.map((rol) => (
                <SelectItem key={rol.value} value={rol.value}>
                  {rol.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {errors.rol && (
          <p className="text-sm text-red-600">{errors.rol}</p>
        )}
      </div>

      {/* Información adicional */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Información importante</span>
        </div>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• El código de empleado y fecha de ingreso no se pueden modificar</li>
          <li>• Si cambias el rol, revisa los permisos asignados.</li>
        </ul>
      </div>
    </div>
  );
};

export default LaboralEditStep;
