import React from 'react';
import { Search, Filter } from 'lucide-react';

export const SearchBar = ({ searchTerm, setSearchTerm, filters, setFilters }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar inmueble por dirección, registro o tipo..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
          <Filter className="w-3.5 h-3.5" />
          Filtros:
        </div>

        <select
          value={filters.estado}
          onChange={(event) => setFilters({ ...filters, estado: event.target.value })}
          className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Disponible">Disponible</option>
          <option value="Vendido">Vendido</option>
          <option value="Arrendado">Arrendado</option>
          <option value="En proceso de venta">En proceso de venta</option>
          <option value="En proceso de arrendamiento">En proceso de arrendamiento</option>
        </select>

        <select
          value={filters.operacion}
          onChange={(event) => setFilters({ ...filters, operacion: event.target.value })}
          className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
        >
          <option value="Todas">Todas las operaciones</option>
          <option value="Venta">Venta</option>
          <option value="Arriendo">Arriendo</option>
        </select>

        <select
          value={filters.tipo}
          onChange={(event) => setFilters({ ...filters, tipo: event.target.value })}
          className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
        >
          <option value="Todos">Todos los tipos</option>
          <option value="Casa">Casa</option>
          <option value="Apartamento">Apartamento</option>
          <option value="Apartaestudio">Apartaestudio</option>
          <option value="Finca">Finca</option>
          <option value="Lote">Lote</option>
          <option value="Oficina">Oficina</option>
        </select>
      </div>
    </div>
  );
};
