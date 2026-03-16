import React, { useEffect, useState, useCallback, useRef } from "react";
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Eye, Edit, AlertCircle, Mail, Home, Phone, ChevronDown } from 'lucide-react';
import "../../../../shared/styles/globals.css"
import BuyerForm from "../../components/sales/BuyerForm";
import BuyerViewModal from "../../components/sales/BuyerView";
import { buyersApiService } from "../../../../shared/services/buyersApiService";
import MESSAGES from "../../../../shared/constants/messages";
import { useToast } from "../../../../shared/hooks/use-toast";
import { Pagination } from "../../pages/Inmuebles/components/common/pagination";

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
        medioPago:
            buyer.medioPago ||
            buyer.medio_pago ||
            buyer.compra?.medioPago ||
            buyer.compra?.medio_pago ||
            buyer.ultimaVenta?.medioPago ||
            buyer.ultimaVenta?.medio_pago ||
            buyer.ultima_venta?.medioPago ||
            buyer.ultima_venta?.medio_pago ||
            buyer.tipoCompra ||
            buyer.ultimaVenta?.tipo_compra ||
            buyer.ultima_venta?.tipo_compra ||
            buyer.compra?.tipo_compra ||
            "",
        medioPagoDescripcion:
            buyer.medioPagoDescripcion ||
            buyer.medio_pago_descripcion ||
            buyer.compra?.medioPagoDescripcion ||
            buyer.compra?.medio_pago_descripcion ||
            buyer.compra?.descripcion_pago ||
            buyer.ultimaVenta?.medioPagoDescripcion ||
            buyer.ultimaVenta?.medio_pago_descripcion ||
            buyer.ultimaVenta?.descripcion_pago ||
            buyer.ultima_venta?.medioPagoDescripcion ||
            buyer.ultima_venta?.medio_pago_descripcion ||
            buyer.ultima_venta?.descripcion_pago ||
            "",
        ciudadResidencia: buyer.ciudadResidencia || buyer.compra?.ciudad_residencia || "",
        direccionAnterior: buyer.direccionAnterior || buyer.compra?.direccion_anterior || "",
        entidadFinanciera: buyer.entidadFinanciera || buyer.compra?.entidad_financiera || "",
        numeroCredito: buyer.numeroCredito || buyer.compra?.numero_credito || "",
        montoFinanciado: buyer.montoFinanciado || buyer.compra?.monto_financiado || "",
        observaciones: buyer.observaciones || buyer.compra?.observaciones || "",
        inmueble: buyer.inmueble || buyer.compra?.inmueble || null,
        ultimaVenta: buyer.ultimaVenta || buyer.ultima_venta || buyer.compra || null,
        inmueblesComprados: (buyer.inmueble || buyer.compra?.inmueble) ? [buyer.inmueble || buyer.compra?.inmueble] : [],
        formData: buyer.formData || formData,
        compra: buyer.compra || null,
        raw: buyer
    };
    return info;
};

const hasAssociatedSale = (buyer = {}) =>
    Boolean(
        buyer.compra ||
        buyer.ultimaVenta ||
        buyer.ultima_venta ||
        buyer.fechaCompra ||
        buyer.valorCompra ||
        buyer.inmueble ||
        (Array.isArray(buyer.inmueblesComprados) && buyer.inmueblesComprados.length > 0)
    );

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

const normalizeEstado = (estado = "") => (estado || "").toString().trim().toLowerCase();

