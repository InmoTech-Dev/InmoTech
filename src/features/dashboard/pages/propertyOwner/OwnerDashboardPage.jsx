import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Eye, Edit, X, Building2, User, Search } from 'lucide-react';
import OwnerForm from './components/ownerForm';
import ownersApiService, { normalizeOwnerResponse } from '../../../../shared/services/ownersApiService';
import { useInmuebles } from '../Inmuebles/hooks/useInmuebles';

const formatCurrency = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 'Sin precio';
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(number);
};

const PropertyOwnersManagement = () => {
  const {
    inmuebles: catalogoInmuebles,
    loading: inmueblesLoading,
    error: inmueblesError,
    crearInmueble,
    actualizarInmueble,
    cargarInmuebles
  } = useInmuebles();

  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(true);
  const [ownersError, setOwnersError] = useState(null);
  const [ownersPagination, setOwnersPagination] = useState({
    pagina: 1,
    limite: 5,
    paginas_totales: 1,
    total: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos los estados');
  const [filterCantidad, setFilterCantidad] = useState('Todas las cantidades');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ownerSubmitting, setOwnerSubmitting] = useState(false);
  const itemsPerPage = 5;
  const isLoading = ownersLoading || inmueblesLoading;
  const errorMessage = ownersError || inmueblesError;

  const [alert, setAlert] = useState({
    show: false,
    type: '',
    message: ''
  });

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  const availableInmuebles = useMemo(
    () => catalogoInmuebles || [],
    [catalogoInmuebles]
  );

  const formatPropertyForOwner = useCallback(
    (property) => ({
      id: property.id ?? property.id_inmueble,
      titulo: property.titulo,
      tipo: property.tipo ?? property.categoria,
      operacion: property.operacion,
      estado: property.estado,
      precio: formatCurrency(
        property.precio ?? property.precio_venta ?? property.precio_arriendo
      ),
      ciudad: property.ciudad,
      direccion: property.direccion
    }),
    []
  );

  const attachProperties = useCallback(
    (owner) => {
      if (!owner?.id) return owner;

      const inmueblesOwner = Array.isArray(owner.inmuebles)
        ? owner.inmuebles.map(formatPropertyForOwner)
        : [];

      if (inmueblesOwner.length) {
        return {
          ...owner,
          inmuebles: inmueblesOwner,
          cantidadInmuebles: owner.cantidadInmuebles ?? inmueblesOwner.length
        };
      }

      const propiedadesAsociadas = availableInmuebles.filter((inmueble) =>
        inmueble.ownerIds?.includes(owner.id)
      );

      if (!propiedadesAsociadas.length) {
        return {
          ...owner,
          cantidadInmuebles: owner.cantidadInmuebles ?? 0,
          inmuebles: []
        };
      }

      return {
        ...owner,
        inmuebles: propiedadesAsociadas.map(formatPropertyForOwner),
        cantidadInmuebles: propiedadesAsociadas.length
      };
    },
    [availableInmuebles, formatPropertyForOwner]
  );

  const fetchOwners = useCallback(async () => {
    setOwnersLoading(true);
    try {
      const { owners: fetchedOwners, pagination } = await ownersApiService.getOwners({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch,
        estado: filterEstado,
        cantidad: filterCantidad
      });

      const attached = fetchedOwners.map(attachProperties);
      setOwners(attached);
      setOwnersPagination(pagination);
      setOwnersError(null);
    } catch (error) {
      console.error('Error obteniendo propietarios:', error);
      setOwnersError(error.message || 'No se pudo cargar la informacion de propietarios');
    } finally {
      setOwnersLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, filterEstado, filterCantidad, attachProperties]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterEstado, filterCantidad]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleExternalOwner = () => {
      fetchOwners();
    };

    window.addEventListener('owner:created', handleExternalOwner);
    return () => window.removeEventListener('owner:created', handleExternalOwner);
  }, [fetchOwners]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    filterEstado !== 'Todos los estados' ||
    filterCantidad !== 'Todas las cantidades';

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterEstado('Todos los estados');
    setFilterCantidad('Todas las cantidades');
    setCurrentPage(1);
  };

  const totalPages = Math.max(ownersPagination.paginas_totales || 1, 1);
  const totalOwners = ownersPagination.total || 0;
  const startIndex = totalOwners > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, totalOwners);
  const currentOwners = owners;

  const openModal = (mode, owner = null) => {
    setModalMode(mode);
    setSelectedOwner(owner);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedOwner(null);
  };

  const handleSubmitOwner = async (formData, selectedInmuebles) => {
    if (ownerSubmitting) {
      return;
    }
    setOwnerSubmitting(true);
    try {
      const selectedIds = Array.from(
        new Set((selectedInmuebles || []).map((item) => Number(item?.id)).filter((id) => Number.isFinite(id)))
      );
      const previousIds = Array.from(
        new Set(
          (selectedOwner?.inmuebles || [])
            .map((item) => Number(item?.id))
            .filter((id) => Number.isFinite(id))
        )
      );

      if (modalMode === 'create' && selectedIds.length === 0) {
        throw new Error('Debes asignar al menos un inmueble valido para crear el propietario.');
      }

      const syncOwnerAssignments = async (ownerId, previousIds = []) => {
        const prevSet = new Set((previousIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)));
        const selectedSet = new Set(selectedIds);

        const toAssign = selectedIds.filter((id) => !prevSet.has(id));
        const toKeepAssigned = selectedIds.filter((id) => prevSet.has(id));
        const toUnassign = [...prevSet].filter((id) => !selectedSet.has(id));

        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const withDeadlockRetry = async (fn, maxAttempts = 3) => {
          let attempt = 0;
          while (attempt < maxAttempts) {
            try {
              return await fn();
            } catch (error) {
              attempt += 1;
              const rawMessage = (error?.message || error?.data?.message || '').toLowerCase();
              const isDeadlock =
                rawMessage.includes('deadlock') ||
                rawMessage.includes('was deadlocked on lock resources');

              if (!isDeadlock || attempt >= maxAttempts) {
                throw error;
              }

              await wait(200 * attempt);
            }
          }
        };

        for (const inmuebleId of toAssign) {
          await withDeadlockRetry(() =>
            actualizarInmueble(inmuebleId, { propietarioId: ownerId })
          );
        }

        for (const inmuebleId of toKeepAssigned) {
          await withDeadlockRetry(() =>
            actualizarInmueble(inmuebleId, { propietarioId: ownerId })
          );
        }

        for (const inmuebleId of toUnassign) {
          await withDeadlockRetry(() =>
            actualizarInmueble(inmuebleId, { desasignar_propietario: true })
          );
        }
      };

      if (modalMode === 'create') {
        const created = await ownersApiService.createOwner(formData);
        const normalized = normalizeOwnerResponse(created);
        await syncOwnerAssignments(normalized.id, []);
        showAlert('success', `Propietario "${normalized.nombreCompleto}" creado exitosamente`);
      } else if (modalMode === 'edit' && selectedOwner) {
        const updated = await ownersApiService.updateOwner(selectedOwner.id, formData);
        const normalized = normalizeOwnerResponse(updated);
        await syncOwnerAssignments(normalized.id, previousIds);
        showAlert('success', `Propietario "${normalized.nombreCompleto}" actualizado correctamente`);
      }

      await cargarInmuebles();
      await fetchOwners();
      closeModal();
    } catch (error) {
      console.error('Error guardando propietario:', error);
      showAlert('error', error.message || 'No se pudo completar la operacion');
    } finally {
      setOwnerSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-2">
        {alert.show && (
          <div className="fixed top-4 right-4 z-[70] animate-slide-in">
            <div
              className={`rounded-lg shadow-lg p-3 flex items-start gap-2 max-w-sm text-sm ${
                alert.type === 'success'
                  ? 'bg-green-50 border-l-4 border-green-500'
                  : 'bg-blue-50 border-l-4 border-blue-500'
              }`}
            >
              <div className="flex-shrink-0">
                {alert.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${alert.type === 'success' ? 'text-green-800' : 'text-blue-800'}`}>
                  {alert.type === 'success' ? 'Exito' : 'Informacion'}
                </h3>
                <p className={`text-xs mt-0.5 ${alert.type === 'success' ? 'text-green-700' : 'text-blue-700'}`}>
                  {alert.message}
                </p>
              </div>
              <button
                onClick={() => setAlert({ show: false, type: '', message: '' })}
                className={`flex-shrink-0 rounded p-1 hover:bg-white/50 transition-colors ${
                  alert.type === 'success' ? 'text-green-500' : 'text-blue-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-xl">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Gestion de Propietarios</h1>
              <p className="text-sm text-gray-600">Administra los propietarios registrados</p>
            </div>
          </div>
          <button
            onClick={() => openModal('create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg transition-colors text-sm"
          >
            <span className="text-lg">+</span> Agregar Propietario
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar propietario por nombre, documento o registro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-9 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filtros:
            </span>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Todos los estados</option>
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
            <select
              value={filterCantidad}
              onChange={(e) => setFilterCantidad(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Todas las cantidades</option>
              <option value="1">1 inmueble</option>
              <option value="2-3">2-3 inmuebles</option>
              <option value="4+">4+ inmuebles</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            Cargando propietarios...
          </div>
        ) : errorMessage ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 text-sm">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm">
              <span className="text-blue-600 font-semibold">{totalOwners}</span>
              <span className="text-gray-600">
                {' '}
                resultados (Mostrando {startIndex}-{endIndex})
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
              <div className="w-full">
                <table className="table-fixed w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">ID</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Registro</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Nombre</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Documento</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Contacto</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Inmuebles</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Estado</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentOwners.map((owner, index) => (
                      <tr key={owner.id} className="hover:bg-slate-50 transition-colors">
                        <td className="hidden xl:table-cell px-3 lg:px-4 py-3.5 align-middle text-[13px] text-slate-900">#{startIndex + index}</td>
                        <td className="hidden lg:table-cell px-3 lg:px-4 py-3.5 align-middle text-[13px] text-slate-900 font-medium truncate" title={owner.registro}>{owner.registro}</td>
                        <td className="px-3 lg:px-4 py-3.5 align-middle text-[13px] text-slate-900">
                          <div className="font-medium truncate" title={owner.nombreCompleto}>{owner.nombreCompleto}</div>
                          <div className="lg:hidden text-xs text-slate-500 truncate" title={owner.registro}>{owner.registro}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 text-[13px]">
                            <Building2 className="w-3 h-3 text-gray-500" />
                            <span className="font-semibold text-gray-900">{owner.cantidadInmuebles}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              owner.estado === 'Activo'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {owner.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openModal('view', owner)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => openModal('edit', owner)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 p-3 border-t border-gray-200">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    «
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-2 py-1 text-sm rounded ${
                        currentPage === i + 1
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <OwnerForm
          isOpen={modalOpen}
          mode={modalMode}
          selectedOwner={selectedOwner}
          availableInmuebles={availableInmuebles}
          onClose={closeModal}
          onSubmit={handleSubmitOwner}
          isSubmitting={ownerSubmitting}
          onCreateInmueble={crearInmueble}
        />
      )}
    </>
  );
};

export default PropertyOwnersManagement;

const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;
document.head.appendChild(style);
