import React from 'react';
import { Label } from '../../../../../shared/components/ui/label';
import { Input } from '../../../../../shared/components/ui/input';

const LaboralStep = ({ formData, errors, updateFormData }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Información Laboral</h3>
        <p className="text-slate-600 text-sm">Ingresa los datos laborales del nuevo administrativo</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fechaIngreso" className="text-sm font-medium text-slate-700">
          Fecha de Ingreso *
        </Label>
        <Input
          id="fechaIngreso"
          type="date"
          value={formData.fechaIngreso}
          onChange={(e) => updateFormData('fechaIngreso', e.target.value)}
          className={`h-11 rounded-xl ${errors.fechaIngreso ? 'border-red-500' : ''}`}
          max={new Date().toISOString().split('T')[0]}
        />
        {errors.fechaIngreso && (
          <p className="text-sm text-red-600">{errors.fechaIngreso}</p>
        )}
        <p className="text-xs text-slate-500">
          No se permiten fechas futuras. El código de empleado se generará automáticamente.
        </p>
      </div>
    </div>
  );
};

export default LaboralStep;
