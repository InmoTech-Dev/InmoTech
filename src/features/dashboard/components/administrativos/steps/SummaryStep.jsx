import React from 'react';
import { CheckCircle, User, Briefcase, Users, Mail, Phone, Calendar } from 'lucide-react';

const SummaryStep = ({ formData }) => {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-800">Resumen del Administrativo</h3>
        <p className="text-slate-600 text-sm">Verifica la informacion antes de crear el registro</p>
      </div>

      <section className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-slate-800">Informacion Personal</h4>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <p className="text-slate-600">Tipo de Documento</p>
          <p className="text-slate-800 text-right">{formData.tipoDocumento || 'No especificado'}</p>
          <p className="text-slate-600">Numero de Documento</p>
          <p className="text-slate-800 text-right">{formData.numeroDocumento || 'No especificado'}</p>
          <p className="text-slate-600">Nombre Completo</p>
          <p className="text-slate-800 text-right">{formData.nombreCompleto || 'No especificado'}</p>
          <p className="text-slate-600">Apellido Completo</p>
          <p className="text-slate-800 text-right">{formData.apellidoCompleto || 'No especificado'}</p>
          <div className="text-slate-600 flex items-center gap-1">
            <Mail className="w-4 h-4 text-slate-400" />
            Email
          </div>
          <p className="text-slate-800 text-right truncate">{formData.email || 'No especificado'}</p>
          <div className="text-slate-600 flex items-center gap-1">
            <Phone className="w-4 h-4 text-slate-400" />
            Telefono
          </div>
          <p className="text-slate-800 text-right">{formData.telefono || 'No especificado'}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-slate-800">Informacion Laboral</h4>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="text-slate-600 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-slate-400" />
            Fecha de Ingreso
          </div>
          <p className="text-slate-800 text-right">
            {formData.fechaIngreso ? new Date(formData.fechaIngreso).toLocaleDateString('es-CO') : 'No especificada'}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-indigo-600" />
          <h4 className="font-semibold text-slate-800">Rol Administrativo</h4>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <p className="text-slate-600">Rol Asignado</p>
          <p className="text-slate-800 text-right">{formData.rolNombre || 'No especificado'}</p>
        </div>
      </section>

      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <p className="text-sm text-green-700">
            Al crear el administrativo, se enviara un correo con codigo y enlace para definir la contrasena.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;
