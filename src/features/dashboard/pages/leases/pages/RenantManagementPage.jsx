import React, { useState, useRef } from "react";
import ReactDOM from 'react-dom';
import { FaUserPlus, FaEye, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import RenantForm from "../components/RenantForm";
import EditRenantForm from "../components/EditRenantForm";
import ViewRenant from "../components/ViewRenant"; 
import "../../../../../shared/styles/globals.css";

export function RenantManagementPage() {
  const [arriendos, setArriendos] = useState([
    {
      id: 1,
      tipoDocInquilino: "CC",
      numeroDocInquilino: "1036000001",
      primerNombreInquilino: "Juan",
      primerApellidoInquilino: "Pérez",
      telefonoInquilino: "3001111111",
      correoInquilino: "juan.perez@example.com",
      tipoDocCodeudor: "CC",
      numeroDocCodeudor: "70000001",
      primerNombreCodeudor: "Ana",
      primerApellidoCodeudor: "Gómez",
      telefonoCodeudor: "3002222222",
      correoCodeudor: "ana.gomez@example.com",
      estabilidadLaboral: "Empleado",
      tipoInmueble: "Casa",
      registroInmobiliario: "110010123456",
      nombreInmueble: "Casa Moderna",
      area: 120,
      habitaciones: 3,
      banos: 2,
      departamento: "Antioquia",
      ciudad: "Medellín",
      barrio: "Poblado",
      estrato: 5,
      direccion: "Carrera 40 # 10-25",
      precioInmueble: "250.000.000 $",
      fechaInicio: "22/05/2025",
      fechaFinal: "22/05/2026",
      fechaCobro: 27,
      precio: "2.500.000 $",
      estado: "Pagado",
      fechaLimite: "27/05/2025",
      valorMensual: "2.500.000 $",
    },
    {
      id: 2,
      tipoDocInquilino: "CE",
      numeroDocInquilino: "80000002",
      primerNombreInquilino: "Carlos",
      primerApellidoInquilino: "Vásquez",
      telefonoInquilino: "3003333333",
      correoInquilino: "carlos.v@example.com",
      tipoDocCodeudor: "NIT",
      numeroDocCodeudor: "900000000-1",
      primerNombreCodeudor: "Empresa",
      primerApellidoCodeudor: "XYZ",
      telefonoCodeudor: "6045555555",
      correoCodeudor: "info@xyz.com",
      estabilidadLaboral: "Independiente",
      tipoInmueble: "Apartamento",
      registroInmobiliario: "760010789012",
      nombreInmueble: "Apartamento Central",
      area: 75,
      habitaciones: 2,
      banos: 1,
      departamento: "Valle del Cauca",
      ciudad: "Cali",
      barrio: "Granada",
      estrato: 4,
      direccion: "Calle 10 # 5-10",
      precioInmueble: "150.000.000 $",
      fechaInicio: "10/10/2025",
      fechaFinal: "10/10/2026",
      fechaCobro: 15,
      precio: "3.000.000 $",
      estado: "Pendiente",
      fechaLimite: "15/10/2025",
      valorMensual: "3.000.000 $",
    },
  ]);

  const idCounter = useRef(arriendos.length + 1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRent, setEditingRent] = useState(null);
  const [viewingRent, setViewingRent] = useState(null);

  // CREAR NUEVO
  const handleNewRent = (newRentData) => {
    const nuevoArriendo = {
      id: idCounter.current++,
      ...newRentData,
      precioInmueble: `${Number(newRentData.precioInmueble).toLocaleString("es-CO")} $`,
      precio: `${Number(newRentData.precio).toLocaleString("es-CO")} $`,
      valorMensual: `${Number(newRentData.precio).toLocaleString("es-CO")} $`,
      estado: "Pendiente de inicio",
    };

    setArriendos((prev) => [...prev, nuevoArriendo]);
    setShowForm(false);
    setEditingRent(null);
  };

  // EDITAR EXISTENTE
  const handleEditSave = (updatedRent) => {
    const actualizado = {
      ...updatedRent,
      precioInmueble: `${Number(updatedRent.precioInmueble).toLocaleString("es-CO")} $`,
      precio: `${Number(updatedRent.precio).toLocaleString("es-CO")} $`,
      valorMensual: `${Number(updatedRent.precio).toLocaleString("es-CO")} $`,
    };

    setArriendos((prev) =>
      prev.map((r) => (r.id === updatedRent.id ? { ...r, ...actualizado } : r))
    );
    setShowForm(false);
    setEditingRent(null);
  };

  const handleEditClick = (rent) => {
    setEditingRent(rent);
    setShowForm(true);
  };

  // 🗑️ ELIMINAR
  const handleDelete = (id) => {
    if (window.confirm("¿Estás seguro de eliminar este registro?")) {
      setArriendos((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const filteredRents =
    searchTerm.trim() === ""
      ? arriendos
      : arriendos.filter((r) => {
          const lower = searchTerm.toLowerCase();
          return (
            r.registroInmobiliario.includes(searchTerm) ||
            r.tipoInmueble.toLowerCase().includes(lower) ||
            r.estado.toLowerCase().includes(lower) ||
            r.fechaInicio.includes(searchTerm) ||
            r.fechaFinal.includes(searchTerm) ||
            r.primerNombreInquilino.toLowerCase().includes(lower) ||
            r.primerApellidoInquilino.toLowerCase().includes(lower) ||
            r.numeroDocInquilino.includes(searchTerm) ||
            r.correoInquilino.toLowerCase().includes(lower)
          );
        });

  const getEstadoBadge = (estado) => {
    let baseClass = "estado";

    switch (estado) {
      case "Pagado":
      case "Activo":
        return <span className={`${baseClass} pagado`}>{estado}</span>;
      case "Pendiente":
      case "Pendiente de inicio":
        return <span className={`${baseClass} pendiente`}>{estado}</span>;
      case "Debe":
      case "Finalizado":
        return <span className={`${baseClass} debe`}>{estado}</span>;
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
            {estado}
          </span>
        );
    }
  };

  // 🔑 --- FUNCIONES PARA RENDERIZAR MODALES CON PORTAL ---
  const renderFormModal = () => {
    if (!showForm) return null;

    const modalContent = editingRent ? (
      <EditRenantForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingRent(null);
        }}
        onSubmit={handleEditSave}
        initialData={editingRent}
      />
    ) : (
      <RenantForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingRent(null);
        }}
        onSubmit={handleNewRent}
      />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root') || document.body
    );
  };

  const renderViewModal = () => {
    if (!viewingRent) return null;

    const modalContent = (
      <ViewRenant renant={viewingRent} onClose={() => setViewingRent(null)} />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root') || document.body
    );
  };

  return (
    <>
      <div className="p-6">
        {/* HEADER CON ESTILO DEL BANNER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Gestión de arriendos
          </h1>
          <p className="text-gray-600 text-lg">
            Administra todos los contratos de arrendamiento de tus propiedades
          </p>
        </div>

        {/* CONTENEDOR SUPERIOR CON BOTÓN Y BÚSQUEDA */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 max-w-md">
            {/* BARRA DE BÚSQUEDA */}
            <div className="relative w-full">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar arrendatario por nombre, apellido, doc, reg. inmobiliario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition duration-150 shadow-sm"
              />
            </div>
          </div>
          
          {/* BOTÓN CON COLOR AZUL COMO EL BANNER */}
          <button
            onClick={() => {
              setEditingRent(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition duration-200 font-semibold"
          >
            <FaUserPlus className="text-lg" /> Crear arriendo
          </button>
        </div>

        {/* TABLA (MANTENIENDO LOS ESTILOS EXISTENTES QUE YA COINCIDEN) */}
        <div className="rent-table-wrapper rounded-xl shadow-lg">
          <div className="rent-table-header rounded-t-xl bg-blue-700">
            📑 Lista de arriendos ({filteredRents.length}{" "}
            {filteredRents.length === 1 ? "resultado" : "resultados"})
          </div>
          <div className="overflow-x-auto">
            <table className="rent-table w-full border-collapse bg-white rounded-b-lg overflow-hidden">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-3 py-3 text-center border-0">ID</th>
                  <th className="px-3 py-3 text-left border-0">Inquilino</th>
                  <th className="px-3 py-3 text-center border-0">Inmueble</th>
                  <th className="px-3 py-3 text-center border-0">Registro</th>
                  <th className="px-3 py-3 text-center border-0">Inicio / Fin</th>
                  <th className="px-3 py-3 text-center border-0">Valor Mensual</th>
                  <th className="px-3 py-3 text-center border-0">Estado</th>
                  <th className="px-3 py-3 text-center border-0">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRents.length > 0 ? (
                  filteredRents.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 border-t border-gray-200"
                    >
                      <td className="px-3 py-3 text-center border-0">{r.id}</td>
                      <td className="px-3 py-3 text-left font-medium text-gray-800 border-0">
                        {r.primerNombreInquilino} {r.primerApellidoInquilino}
                      </td>
                      <td className="px-3 py-3 text-center text-sm border-0">
                        {r.tipoInmueble}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600 border-0">
                        {r.registroInmobiliario}
                      </td>
                      <td className="px-3 py-3 text-center text-sm whitespace-nowrap border-0">
                        {r.fechaInicio} - {r.fechaFinal}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-gray-700 border-0">
                        {r.valorMensual}
                      </td>
                      <td className="px-3 py-3 text-center border-0">
                        {getEstadoBadge(r.estado)}
                      </td>
                      <td className="px-3 py-3 text-center flex gap-2 justify-center border-0">
                        <button
                          aria-label="Editar arrendatario"
                          className="text-green-600 hover:text-green-800 transition-colors"
                          onClick={() => handleEditClick(r)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          aria-label="Ver arrendatario"
                          className="text-sky-600 hover:text-sky-800 transition-colors"
                          onClick={() => setViewingRent(r)}
                        >
                          <FaEye />
                        </button>
                        <button
                          aria-label="Eliminar arrendatario"
                          className="text-red-600 hover:text-red-800 transition-colors"
                          onClick={() => handleDelete(r.id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-6 text-center text-gray-500 border-0"
                    >
                      No se encontraron arriendos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALES CON PORTAL */}
      {renderFormModal()}
      {renderViewModal()}
    </>
  );
}