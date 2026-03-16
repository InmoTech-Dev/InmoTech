import React from 'react';
import { Building2 } from 'lucide-react';
import { ActionButtons } from './actionButton';
import { getEstadoColor, getEstadoDotColor } from '../../utils/helpers';

const ESTADOS_POR_OPERACION = {
  Arriendo: ['Disponible', 'En proceso de arrendamiento', 'Arrendado'],
  Venta: ['Disponible', 'En proceso de venta', 'Vendido'],
  'Venta y Arriendo': [
    'Disponible',
    'En proceso de venta',
    'Vendido',
    'En proceso de arrendamiento',
    'Arrendado'
  ]
};

const getEstadosDisponibles = (operacion) =>
  ESTADOS_POR_OPERACION[operacion] || ESTADOS_POR_OPERACION['Venta y Arriendo'];

const isFinalStatusForFeatured = (estado = '') => {
  const normalized = String(estado)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return normalized === 'arrendado' || normalized === 'vendido';
};

const isSoldStatus = (estado = '') => {
  const normalized = String(estado)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return normalized === 'vendido';
};

export const PropertyTable = ({ properties, onView, onEdit, onDocument, onStatusChange, onToggleFeatured }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
      <div className="w-full">
        <table className="table-fixed w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[96px]">Imagen</th>
              <th className="hidden xl:table-cell px-3 lg:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[70px]">ID</th>
              <th className="hidden lg:table-cell px-3 lg:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[150px]">Registro</th>
              <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Direccion</th>
              <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[130px]">Tipo</th>
              <th className="hidden 2xl:table-cell px-3 lg:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[150px]">Operacion</th>
              <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[138px]">Estado</th>
              <th className="px-3 lg:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[178px]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {properties.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Building2 className="w-10 h-10 text-slate-300" />
                    <p className="text-slate-600 font-medium">No se encontraron inmuebles</p>
                    <p className="text-xs text-slate-400">Intenta ajustar los filtros de busqueda</p>
                  </div>
                </td>
              </tr>
            ) : (
              properties.map((property) => {
                const coverImage = property.imagenes?.[0];
                const fallback = property.titulo?.[0]?.toUpperCase() || property.tipo?.[0] || 'I';
                const estadosDisponibles = getEstadosDisponibles(property.operacion);
                const estadoActual = property.estado || 'Disponible';
                const soldStatusLocked = isSoldStatus(estadoActual);
                const selectableEstados = soldStatusLocked && !estadosDisponibles.includes('Vendido')
                  ? [...estadosDisponibles, 'Vendido']
                  : estadosDisponibles;
                const selectedEstado = selectableEstados.includes(estadoActual)
                  ? estadoActual
                  : 'Disponible';
                const featuredDisabled = isFinalStatusForFeatured(estadoActual);

                return (
                  <tr key={property.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 lg:px-4 py-3.5 align-middle whitespace-nowrap">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={`Imagen de ${property.titulo || property.registro}`}
                          className="h-12 w-16 rounded-lg object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="h-12 w-16 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-semibold">
                          {fallback}
                        </div>
                      )}
                    </td>
                    <td className="hidden xl:table-cell px-3 lg:px-4 py-3.5 align-middle text-sm font-semibold text-slate-900">
                      #{property.id}
                    </td>
                    <td className="hidden lg:table-cell px-3 lg:px-4 py-3.5 align-middle text-sm text-slate-900 font-mono truncate" title={property.registro}>
                      {property.registro}
                    </td>
                    <td className="px-3 lg:px-4 py-3.5 align-middle text-sm text-slate-700" title={property.direccion}>
                      <div className="truncate">{property.direccion}</div>
                      <div className="lg:hidden text-xs text-slate-400 font-mono truncate">{property.registro}</div>
                    </td>
                    <td className="px-3 lg:px-4 py-3.5 align-middle text-sm text-slate-700">
                      <span className="inline-flex items-center gap-1 max-w-full">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{property.tipo}</span>
                      </span>
                    </td>
                    <td className="hidden 2xl:table-cell px-3 lg:px-4 py-3.5 align-middle text-sm text-slate-600 truncate" title={property.operacion}>
                      {property.operacion}
                    </td>
                    <td className="px-3 lg:px-4 py-3.5 align-middle">
                      {onStatusChange ? (
                        <select
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 ${getEstadoColor(property.estado)} border-none h-7 w-full max-w-[132px] ${soldStatusLocked ? 'cursor-not-allowed opacity-85' : ''}`}
                          value={selectedEstado}
                          onChange={(e) => onStatusChange(property, e.target.value)}
                          disabled={soldStatusLocked}
                        >
                          {selectableEstados.map((estado) => (
                            <option key={estado} value={estado}>
                              {estado}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${getEstadoColor(property.estado)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getEstadoDotColor(property.estado)}`}></span>
                          {property.estado}
                        </span>
                      )}
                    </td>
                    <td className="px-3 lg:px-4 py-3.5 align-middle">
                      <ActionButtons
                        onView={() => onView(property)}
                        onEdit={() => onEdit(property)}
                        onDocument={() => onDocument(property)}
                        onToggleFeatured={onToggleFeatured ? () => onToggleFeatured(property) : undefined}
                        isFeatured={property.destacado || property.featured}
                        isFeaturedDisabled={featuredDisabled}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
