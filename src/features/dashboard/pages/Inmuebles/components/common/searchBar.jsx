import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export const SearchBar = ({ searchTerm, setSearchTerm, filters, setFilters }) => {
  const handleClearAll = () => {
    setSearchTerm('');
    setFilters({
      estado: 'Todos',
      operacion: 'Todas',
      tipo: 'Todos'
    });
  };

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    filters.estado !== 'Todos' ||
    filters.operacion !== 'Todas' ||
    filters.tipo !== 'Todos';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por direccion, registro, tipo o titulo..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Limpiar busqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center w-full sm:w-auto">
          <div className="w-[180px]">
            <select
              value={filters.estado}
              onChange={(event) => setFilters({ ...filters, estado: event.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-slate-700"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Disponible">Disponible</option>
              <option value="Vendido">Vendido</option>
              <option value="Arrendado">Arrendado</option>
              <option value="En proceso de venta">En proceso de venta</option>
              <option value="En proceso de arrendamiento">En proceso de arrendamiento</option>
            </select>
          </div>

          <div className="w-[180px]">
            <select
              value={filters.operacion}
              onChange={(event) => setFilters({ ...filters, operacion: event.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-slate-700"
            >
              <option value="Todas">Todas las operaciones</option>
              <option value="Venta">Venta</option>
              <option value="Arriendo">Arriendo</option>
              <option value="Venta y Arriendo">Venta y Arriendo</option>
            </select>
          </div>

          <div className="w-[180px]">
            <select
              value={filters.tipo}
              onChange={(event) => setFilters({ ...filters, tipo: event.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-slate-700"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Casa">Casa</option>
              <option value="Apartamento">Apartamento</option>
              <option value="Local">Local</option>
              <option value="Oficina">Oficina</option>
              <option value="Bodega">Bodega</option>
              <option value="Lote">Lote</option>
              <option value="Finca">Finca</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
};
