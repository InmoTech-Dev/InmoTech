import { useState, useMemo } from 'react';
// import { initialOwners, availableInmuebles } from '../utils/constants';

export const usePropertyOwners = () => {
  const [owners, setOwners] = useState(initialOwners);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos los estados');
  const [filterCantidad, setFilterCantidad] = useState('Todas las cantidades');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredOwners = useMemo(() => {
    return owners.filter(owner => {
      const matchesSearch = owner.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           owner.documento.includes(searchTerm) ||
                           owner.registro.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = filterEstado === 'Todos los estados' || owner.estado === filterEstado;
      const matchesCantidad = filterCantidad === 'Todas las cantidades' || 
                             (filterCantidad === '1' && owner.cantidadInmuebles === 1) ||
                             (filterCantidad === '2-3' && owner.cantidadInmuebles >= 2 && owner.cantidadInmuebles <= 3) ||
                             (filterCantidad === '4+' && owner.cantidadInmuebles >= 4);
      return matchesSearch && matchesEstado && matchesCantidad;
    });
  }, [owners, searchTerm, filterEstado, filterCantidad]);

  const totalPages = Math.ceil(filteredOwners.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOwners = filteredOwners.slice(startIndex, endIndex);

  const addOwner = (newOwner) => {
    setOwners(prev => [...prev, newOwner]);
  };

  const updateOwner = (ownerId, updatedData) => {
    setOwners(prev => prev.map(owner => 
      owner.id === ownerId ? { ...owner, ...updatedData } : owner
    ));
  };

  return {
    owners,
    filteredOwners,
    currentOwners,
    searchTerm,
    setSearchTerm,
    filterEstado,
    setFilterEstado,
    filterCantidad,
    setFilterCantidad,
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    endIndex,
    itemsPerPage,
    addOwner,
    updateOwner,
    availableInmuebles
  };
};