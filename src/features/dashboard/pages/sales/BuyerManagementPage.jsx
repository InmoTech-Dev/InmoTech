import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { FaUserPlus, FaEye, FaEdit, FaSearch, FaTrash, FaTimes, FaCalendar, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { Plus, Search, Filter, Eye, Edit, Trash2, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import "../../../../shared/styles/globals.css"
import BuyerForm from "../../components/sales/BuyerForm";
import BuyerViewModal from "../../components/sales/BuyerView";
import { buyersApiService } from "../../../../shared/services/buyersApiService";

const mapApiBuyerToRow = (buyer = {}, formData = {}) => {
    const info = {
        // id debe ser el id del comprador (id_comprador) para que las operaciones de actualización funcionen
        id: buyer.buyerId || buyer.id_buyer || buyer.id_comprador || buyer.id || buyer.personaId || buyer.persona?.id_persona,
        personaId: buyer.personaId || buyer.id_persona || buyer.persona?.id_persona,
        tipoDocumento: buyer.tipoDocumento || buyer.persona?.tipo_documento || "CC",
        documento: buyer.documento || buyer.persona?.numero_documento || "",
        primerNombre: buyer.primerNombre || buyer.persona?.nombre_completo?.split(" ")[0] || "",
        segundoNombre: buyer.segundoNombre || "",
        primerApellido: buyer.primerApellido || buyer.persona?.apellido_completo?.split(" ")[0] || "",
        segundoApellido: buyer.segundoApellido || "",
        correo: buyer.correo || buyer.persona?.correo || "",
        telefono: buyer.telefono || buyer.persona?.telefono || "",
        estado: buyer.estado || buyer.compra?.estado || "Activo",
        fechaCompra: buyer.fechaCompra || buyer.compra?.fecha_compra || "",
        valorCompra: buyer.valorCompra || buyer.compra?.valor_compra || "",
        tipoCompra: buyer.tipoCompra || buyer.compra?.tipo_compra || "",
        ciudadResidencia: buyer.ciudadResidencia || buyer.compra?.ciudad_residencia || "",
        direccionAnterior: buyer.direccionAnterior || buyer.compra?.direccion_anterior || "",
        entidadFinanciera: buyer.entidadFinanciera || buyer.compra?.entidad_financiera || "",
        numeroCredito: buyer.numeroCredito || buyer.compra?.numero_credito || "",
        montoFinanciado: buyer.montoFinanciado || buyer.compra?.monto_financiado || "",
        observaciones: buyer.observaciones || buyer.compra?.observaciones || "",
        inmueble: buyer.inmueble || buyer.compra?.inmueble || null,
        formData: buyer.formData || formData,
        compra: buyer.compra || null,
        raw: buyer
    };
    return info;
};

const filterRealBuyers = (list = []) => {
    if (!Array.isArray(list)) return [];
    return list.filter((buyer) => {
        if (!buyer) return false;
        return Boolean(
            buyer.buyerId ||
            buyer.id_buyer ||
            buyer.id_comprador ||
            buyer.registroComprador ||
            buyer.raw?.id_buyer ||
            buyer.raw?.id_comprador ||
            buyer.raw?.registro_comprador
        );
    });
};

export function BuyersManagementPage() {
    const [compradores, setCompradores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    // --- ESTADOS DE ACCION ---
    const [searchTerm, setSearchTerm] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [buyerToEdit, setBuyerToEdit] = useState(null);
    const [buyerToView, setBuyerToView] = useState(null);
    const [buyerToDelete, setBuyerToDelete] = useState(null);

    const showStatus = (type, message) => {
        setStatusMessage({ type, message });
    };

    const normalizeBuyers = (list) =>
        list.map((buyer) => mapApiBuyerToRow(buyer));
    const fetchBuyers = useCallback(async (query = "") => {
        try {
            setIsLoading(true);
            const params = query ? { search: query } : {};
            const buyers = await buyersApiService.getAll(params);
            setCompradores(normalizeBuyers(filterRealBuyers(buyers)));
        } catch (error) {
            showStatus("error", error.message || "No fue posible cargar los compradores");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBuyers();
    }, [fetchBuyers]);

    useEffect(() => {
        const trimmed = searchTerm.trim();
        const timeoutId = setTimeout(() => {
            fetchBuyers(trimmed);
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, fetchBuyers]);

    // --- FILTRO DE BÚSQUEDA ---
    const filteredBuyers = compradores;

    // --- HANDLERS GENERALES ---
    const handleCloseForm = () => {
        setShowForm(false);
        setBuyerToEdit(null);
    };

    const handleCloseViewModal = () => {
        setBuyerToView(null);
    };

    // --- HANDLERS CREAR/EDITAR/VER ---
    const handleNewClick = () => {
        setBuyerToEdit(null);
        setShowForm(true);
    };
    
    const handleEditClick = (buyer) => {
        setBuyerToEdit(buyer);
        setShowForm(true);
    };

    const handleViewClick = (buyer) => {
        setBuyerToView(buyer);
    };

    const handleCreateBuyer = async (formData) => {
        try {
            setFormSubmitting(true);
            const newBuyer = await buyersApiService.create(formData);
            const mapped = mapApiBuyerToRow(newBuyer, formData);
            setCompradores((prev) => [mapped, ...prev.filter((buyer) => buyer.id !== mapped.id)]);
            showStatus("success", "Comprador registrado correctamente");
            handleCloseForm();
        } catch (error) {
            showStatus("error", error.message || "No fue posible crear el comprador");
            throw error;
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleUpdateBuyer = async (formData) => {
        if (!buyerToEdit) return;
        const targetId =
            buyerToEdit.id ||
            buyerToEdit.buyerId ||
            buyerToEdit.id_buyer ||
            buyerToEdit.id_comprador ||
            buyerToEdit.personaId;
        if (!targetId) {
            showStatus("error", "No se pudo determinar el identificador del comprador a actualizar.");
            return;
        }

        try {
            setFormSubmitting(true);
            const updatedBuyer = await buyersApiService.update(targetId, formData);
            const mapped = mapApiBuyerToRow(updatedBuyer, formData);
            setCompradores((prev) =>
                prev.map((buyer) => (buyer.id === mapped.id ? mapped : buyer))
            );
            showStatus("success", "Comprador actualizado correctamente");
            handleCloseForm();
        } catch (error) {
            showStatus("error", error.message || "No fue posible actualizar el comprador");
            throw error;
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleSubmit = (formData) => {
        if (buyerToEdit) {
            return handleUpdateBuyer(formData);
        }
        return handleCreateBuyer(formData);
    };

    // --- HANDLERS ELIMINAR ---
    const handleDeleteRequest = (buyer) => {
        setBuyerToDelete(buyer);
    };

    const handleCancelDelete = () => {
        setBuyerToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!buyerToDelete) return;
        const targetId = buyerToDelete.id || buyerToDelete.personaId;
        if (!targetId) {
            showStatus("error", "No se pudo determinar el identificador del comprador a eliminar.");
            return;
        }

        try {
            setIsDeleting(true);
            const removedBuyer = await buyersApiService.delete(targetId);
            const removedId = removedBuyer?.id ?? targetId;
            setCompradores((prev) =>
                prev.filter((b) => (b.id ?? b.personaId) !== removedId)
            );
            showStatus("success", "Comprador eliminado correctamente");
        } catch (error) {
            showStatus("error", error.message || "No fue posible eliminar al comprador");
        } finally {
            setIsDeleting(false);
            setBuyerToDelete(null);
        }
    };

    // --- FUNCIÓN PARA RENDERIZAR EL FORMULARIO COMO MODAL CON PORTAL ---
    const renderFormModal = () => {
        if (!showForm) return null;

        const modalContent = (
            <BuyerForm
                onSubmit={handleSubmit}
                onClose={handleCloseForm}
                nextId={buyerToEdit ? buyerToEdit.id : compradores.length + 1}
                initialData={buyerToEdit}
                isSubmitting={formSubmitting}
            />
        );

        return ReactDOM.createPortal(
            modalContent,
            document.getElementById('modal-root') || document.body
        );
    };

    // --- FUNCIÓN PARA RENDERIZAR EL MODAL DE VISUALIZACIÓN CON PORTAL ---
    const renderViewModal = () => {
        if (!buyerToView) return null;

        const modalContent = (
            <BuyerViewModal buyer={buyerToView} onClose={handleCloseViewModal} />
        );

        return ReactDOM.createPortal(
            modalContent,
            document.getElementById('modal-root') || document.body
        );
    };

    // --- FUNCIÓN INTERNA PARA RENDERIZAR EL MODAL DE ELIMINACIÓN ---
    const renderDeleteModal = () => {
        if (!buyerToDelete) return null;

        const modalContent = (
            <div 
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm transition-opacity duration-300"
                onClick={handleCancelDelete} 
            >
                <div
                    className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-100 opacity-100"
                    onClick={(e) => e.stopPropagation()} 
                >
                    <h3 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" /> Confirmar Eliminación
                    </h3>
                    <p className="mb-6 text-gray-700">
                        ¿Estás seguro de que deseas eliminar a
                        <span className="font-extrabold text-purple-700"> {buyerToDelete.primerNombre} {buyerToDelete.primerApellido}</span>
                        ? Esta acción es irreversible.
                    </p>
                    
                    <div className="flex justify-end gap-3 pt-3 border-t">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCancelDelete}
                            className="bg-gray-300 text-gray-800 px-5 py-2 rounded-xl font-semibold hover:bg-gray-400 transition duration-150"
                        >
                            Cancelar
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className={`bg-red-600 text-white px-5 py-2 rounded-xl font-semibold transition duration-150 shadow-md flex items-center gap-2 ${
                                isDeleting ? "opacity-70 cursor-not-allowed" : "hover:bg-red-700"
                            }`}
                        >
                            {!isDeleting && <Trash2 className="w-4 h-4" />}
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </motion.button>
                    </div>
                </div>
            </div>
        );

        return ReactDOM.createPortal(
            modalContent,
            document.getElementById('modal-root') || document.body 
        );
    };

    // Calcular estadísticas
    const stats = {
        total: filteredBuyers.length,
        activos: filteredBuyers.filter(b => b.estado === 'activo').length,
        inactivos: filteredBuyers.filter(b => b.estado === 'inactivo').length,
    };

    // --- RENDERIZADO PRINCIPAL ---
    return (
        <>
            <div className="p-6 space-y-6">
                {statusMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-6 rounded-lg border px-4 py-3 text-sm font-semibold ${
                            statusMessage.type === "error"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-green-200 bg-green-50 text-green-800"
                        }`}
                    >
                        {statusMessage.message}
                    </motion.div>
                )}

                {/* HEADER CON NUEVO ESTILO */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Gestión de Compradores</h1>
                        <p className="text-slate-600 mt-1">Administra toda la información de tus compradores</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNewClick}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Comprador
                    </motion.button>
                </motion.div>

                {/* SEARCH AND FILTERS */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                >
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar comprador por nombre, apellido, doc, correo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-150 shadow-sm bg-white"
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300"
                        >
                            <Filter className="w-4 h-4" />
                            Filtros
                        </motion.button>
                    </div>
                </motion.div>

                {/* CONTENT AREA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                {/* TABLA CON ESTILO UNIFICADO */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
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
                                    {isLoading ? (
                                        <tr>
                                            <td
                                                colSpan="9"
                                            className="px-6 py-8 text-center text-slate-500"
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                    Cargando compradores...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredBuyers.length > 0 ? (
                                        filteredBuyers.map((c) => (
                                            <tr
                                                key={c.id}
                                                className="hover:bg-slate-50 transition-colors"
                                            >
                                                <td className="px-6 py-4 text-center text-sm text-slate-700">{c.tipoDocumento}</td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-700 font-medium">{c.documento}</td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-700">{c.primerNombre}</td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-500">
                                                    {c.segundoNombre || "-"}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-700">{c.primerApellido}</td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-500">
                                                    {c.segundoApellido || "-"}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <a
                                                        href={`mailto:${c.correo}`}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                                                    >
                                                        {c.correo}
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-700">{c.telefono}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            aria-label="Editar comprador"
                                                            className="text-green-600 hover:text-green-800 transition-colors p-1 rounded-lg hover:bg-green-50"
                                                            onClick={() => handleEditClick(c)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            aria-label="Ver comprador"
                                                            className="text-sky-600 hover:text-sky-800 transition-colors p-1 rounded-lg hover:bg-sky-50"
                                                            onClick={() => handleViewClick(c)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            aria-label="Eliminar comprador"
                                                            className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-lg hover:bg-red-50"
                                                            onClick={() => handleDeleteRequest(c)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="9"
                                                className="px-6 py-8 text-center text-slate-500"
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <AlertCircle className="w-8 h-8 text-slate-400" />
                                                    <p>No se encontraron compradores.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* MODALES CON PORTAL - TODOS SE RENDERIZAN EN EL MISMO SITIO */}
            {renderFormModal()}
            {renderViewModal()}
            {renderDeleteModal()}
        </>
    );
}
