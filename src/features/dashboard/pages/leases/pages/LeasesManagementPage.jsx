import React, { useState, useRef } from "react";
import ReactDOM from 'react-dom';
import { FaUserPlus, FaEye, FaEdit, FaSearch, FaTrash } from "react-icons/fa";
import "../../../../../shared/styles/globals.css";

// ASUMO que estos componentes ya contienen la estructura del modal (fondo gris y z-index alto)
import LeasesPersonForm from "../components/TenantForm";
import ViewTenantModal from "../components/ViewTenantForm";

export function LeasesManagementPage() {
  const [arrendatarios, setArrendatarios] = useState([
    {
      id: 1,
      tipoDocumento: "CC",
      documento: "11.111.111",
      primerNombre: "Juan",
      segundoNombre: "Carlos",
      primerApellido: "Jaramillo",
      segundoApellido: "Sossa",
      correo: "FerCarSossa@gmail.com",
      telefono: "3123278776",
      inmueblesArrendados: [
        {
          nombre: "Apartamento Laureles",
          m2: 80,
          hab: 3,
          baños: 2,
          registro: "REG-001",
          direccion: "Calle 45 #67-89",
          tipo: "Apartamento",
          estado: "Activo",
        },
      ],
    },
    {
      id: 2,
      tipoDocumento: "CC",
      documento: "10.101.010",
      primerNombre: "Pablo",
      segundoNombre: "",
      primerApellido: "Camargo",
      segundoApellido: "Buitrago",
      correo: "BuitragoPablo@gmail.com",
      telefono: "3123225634",
      inmueblesArrendados: [],
    },
    {
      id: 3,
      tipoDocumento: "CC",
      documento: "12.121.212",
      primerNombre: "Fernando",
      segundoNombre: "Andres",
      primerApellido: "Patiño",
      segundoApellido: "Sepulveda",
      correo: "AndresSepulveda@gmail.com",
      telefono: "3004587808",
      inmueblesArrendados: [],
    },
  ]);

  const idCounter = useRef(arrendatarios.length + 1);

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState(null);
  const [tenantToView, setTenantToView] = useState(null);

  const filteredTenants =
    searchTerm.trim() === ""
      ? arrendatarios
      : arrendatarios.filter((t) => {
          const lower = searchTerm.toLowerCase();
          return (
            t.primerNombre.toLowerCase().includes(lower) ||
            (t.segundoNombre && t.segundoNombre.toLowerCase().includes(lower)) ||
            t.primerApellido.toLowerCase().includes(lower) ||
            (t.segundoApellido && t.segundoApellido.toLowerCase().includes(lower)) ||
            t.documento.includes(searchTerm) ||
            t.correo.toLowerCase().includes(lower) ||
            t.telefono.includes(searchTerm)
          );
        });

  const handleCloseForm = () => {
    setShowForm(false);
    setTenantToEdit(null);
  };

  const handleEditClick = (tenant) => {
    setTenantToEdit(tenant);
    setShowForm(true);
  };

  const handleViewClick = (tenant) => {
    setTenantToView(tenant);
  };

  const handleDeleteTenant = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este arrendatario?")) {
      setArrendatarios((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleCreateTenant = (data) => {
    const newTenant = { ...data, id: idCounter.current++, inmueblesArrendados: [] };
    setArrendatarios((prev) => [...prev, newTenant]);
    handleCloseForm();
  };

  const handleUpdateTenant = (updatedTenant) => {
    setArrendatarios((prev) =>
      prev.map((t) => (t.id === updatedTenant.id ? updatedTenant : t))
    );
    handleCloseForm();
  };

  const handleSubmit = tenantToEdit ? handleUpdateTenant : handleCreateTenant;

  // 🔑 --- FUNCIONES PARA RENDERIZAR MODALES CON PORTAL ---
  const renderFormModal = () => {
    if (!showForm) return null;

    const modalContent = (
      <LeasesPersonForm
        onSubmit={handleSubmit}
        onClose={handleCloseForm}
        nextId={idCounter.current}
        initialData={tenantToEdit}
      />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root') || document.body
    );
  };

  const renderViewModal = () => {
    if (!tenantToView) return null;

    const modalContent = (
      <ViewTenantModal tenant={tenantToView} onClose={() => setTenantToView(null)} />
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
            Gestión de arrendatarios
          </h1>
          <p className="text-gray-600 text-lg">
            Administra toda la información de tus arrendatarios y sus propiedades
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
                placeholder="Buscar arrendatario por nombre, apellido, doc, correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition duration-150 shadow-sm"
              />
            </div>
          </div>
          
          {/* BOTÓN CON COLOR AZUL COMO EL BANNER */}
          <button
            onClick={() => {
              setTenantToEdit(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition duration-200 font-semibold"
          >
            <FaUserPlus className="text-lg" /> Crear arrendatario
          </button>
        </div>

        {/* TABLA CON ESTILO ACTUALIZADO */}
        <div className="rent-table-wrapper rounded-xl shadow-lg">
          {/* CABECERA DE TABLA CON COLOR AZUL */}
          <div className="rent-table-header rounded-t-xl bg-blue-700">
            🏠 Lista de arrendatarios ({filteredTenants.length}{" "}
            {filteredTenants.length === 1 ? "resultado" : "resultados"})
          </div>
          
          <div className="overflow-x-auto">
            <table className="rent-table w-full border-collapse bg-white rounded-b-lg overflow-hidden">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-3 py-3 text-center border-0">ID</th>
                  <th className="px-3 py-3 text-center border-0">Tipo doc</th>
                  <th className="px-3 py-3 text-center border-0">#Documento</th>
                  <th className="px-3 py-3 text-center border-0">Primer nombre</th>
                  <th className="px-3 py-3 text-center border-0">Segundo nombre</th>
                  <th className="px-3 py-3 text-center border-0">Primer apellido</th>
                  <th className="px-3 py-3 text-center border-0">Segundo apellido</th>
                  <th className="px-3 py-3 text-center border-0">Correo</th>
                  <th className="px-3 py-3 text-center border-0">Teléfono</th>
                  <th className="px-3 py-3 text-center border-0">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length > 0 ? (
                  filteredTenants.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50 border-t border-gray-200"
                    >
                      <td className="px-3 py-3 text-center border-0">{t.id}</td>
                      <td className="px-3 py-3 text-center border-0">{t.tipoDocumento}</td>
                      <td className="px-3 py-3 text-center border-0">{t.documento}</td>
                      <td className="px-3 py-3 text-center border-0">{t.primerNombre}</td>
                      <td className="px-3 py-3 text-center border-0">
                        {t.segundoNombre || "-"}
                      </td>
                      <td className="px-3 py-3 text-center border-0">{t.primerApellido}</td>
                      <td className="px-3 py-3 text-center border-0">
                        {t.segundoApellido || "-"}
                      </td>
                      <td className="px-3 py-3 text-center border-0 truncate">
                        <a
                          href={`mailto:${t.correo}`}
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          {t.correo}
                        </a>
                      </td>
                      <td className="px-3 py-3 text-center border-0">{t.telefono}</td>
                      <td className="px-3 py-3 text-center flex gap-2 justify-center border-0">
                        <button
                          aria-label="Editar arrendatario"
                          className="text-green-600 hover:text-green-800 transition-colors"
                          onClick={() => handleEditClick(t)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          aria-label="Ver arrendatario"
                          className="text-sky-600 hover:text-sky-800 transition-colors"
                          onClick={() => handleViewClick(t)}
                        >
                          <FaEye />
                        </button>
                        <button
                          aria-label="Eliminar arrendatario"
                          className="text-red-600 hover:text-red-800 transition-colors"
                          onClick={() => handleDeleteTenant(t.id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="px-4 py-6 text-center text-gray-500 border-0">
                      No se encontraron arrendatarios.
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