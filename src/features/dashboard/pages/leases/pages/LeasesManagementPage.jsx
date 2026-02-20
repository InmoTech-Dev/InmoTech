import React, { useState, useRef } from "react";
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setTenantToEdit(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition duration-200 font-semibold"
          >
            <Plus className="w-4 h-4" /> Crear arrendatario
          </motion.button>
        </div>

        {/* TABLA ESTILO GESTIÓN DE ARRIENDOS */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">
              🏠 Lista de arrendatarios ({filteredTenants.length}{" "}
              {filteredTenants.length === 1 ? "resultado" : "resultados"})
            </h2>
            <p className="text-sm text-slate-500">Tabla unificada con el mismo estilo de Gestión de Arriendos</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo doc</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">#Documento</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Primer nombre</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Segundo nombre</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Primer apellido</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Segundo apellido</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Correo</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTenants.length > 0 ? (
                  filteredTenants.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-center text-sm text-slate-700">{t.id}</td>
                      <td className="px-6 py-4 text-center text-sm text-slate-700">{t.tipoDocumento}</td>
                      <td className="px-6 py-4 text-center text-sm text-slate-700 font-medium">{t.documento}</td>
                      <td className="px-6 py-4 text-center text-sm text-slate-700">{t.primerNombre}</td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">
                        {t.segundoNombre || "-"}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-700">{t.primerApellido}</td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">
                        {t.segundoApellido || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <a
                          href={`mailto:${t.correo}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                        >
                          {t.correo}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-700">{t.telefono}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            aria-label="Ver arrendatario"
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            onClick={() => handleViewClick(t)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            aria-label="Editar arrendatario"
                            className="text-green-600 hover:text-green-800 transition-colors"
                            onClick={() => handleEditClick(t)}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            aria-label="Eliminar arrendatario"
                            className="text-red-600 hover:text-red-800 transition-colors"
                            onClick={() => handleDeleteTenant(t.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                        <p>No se encontraron arrendatarios.</p>
                      </div>
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
