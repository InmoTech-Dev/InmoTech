import React, { useState } from "react";
import ReactDOM from 'react-dom';
import { FaUsers, FaPlus, FaEye, FaChartBar, FaSearch } from "react-icons/fa";
import "../../../../../shared/styles/globals.css";
// Importaciones de modales (asumo que contienen la estructura de modal fija y z-50)
import SaleForm from "../components/SaleForm";
import PurchaseTrackingModal from "../components/SalesTracking";
import InterestedPeopleTable from "../components/InterestedPeople";
import ViewSaleModal from "../components/ViewSale"; 

// 🔹 Componente que da color según estado
const EstadoBadge = ({ estado }) => {
  let colorClass = "bg-gray-200 text-gray-700";

  switch (estado) {
    case "Pagado":
      colorClass = "bg-green-100 text-green-800 border border-green-400";
      break;
    case "Pendiente":
      colorClass = "bg-yellow-100 text-yellow-800 border border-yellow-400";
      break;
    case "Debe":
      colorClass = "bg-red-100 text-red-800 border border-red-400";
      break;
    default:
      colorClass = "bg-gray-200 text-gray-700";
  }

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold ${colorClass}`}
    >
      {estado}
    </span>
  );
};

export function SalesManagementPage() {
  const [ventas, setVentas] = useState([
    {
      id: 1,
      registro: "110010123456",
      tipo: "Casa",
      comprador: "Juan Carlos Jaramillo Sossa",
      fecha: "22/05/2025",
      valor: "15.000.000$",
      estado: "Pagado",
      estadoSeguimiento: "Finalizado",
    },
    {
      id: 2,
      registro: "760010789012",
      tipo: "Apartamento",
      comprador: "Pablo Camargo Buitrago",
      fecha: "10/02/2025",
      valor: "32.500.000$",
      estado: "Pendiente",
      estadoSeguimiento: "Iniciado",
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [viewingSale, setViewingSale] = useState(null);
  const [trackingSale, setTrackingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInterestedPeople, setShowInterestedPeople] = useState(false);

  const nextId =
    ventas.length > 0 ? Math.max(...ventas.map((v) => v.id)) + 1 : 1;

  const handleViewClick = (sale) => {
    setViewingSale(sale);
  };

  const handleTrackingClick = (sale) => {
    setTrackingSale(sale);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleSaveSale = (saleData) => {
    // Crear nueva venta
    const newSale = {
      id: nextId,
      registro: saleData.inmuebleRegistro,
      tipo: saleData.inmuebleTipo,
      comprador: saleData.compradorNombreCompleto,
      fecha: new Date().toLocaleDateString("es-CO"),
      valor: saleData.inmueblePrecio + "$",
      estado: "Pendiente",
      estadoSeguimiento: "Iniciado",

      // Guardar detalles de la transacción (simplificado)
      ...saleData,
    };
    setVentas((prev) => [...prev, newSale]);
    handleCloseForm();
  };

  const handleUpdateTracking = (updatedSale) => {
    setVentas((prevVentas) =>
      prevVentas.map((v) =>
        v.id === updatedSale.id ? { ...v, ...updatedSale } : v
      )
    );
    setTrackingSale(null);
  };

  const filteredVentas = ventas.filter(
    (v) =>
      v.registro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.comprador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔑 --- FUNCIONES PARA RENDERIZAR MODALES CON PORTAL ---
  const renderFormModal = () => {
    if (!showForm) return null;

    const modalContent = (
      <SaleForm onSubmit={handleSaveSale} onClose={handleCloseForm} />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root') || document.body
    );
  };

  const renderViewModal = () => {
    if (!viewingSale) return null;

    const modalContent = (
      <ViewSaleModal
        sale={viewingSale}
        onClose={() => setViewingSale(null)}
      />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root') || document.body
    );
  };

  const renderInterestedPeopleModal = () => {
    if (!showInterestedPeople) return null;

    const modalContent = (
      <InterestedPeopleTable
        onClose={() => setShowInterestedPeople(false)}
      />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root') || document.body
    );
  };

  const renderTrackingModal = () => {
    if (!trackingSale) return null;

    const modalContent = (
      <PurchaseTrackingModal
        venta={trackingSale}
        onClose={() => setTrackingSale(null)}
        onUpdate={handleUpdateTracking}
      />
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
            Gestión de ventas
          </h1>
          <p className="text-gray-600 text-lg">
            Administra todas las transacciones de venta de tus propiedades
          </p>
        </div>

        {/* CONTENEDOR SUPERIOR CON BOTONES Y BÚSQUEDA */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 max-w-md">
            {/* BARRA DE BÚSQUEDA */}
            <div className="relative w-full">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por registro, comprador o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition duration-150 shadow-sm"
              />
            </div>
          </div>
          
          {/* BOTONES CON COLOR AZUL COMO EL BANNER */}
          <div className="flex gap-3">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition duration-200 font-semibold"
              onClick={() => setShowInterestedPeople(true)}
            >
              <FaUsers /> Personas interesadas
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition duration-200 font-semibold"
              onClick={() => setShowForm(true)}
            >
              <FaPlus /> Crear venta
            </button>
          </div>
        </div>

        {/* TABLA CON ESTILO ACTUALIZADO */}
        <div className="rent-table-wrapper rounded-xl shadow-lg">
          {/* CABECERA DE TABLA CON COLOR AZUL */}
          <div className="rent-table-header rounded-t-xl bg-blue-700">
            🏠 Lista de ventas ({filteredVentas.length}{" "}
            {filteredVentas.length === 1 ? "resultado" : "resultados"})
          </div>
          
          <div className="overflow-x-auto">
            <table className="rent-table w-full border-collapse bg-white rounded-b-lg overflow-hidden">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-3 py-3 text-center border-0">ID</th>
                  <th className="px-3 py-3 text-center border-0">Registro</th>
                  <th className="px-3 py-3 text-center border-0">Tipo</th>
                  <th className="px-3 py-3 text-center border-0">Comprador</th>
                  <th className="px-3 py-3 text-center border-0">Fecha</th>
                  <th className="px-3 py-3 text-center border-0">Valor</th>
                  <th className="px-3 py-3 text-center border-0">Estado</th>
                  <th className="px-3 py-3 text-center border-0">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVentas.length > 0 ? (
                  filteredVentas.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-gray-50 border-t border-gray-200"
                    >
                      <td className="px-3 py-3 text-center border-0">{v.id}</td>
                      <td className="px-3 py-3 text-center border-0">{v.registro}</td>
                      <td className="px-3 py-3 text-center border-0">{v.tipo}</td>
                      <td className="px-3 py-3 text-center border-0 truncate max-w-[150px]">{v.comprador}</td>
                      <td className="px-3 py-3 text-center border-0">{v.fecha}</td>
                      <td className="px-3 py-3 text-center font-semibold text-purple-700 border-0">
                        {v.valor}
                      </td>
                      <td className="px-3 py-3 text-center border-0">
                        <EstadoBadge estado={v.estado} />
                      </td>
                      <td className="px-3 py-3 text-center flex gap-3 justify-center border-0">
                        <button
                          aria-label="Ver detalles de la venta"
                          className="text-green-600 hover:text-green-800 transition-colors p-1"
                          onClick={() => handleViewClick(v)}
                        >
                          <FaEye />
                        </button>
                        <button
                          aria-label="Seguimiento de compra"
                          className="text-sky-600 hover:text-sky-800 transition-colors p-1"
                          onClick={() => handleTrackingClick(v)}
                        >
                          <FaChartBar />
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
                      No se encontraron resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALES RENDERIZADOS CON PORTAL --- */}
      {renderFormModal()}
      {renderViewModal()}
      {renderInterestedPeopleModal()}
      {renderTrackingModal()}
    </>
  );
}