export function BuyersManagementPage() {
    const PAGE_SIZE = 5;
    const statusButtonRefs = useRef({});
    const [compradores, setCompradores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [, setStatusMessage] = useState(null);
    const [statusChangingId, setStatusChangingId] = useState(null);
    const [statusMenuId, setStatusMenuId] = useState(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState(null);

    // --- ESTADOS DE ACCION ---
    const [searchTerm, setSearchTerm] = useState("");
    const [estadoFilter, setEstadoFilter] = useState("todos");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        pagina: 1,
        limite: PAGE_SIZE,
        paginas_totales: 1,
    });
    const [showForm, setShowForm] = useState(false);
    const [buyerToEdit, setBuyerToEdit] = useState(null);
    const [buyerToView, setBuyerToView] = useState(null);
    const { toast } = useToast();

    const showStatus = (type, message) => {
        setStatusMessage({ type, message });
    };

    const normalizeBuyers = (list) =>
        list.map((buyer) => mapApiBuyerToRow(buyer));
    const fetchBuyers = useCallback(async (query = "", page = 1) => {
        try {
            setIsLoading(true);
            const params = { page, limit: PAGE_SIZE };
            if (query) params.search = query;
            if (estadoFilter !== "todos") params.estado = estadoFilter;
            const result = await buyersApiService.getAll(params);
            setCompradores(normalizeBuyers(filterRealBuyers(result.data)));
            setPagination(result.pagination);
            setCurrentPage(result.pagination?.pagina || page);
        } catch (error) {
            showStatus("error", error.message || MESSAGES.buyer.loadError);
        } finally {
            setIsLoading(false);
        }
    }, [estadoFilter]);

    useEffect(() => {
        fetchBuyers();
    }, [fetchBuyers]);

    useEffect(() => {
        const trimmed = searchTerm.trim();
        const timeoutId = setTimeout(() => {
            setCurrentPage(1);
            fetchBuyers(trimmed, 1);
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, fetchBuyers]);

    useEffect(() => {
        setCurrentPage(1);
        fetchBuyers(searchTerm.trim(), 1);
    }, [estadoFilter, fetchBuyers, searchTerm]);

    useEffect(() => {
        if (!statusMenuId) return undefined;

        const handleOutsideClick = (event) => {
            if (event.target.closest("[data-status-menu]")) return;
            setStatusMenuId(null);
            setStatusMenuPosition(null);
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [statusMenuId]);

    useEffect(() => {
        if (!statusMenuId) return undefined;

        const updatePosition = () => {
            const button = statusButtonRefs.current[statusMenuId];
            if (!button) return;

            const rect = button.getBoundingClientRect();
            setStatusMenuPosition({
                top: rect.bottom + 8,
                left: rect.left + rect.width / 2,
            });
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [statusMenuId]);

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
        if (hasAssociatedSale(buyer)) {
            toast({
                title: "Edición bloqueada",
                description: "No puedes editar un comprador con una venta asociada.",
                variant: "destructive",
            });
            return;
        }
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
            fetchBuyers(searchTerm.trim(), 1);
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
            fetchBuyers(searchTerm.trim(), currentPage);
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

    const handleToggleEstado = async (buyer, estadoOpcion) => {
        if (!buyer) return;
        const targetId =
            buyer.id ||
            buyer.buyerId ||
            buyer.id_buyer ||
            buyer.id_comprador ||
            buyer.personaId;

        if (!targetId) {
            showStatus("error", "No se pudo determinar el comprador para cambiar el estado.");
            return;
        }

        const currentEstado = normalizeEstado(buyer.estado || "Activo");
        const nextEstado = estadoOpcion || (currentEstado === "activo" ? "Inactivo" : "Activo");

        try {
            setStatusChangingId(targetId);
            const payload = {
                estado: nextEstado,
                tipoDocumento: buyer.tipoDocumento || buyer.persona?.tipo_documento || "CC",
                documento: buyer.documento || buyer.persona?.numero_documento || "",
                primerNombre: buyer.primerNombre || buyer.persona?.nombre_completo?.split(" ")?.[0] || "",
                segundoNombre: buyer.segundoNombre || "",
                primerApellido: buyer.primerApellido || buyer.persona?.apellido_completo?.split(" ")?.[0] || "",
                segundoApellido: buyer.segundoApellido || "",
                correo: buyer.correo || buyer.persona?.correo || "",
                telefono: buyer.telefono || buyer.persona?.telefono || "",
            };
            const updated = await buyersApiService.update(targetId, payload);
            const mapped = mapApiBuyerToRow({ ...buyer, ...updated, estado: nextEstado }, buyer.formData);
            setCompradores((prev) =>
                prev.map((c) => (c.id === mapped.id ? { ...c, estado: mapped.estado || nextEstado } : c))
            );
            fetchBuyers(searchTerm.trim(), currentPage);
            toast({
                title: "Estado actualizado",
                description: `El comprador ahora está ${nextEstado}.`,
                variant: "default",
            });
        } catch (error) {
            const errMsg = error.message || "No se pudo cambiar el estado del comprador";
            showStatus("error", errMsg);
            toast({
                title: "Error al cambiar estado",
                description: errMsg,
                variant: "destructive",
            });
        } finally {
            setStatusMenuId(null);
            setStatusMenuPosition(null);
            setStatusChangingId(null);
        }
    };

    const handleStatusMenuToggle = (buyerId) => {
        if (statusMenuId === buyerId) {
            setStatusMenuId(null);
            setStatusMenuPosition(null);
            return;
        }

        const button = statusButtonRefs.current[buyerId];
        if (button) {
            const rect = button.getBoundingClientRect();
            setStatusMenuPosition({
                top: rect.bottom + 8,
                left: rect.left + rect.width / 2,
            });
        }

        setStatusMenuId(buyerId);
    };

    const renderStatusMenu = (buyer) => {
        if (!buyer || statusMenuId !== buyer.id || !statusMenuPosition) return null;

        return ReactDOM.createPortal(
            <div
                data-status-menu
                className="fixed z-[9999] w-36 -translate-x-1/2 rounded-lg border border-slate-200 bg-white py-1 text-xs shadow-xl"
                style={{
                    top: `${statusMenuPosition.top}px`,
                    left: `${statusMenuPosition.left}px`,
                }}
            >
                {["Activo", "Inactivo"].map((estadoOpcion) => (
                    <button
                        key={estadoOpcion}
                        type="button"
                        onClick={() => handleToggleEstado(buyer, estadoOpcion)}
                        className="w-full px-3 py-2 text-center hover:bg-slate-50"
                    >
                        {estadoOpcion}
                    </button>
                ))}
            </div>,
            document.getElementById('modal-root') || document.body
        );
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
                    
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                            <select
                                value={estadoFilter}
                                onChange={(e) => setEstadoFilter(e.target.value)}
                                className="pl-10 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                            >
                                <option value="todos">Todos los estados</option>
                                <option value="activo">Activos</option>
                                <option value="inactivo">Inactivos</option>
                            </select>
                        </div>
                    </div>
                </motion.div>

                {/* CONTENT AREA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                {/* TABLA ESTILO ARRENDATARIOS */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-visible">
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
                                    ) : compradores.length > 0 ? (
                                        compradores.map((c) => {
                                            const nombreCompleto = [c.primerNombre, c.segundoNombre, c.primerApellido, c.segundoApellido].filter(Boolean).join(' ');
                                            const estado = c.estado || 'Activo';
                                            const estadoNormalized = normalizeEstado(estado);
                                            const isEditBlocked = hasAssociatedSale(c);
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
                                                <td className="px-6 py-4 text-center relative">
                                                    <div className="flex flex-col items-center justify-center space-y-2" data-status-menu>
                                                        <button
                                                            type="button"
                                                            ref={(element) => {
                                                                if (element) {
                                                                    statusButtonRefs.current[c.id] = element;
                                                                } else {
                                                                    delete statusButtonRefs.current[c.id];
                                                                }
                                                            }}
                                                            onClick={() => handleStatusMenuToggle(c.id)}
                                                            disabled={statusChangingId === c.id}
                                                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition shadow-sm ${
                                                                estadoNormalized === "activo"
                                                                    ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:ring-2 hover:ring-green-200"
                                                                    : "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 hover:ring-2 hover:ring-yellow-200"
                                                            } ${statusChangingId === c.id ? "opacity-60 cursor-not-allowed" : ""} ${statusMenuId === c.id ? "ring-2 ring-slate-200" : ""}`}
                                                        >
                                                            {statusChangingId === c.id && (
                                                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                                            )}
                                                            <span>{estado}</span>
                                                            <ChevronDown className="w-3 h-3 ml-2" />
                                                        </button>
                                                        {renderStatusMenu(c)}
                                                    </div>
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
                                                            disabled={isEditBlocked}
                                                            title={isEditBlocked ? "No puedes editar un comprador con una venta asociada" : "Editar comprador"}
                                                            className={`p-2 transition-colors ${isEditBlocked ? "text-slate-300 cursor-not-allowed" : "text-green-600 hover:text-green-800"}`}
                                                            onClick={() => handleEditClick(c)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
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
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.max(pagination?.paginas_totales || 1, 1)}
                        hasPrevPage={Boolean(pagination?.has_prev_page)}
                        hasNextPage={Boolean(pagination?.has_next_page)}
                        onPageChange={(page) => {
                            if (page === currentPage || page < 1 || page > Math.max(pagination?.paginas_totales || 1, 1)) return;
                            setCurrentPage(page);
                            fetchBuyers(searchTerm.trim(), page);
                        }}
                    />
                </motion.div>
            </div>

            {/* MODALES CON PORTAL - TODOS SE RENDERIZAN EN EL MISMO SITIO */}
            {renderFormModal()}
            {renderViewModal()}
        </>
    );
}
