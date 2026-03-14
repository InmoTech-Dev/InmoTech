import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { FaUserPlus, FaSearch, FaTimes, FaCalendar, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { Plus, Search, Filter, Eye, Edit, Trash2, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Mail, Home, Phone, X } from 'lucide-react';
import "../../../../shared/styles/globals.css"
import BuyerForm from "../../components/sales/BuyerForm";
import BuyerViewModal from "../../components/sales/BuyerView";
import { buyersApiService } from "../../../../shared/services/buyersApiService";
import MESSAGES from "../../../../shared/constants/messages";
import { useToast } from "../../../../shared/hooks/use-toast";

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
        ultimaVenta: buyer.ultima_venta || buyer.compra || null,
        inmueblesComprados: (buyer.inmueble || buyer.compra?.inmueble) ? [buyer.inmueble || buyer.compra?.inmueble] : [],
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
    const { toast } = useToast();

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
            showStatus("error", error.message || MESSAGES.buyer.loadError);
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
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredBuyers = normalizedSearch
        ? compradores.filter((buyer) => {
              const fullName = [
                  buyer.primerNombre,
                  buyer.segundoNombre,
                  buyer.primerApellido,
                  buyer.segundoApellido,
              ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

              return (
                  fullName.includes(normalizedSearch) ||
                  (buyer.documento || "").toLowerCase().includes(normalizedSearch) ||
                  (buyer.tipoDocumento || "").toLowerCase().includes(normalizedSearch) ||
                  (buyer.correo || "").toLowerCase().includes(normalizedSearch) ||
                  (buyer.telefono || "").toLowerCase().includes(normalizedSearch)
              );
          })
        : compradores;

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
            showStatus("success", MESSAGES.buyer.create);
            toast({
                title: "Comprador creado",
                description: MESSAGES.buyer.create,
                variant: "default",
            });
            handleCloseForm();
        } catch (error) {
            const errMsg = error.message || MESSAGES.buyer.createError || "No fue posible crear el comprador";
            showStatus("error", errMsg);
            toast({
                title: "Error al crear comprador",
                description: errMsg,
                variant: "destructive",
            });
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
            showStatus("success", MESSAGES.buyer.update);
            toast({
                title: "Comprador actualizado",
                description: MESSAGES.buyer.update,
                variant: "default",
            });
            handleCloseForm();
        } catch (error) {
            const errMsg = error.message || MESSAGES.buyer.updateError || "No fue posible actualizar el comprador";
            showStatus("error", errMsg);
            toast({
                title: "Error al actualizar",
                description: errMsg,
                variant: "destructive",
            });
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
            showStatus("success", MESSAGES.buyer.delete);
            toast({
                title: "Comprador eliminado",
                description: MESSAGES.buyer.delete,
                variant: "default",
            });
        } catch (error) {
            const errMsg = error.message || MESSAGES.buyer.deleteError || "No fue posible eliminar al comprador";
            showStatus("error", errMsg);
            toast({
                title: "Error al eliminar",
                description: errMsg,
                variant: "destructive",
            });
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

    const renderDeleteModal = () => {
        if (!buyerToDelete) return null;

        const modalContent = (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop estilo formularios */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleCancelDelete}
            />

            {/* Modal card estilo formularios */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-200">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 border border-red-200">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                    <h3 className="text-xl font-bold text-slate-800">Confirmar eliminación</h3>
                    <p className="text-slate-600 mt-1 text-sm">Esta acción es irreversible.</p>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCancelDelete}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </motion.button>
                </div>

                {/* Content */}
                <div className="p-6">
                <p className="text-slate-700">
                    ¿Estás seguro de que deseas eliminar a{" "}
                    <span className="font-semibold text-slate-900">
                    {buyerToDelete.primerNombre} {buyerToDelete.primerApellido}
                    </span>
                    ? Esta acción no se puede deshacer.
                </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-6 rounded-b-2xl">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancelDelete}
                    className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    Cancelar
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                    isDeleting
                        ? "bg-slate-400 text-slate-200 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                >
                    {isDeleting ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Eliminando...
                    </>
                    ) : (
                    <>
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </>
                    )}
                </motion.button>
                </div>
            </motion.div>
            </div>
        );

        return ReactDOM.createPortal(
            modalContent,
            document.getElementById("modal-root") || document.body
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
                {/* Se oculta el banner superior; usamos solo toasts */}

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
                {/* TABLA ESTILO ARRENDATARIOS */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Información Personal</th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Documento</th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Inmueble Asignado</th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Contacto</th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                    {isLoading ? (
                                        <tr>
                                            <td
                                                colSpan="6"
                                            className="px-6 py-8 text-center text-slate-500"
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                    Cargando compradores...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredBuyers.length > 0 ? (
                                        filteredBuyers.map((c) => {
                                            const nombreCompleto = [c.primerNombre, c.segundoNombre, c.primerApellido, c.segundoApellido].filter(Boolean).join(' ');
                                            const estado = c.estado || 'Activo';
                                            const estadoClass =
                                              estado.toLowerCase() === 'activo'
                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                : 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                            return (
                                            <tr
                                                key={c.id}
                                                className="hover:bg-slate-50 transition-colors"
                                            >
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-sm font-semibold text-slate-800">{nombreCompleto || 'Sin nombre'}</div>
                                                    <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {c.correo || 'Sin correo'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-700">
                                                    <div className="text-xs text-slate-500">Tipo</div>
                                                    <div className="font-medium">{c.tipoDocumento || 'N/D'}</div>
                                                    <div className="text-xs text-slate-500 mt-1">Número</div>
                                                    <div className="text-sm font-semibold text-slate-800">{c.documento || 'N/D'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-600">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Home className="w-4 h-4 text-slate-400" />
                                                        <span className="text-xs text-slate-500">
                                                            {c.inmueble
                                                                ? (c.inmueble.titulo ||
                                                                    c.inmueble.registro_inmobiliario ||
                                                                    c.inmueble.direccion ||
                                                                    'Inmueble asignado')
                                                                : 'Sin inmuebles asignados'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-700">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Phone className="w-4 h-4 text-slate-400" />
                                                        <span>{c.telefono || 'Sin teléfono'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${estadoClass}`}>
                                                        {estado}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            aria-label="Ver comprador"
                                                            className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                                                            onClick={() => handleViewClick(c)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            aria-label="Editar comprador"
                                                            className="p-2 text-green-600 hover:text-green-800 transition-colors"
                                                            onClick={() => handleEditClick(c)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            aria-label="Eliminar comprador"
                                                            className="p-2 text-red-600 hover:text-red-800 transition-colors"
                                                            onClick={() => handleDeleteRequest(c)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="6"
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
