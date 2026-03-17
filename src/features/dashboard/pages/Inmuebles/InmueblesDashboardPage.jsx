import React, { useState, useEffect } from 'react';
import { Building2, Plus } from 'lucide-react';

import { SearchBar } from '../Inmuebles/components/common/searchBar';
import { Pagination } from '../Inmuebles/components/common/pagination';
import { PropertyTable } from '../Inmuebles/components/inmuebles/propertyTable';
import { AgregarInmuebleModal } from '../Inmuebles/components/inmuebles/AgregarInmuebleModal';
import { VisualizarInmuebleModal } from '../Inmuebles/components/inmuebles/visualizarinmueblemodal';
import { FichasTecnicasModal } from '../Inmuebles/components/inmuebles/fichasTecnicasModal';
import { VerFichaTecnicaModal } from '../Inmuebles/components/inmuebles/verFichaTecnicaModal';
import { useInmuebles } from '../Inmuebles/hooks/useInmuebles';
import { useToast } from '../../../../shared/hooks/use-toast';

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

const isSoldStatus = (estado = '') => {
  const normalized = String(estado)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return normalized === 'vendido';
};

const resolveEstadoFrontend = (operacion, estadoActual) => {
  if (isSoldStatus(estadoActual)) {
    return 'Vendido';
  }
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
  const { toast } = useToast();
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

  const {
    inmuebles,
    pagination,
    loading,
    error,
    cargarInmuebles,
    crearInmueble,
    actualizarInmueble
  } = useInmuebles();

  const itemsPerPage = 5;

  const getCurrentQueryFilters = () => ({
    busqueda: searchTerm.trim() || undefined,
    estado_frontend: filters.estado !== 'Todos' ? filters.estado : undefined,
    operacion: filters.operacion !== 'Todas' ? filters.operacion : undefined,
    categoria: filters.tipo !== 'Todos' ? filters.tipo : undefined
  });

  const refreshCurrentList = async () => {
    await cargarInmuebles(currentPage, itemsPerPage, getCurrentQueryFilters());
  };

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
      await refreshCurrentList();
    } catch (error) {
      console.error('Error al guardar inmueble:', error);
    }
  };

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
      if (isSoldStatus(inmueble.estado) && !isSoldStatus(nuevoEstado)) {
        return;
      }
      await actualizarInmueble(inmueble.id, {
        operacion: inmueble.operacion,
        estado_frontend: nuevoEstado
      });
      await refreshCurrentList();
    } catch (err) {
      const message = err?.message || 'No se pudo actualizar el estado del inmueble.';
      toast({
        title: 'No se pudo cambiar el estado',
        description: message,
        variant: 'destructive'
      });
      console.error('Error actualizando estado del inmueble:', err);
    }
  };

  const handleToggleFeatured = async (inmueble) => {
    try {
      if (isFinalStatusForFeatured(inmueble.estado)) {
        return;
      }

      const currentValue = inmueble.destacado ?? inmueble.featured ?? false;
      await actualizarInmueble(inmueble.id, { destacado: !currentValue });
    } catch (err) {
      const message = err?.message || 'Error actualizando destacado del inmueble.';
      toast({
        title: 'No se pudo actualizar destacado',
        description: message,
        variant: 'destructive'
      });
      console.error('Error actualizando destacado del inmueble:', err);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cargarInmuebles(currentPage, itemsPerPage, getCurrentQueryFilters());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters, currentPage, cargarInmuebles]);

  const totalResults = pagination?.total ?? 0;
  const totalPages = Math.max(pagination?.totalPages || 1, 1);
  const startIndex = totalResults > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, totalResults);

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
            <h1 className="text-2xl font-bold text-slate-800">Gestion de Inmuebles</h1>
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
          <span className="font-semibold text-blue-600">{totalResults}</span> resultados
          {totalResults > 0 && (
            <span className="ml-1 text-slate-400">
              (Mostrando {startIndex}-{endIndex})
            </span>
          )}
        </p>
      </div>

      <PropertyTable
        properties={inmuebles}
        onView={handleVerDetalle}
        onEdit={handleEditar}
        onDocument={handleVerFichas}
        onStatusChange={handleEstadoChange}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          hasPrevPage={currentPage > 1}
          hasNextPage={currentPage < totalPages}
        />
      )}

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
