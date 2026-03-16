import React, { useState, useEffect } from 'react';
import { Building2, Plus } from 'lucide-react';

// Components
import { SearchBar } from '../Inmuebles/components/common/searchBar';
import { Pagination } from '../Inmuebles/components/common/pagination';
import { PropertyTable } from '../Inmuebles/components/inmuebles/propertyTable';
import { AgregarInmuebleModal } from '../Inmuebles/components/inmuebles/AgregarInmuebleModal';

import { VisualizarInmuebleModal } from '../Inmuebles/components/inmuebles/visualizarinmueblemodal';
import { FichasTecnicasModal } from '../Inmuebles/components/inmuebles/fichasTecnicasModal';
import { VerFichaTecnicaModal } from '../Inmuebles/components/inmuebles/verFichaTecnicaModal';

// Hooks
import { useInmuebles } from '../Inmuebles/hooks/useInmuebles';

const ESTADOS_POR_OPERACION = {
  Arriendo: ['Disponible', 'En proceso de arrendamiento', 'Arrendado'],
  Venta: ['Disponible', 'En proceso de venta', 'Vendido'],
  'Venta y Arriendo': [
    'Disponible',
    'En proceso de arrendamiento',
    'Arrendado',
    'En proceso de venta',
    'Vendido'
  ]
};

const resolveEstadoFrontend = (operacion, estadoActual) => {
  const estadosPermitidos = ESTADOS_POR_OPERACION[operacion] || ESTADOS_POR_OPERACION['Venta y Arriendo'];
  if (estadosPermitidos.includes(estadoActual)) {
    return estadoActual;
  }
  return 'Disponible';
};

const isFinalStatusForFeatured = (estado = '') => {
  const normalized = String(estado)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return normalized === 'arrendado' || normalized === 'vendido';
};

const InmuebleDashboardPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: 'Todos',
    operacion: 'Todas',
    tipo: 'Todos'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisualizarOpen, setModalVisualizarOpen] = useState(false);
  const [modalFichasOpen, setModalFichasOpen] = useState(false);
  const [modalFichaTecnicaOpen, setModalFichaTecnicaOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inmuebleSeleccionado, setInmuebleSeleccionado] = useState(null);
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [inmuebleEditar, setInmuebleEditar] = useState(null);

  // HOOK PRINCIPAL QUE CONECTA CON LA API
  const { 
    inmuebles, 
    loading, 
    error, 
    crearInmueble, 
    actualizarInmueble 
  } = useInmuebles();

  const itemsPerPage = 5;

  // Manejar guardar inmueble (crear o actualizar)
  const handleSaveInmueble = async (inmuebleData, esEdicion) => {
    try {
      if (esEdicion) {
        const { estado: _estadoFormulario, ...editablePayload } = inmuebleData;
        const estadoActual = inmuebleEditar?.estado || 'Disponible';
        const estadoFrontend = resolveEstadoFrontend(editablePayload.operacion, estadoActual);
        await actualizarInmueble(inmuebleData.id, {
          ...editablePayload,
          estado_frontend: estadoFrontend
        });
      } else {
        await crearInmueble(inmuebleData);
      }
    } catch (error) {
      console.error('Error al guardar inmueble:', error);
      // Aquí podrías mostrar un toast de error
    }
  };

  // Handlers para los modals
  const handleVerDetalle = (inmueble) => {
    setInmuebleSeleccionado(inmueble);
    setModalVisualizarOpen(true);
  };

  const handleEditar = (inmueble) => {
    setInmuebleEditar(inmueble);
    setIsModalOpen(true);
  };

  const handleVerFichas = (inmueble) => {
    setInmuebleSeleccionado(inmueble);
    setModalFichasOpen(true);
  };

  const handleVerFichaTecnica = (ficha) => {
    setFichaSeleccionada(ficha);
    setModalFichasOpen(false);
    setModalFichaTecnicaOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setInmuebleEditar(null);
  };

  const handleEstadoChange = async (inmueble, nuevoEstado) => {
    try {
      await actualizarInmueble(inmueble.id, {
        operacion: inmueble.operacion,
        estado_frontend: nuevoEstado
      });
    } catch (err) {
      console.error('Error actualizando estado del inmueble:', err);
    }
  };

  const handleToggleFeatured = async (inmueble) => {
    try {
      if (isFinalStatusForFeatured(inmueble.estado)) {
        return;
      }

      const currentValue = inmueble.destacado ?? inmueble.featured ?? false;
      if (!currentValue) {
        const destacadosCount = inmuebles.filter((item) => (item.destacado ?? item.featured ?? false)).length;
        if (destacadosCount >= 6) {
          window.alert('Solo se pueden destacar 6 inmuebles. Quita uno antes de destacar otro.');
          return;
        }
      }
      await actualizarInmueble(inmueble.id, { destacado: !currentValue });
    } catch (err) {
      const message = err?.message || 'Error actualizando destacado del inmueble.';
      window.alert(message);
      console.error('Error actualizando destacado del inmueble:', err);
    }
  };

  // Filtrado y paginación
  const filteredProperties = inmuebles.filter(property => {
    const matchesSearch = 
      property.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.registro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property.titulo && property.titulo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesEstado = filters.estado === 'Todos' || property.estado === filters.estado;
    const matchesOperacion = filters.operacion === 'Todas' || property.operacion === filters.operacion;
    const matchesTipo = filters.tipo === 'Todos' || property.tipo === filters.tipo;

    return matchesSearch && matchesEstado && matchesOperacion && matchesTipo;
  });

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProperties = filteredProperties.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando inmuebles...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">Error: {error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-2 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestión de Inmuebles</h1>
            <p className="text-sm text-slate-600">Administra los inmuebles registrados para venta o alquiler</p>
          </div>
        </div>
        <button
          onClick={() => {
            setInmuebleEditar(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-white shadow-lg shadow-blue-600/25 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <Plus className="w-4 h-4" />
          Agregar inmueble
        </button>
      </div>

      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        setFilters={setFilters}
      />

      <div className="flex items-center justify-between mb-3 text-sm">
        <p className="text-slate-600">
          <span className="font-semibold text-blue-600">{filteredProperties.length}</span> resultados
          {filteredProperties.length > 0 && (
            <span className="ml-1 text-slate-400">
              (Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)})
            </span>
          )}
        </p>
      </div>

      <PropertyTable
        properties={currentProperties}
        onView={handleVerDetalle}
        onEdit={handleEditar}
        onDocument={handleVerFichas}
        onStatusChange={handleEstadoChange}
        onToggleFeatured={handleToggleFeatured}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modals */}
      <AgregarInmuebleModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveInmueble}
        inmuebleEditar={inmuebleEditar}
      />

      <VisualizarInmuebleModal
        isOpen={modalVisualizarOpen}
        onClose={() => setModalVisualizarOpen(false)}
        inmueble={inmuebleSeleccionado}
      />

      <FichasTecnicasModal
        isOpen={modalFichasOpen}
        onClose={() => setModalFichasOpen(false)}
        inmueble={inmuebleSeleccionado}
        onVerFicha={handleVerFichaTecnica}
      />

      <VerFichaTecnicaModal
        isOpen={modalFichaTecnicaOpen}
        onClose={() => {
          setModalFichaTecnicaOpen(false);
          setModalFichasOpen(true);
        }}
        inmueble={inmuebleSeleccionado}
        ficha={fichaSeleccionada}
      />
    </div>
  );
};

export default InmuebleDashboardPage;


