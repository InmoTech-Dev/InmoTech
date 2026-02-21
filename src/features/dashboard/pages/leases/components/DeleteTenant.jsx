import React, { useState } from "react";
import { FaUser, FaPlus, FaEdit, FaEye, FaTrash } from "react-icons/fa";
import DashboardLayout from "../../../../../shared/components/dashboard/Layout/DashboardLayout";
import "../../../../../shared/styles/globals.css";
import LeasesPersonForm from "../components/TenantForm";
import ViewTenantModal from "../components/ViewTenantModal";
import EditTenantForm from "../components/EditTenantForm";
import DeleteTenantModal from "../components/DeleteTenant";

export function LeasesManagementPage() {
  const [arrendatarios, setArrendatarios] = useState([
    {
      id: 1,
      tipo: "CC",
      documento: "11.111.111",
      primerNombre: "Juan",
      segundoNombre: "Carlos",
      primerApellido: "Jaramillo",
      segundoApellido: "Sossa",
      correo: "FerCarSossa@gmail.com",
      telefono: "3123278776",
    },
    {
      id: 2,
      tipo: "CC",
      documento: "10.101.010",
      primerNombre: "Pablo",
      segundoNombre: "",
      primerApellido: "Camargo",
      segundoApellido: "Buitrago",
      correo: "BuitragoPablo@gmail.com",
      telefono: "3123225634",
    },
    {
      id: 3,
      tipo: "CC",
      documento: "12.121.212",
      primerNombre: "Fernando",
      segundoNombre: "Andres",
      primerApellido: "Patiño",
      segundoApellido: "Sepulveda",
      correo: "AndresSepulveda@gmail.com",
      telefono: "3004587808",
    },
  ]);

  // Estados de control
  const [showForm, setShowForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [viewTenant, setViewTenant] = useState(null);
  const [editTenant, setEditTenant] = useState(null);
  const [deleteTenant, setDeleteTenant] = useState(null);

  // Crear nuevo arrendatario
  const handleAddTenant = (nuevoArrendatario) => {
    setArrendatarios([
      ...arrendatarios,
      { ...nuevoArrendatario, id: Date.now() },
    ]);
  };

  // Actualizar arrendatario
  const handleUpdateTenant = (updatedTenant) => {
    setArrendatarios(
      arrendatarios.map((a) =>
        a.id === updatedTenant.id ? updatedTenant : a
      )
    );
  };

  // Eliminar arrendatario
  const handleDeleteTenant = (id) => {
    setArrendatarios(arrendatarios.filter((a) => a.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="rent-page">
        {/* Encabezado */}
        <header className="rent-header flex justify-between items-center mb-4">
          <h1 className="rent-title text-2xl font-bold">Gestión de arrendatarios</h1>
          <button
            className="rent-btn bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2"
            onClick={() => setShowForm(true)}
          >
            <FaPlus /> Crear arrendatario
          </button>
        </header>

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar arrendatario..."
          className="rent-search border p-2 w-full mb-4 rounded"
        />

        {/* Tabla */}
        <div className="rent-table-wrapper">
          <div className="rent-table-header flex items-center gap-2 mb-2 font-semibold">
            <FaUser /> Lista de arrendatarios
          </div>
          <table className="w-full border-collapse bg-white shadow-md rounded-b-lg overflow-hidden">
            <thead className="bg-green-50">
              <tr>
                <th className="px-4 py-2 text-center">ID</th>
                <th className="px-4 py-2 text-center">Tipo documento</th>
                <th className="px-4 py-2 text-center">#Documento</th>
                <th className="px-4 py-2 text-center">Primer Nombre</th>
                <th className="px-4 py-2 text-center">Segundo Nombre</th>
                <th className="px-4 py-2 text-center">Primer Apellido</th>
                <th className="px-4 py-2 text-center">Segundo Apellido</th>
                <th className="px-4 py-2 text-center">Correo</th>
                <th className="px-4 py-2 text-center">Teléfono</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {arrendatarios.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-center">{a.id}</td>
                  <td className="px-4 py-2 text-center">{a.tipo}</td>
                  <td className="px-4 py-2 text-center">{a.documento}</td>
                  <td className="px-4 py-2 text-center">{a.primerNombre}</td>
                  <td className="px-4 py-2 text-center">{a.segundoNombre}</td>
                  <td className="px-4 py-2 text-center">{a.primerApellido}</td>
                  <td className="px-4 py-2 text-center">{a.segundoApellido}</td>
                  <td className="px-4 py-2 text-center text-blue-600 underline">
                    <a href={`mailto:${a.correo}`}>{a.correo}</a>
                  </td>
                  <td className="px-4 py-2 text-center">{a.telefono}</td>
                  <td className="px-4 py-2 text-center flex gap-3 justify-center">
                    <button
                      className="text-green-600 hover:text-green-800"
                      onClick={() => setEditTenant(a)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setViewTenant(a)}
                    >
                      <FaEye />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setDeleteTenant(a)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Crear */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg w-[550px]">
              <LeasesPersonForm
                onClose={() => setShowForm(false)}
                onSave={handleAddTenant}
              />
            </div>
          </div>
        )}

        {/* Modal Ver */}
        {viewTenant && (
          <ViewTenantModal
            tenant={viewTenant}
            onClose={() => setViewTenant(null)}
          />
        )}

        {/* Modal Editar */}
        {editTenant && (
          <EditTenantForm
            tenant={editTenant}
            onClose={() => setEditTenant(null)}
            onUpdate={handleUpdateTenant}
          />
        )}

        {/* Modal Eliminar */}
        {deleteTenant && (
          <DeleteTenantModal
            tenant={deleteTenant}
            onClose={() => setDeleteTenant(null)}
            onDelete={handleDeleteTenant}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
