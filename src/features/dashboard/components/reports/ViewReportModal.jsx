import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../../../../shared/components/ui/badge';
import { Button } from '../../../../shared/components/ui/button';
import {
  XCircleIcon,
  X,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  HomeIcon,
  FileTextIcon,
  DollarSignIcon,
  ClipboardListIcon,
  ImageIcon,
  FileIcon,
  DownloadIcon,
  EyeIcon,
  Plus
} from 'lucide-react';
import { ImageViewer } from '../../../../shared/components/ui/ImageViewer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function ViewReportModal({ isOpen, onClose, report, onEdit }) {
  const [viewerConfig, setViewerConfig] = React.useState({
    isOpen: false,
    currentIndex: 0
  });

  const openViewer = (index) => {
    setViewerConfig({
      isOpen: true,
      currentIndex: index
    });
  };

  if (!isOpen || !report) return null;

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPP', { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Función para obtener el color de la insignia según el estado
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'en proceso':
      case 'en-proceso':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completado':
      case 'finalizado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cotizando':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'sin novedades':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Función para obtener el color de la insignia según el estado del seguimiento
  const getFollowUpStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'iniciado':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'en-proceso':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cotizando':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'finalizado':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Calcular total de rubros
  const totalRubros = report.rubros?.reduce((total, rubro) => total + (rubro.valorTotal || 0), 0) || 0;

  // Filtrar rubros activos
  const rubrosActivos = report.rubros?.filter(rubro => rubro.activo !== false) || [];

  // Calcular resumen de progreso
  const calcularResumen = () => {
    const totalRubros = rubrosActivos.length;
    const totalSeguimientos = rubrosActivos.reduce((acc, rubro) => acc + (rubro.seguimientos?.length || 0), 0);
    const totalProcesos = rubrosActivos.reduce((acc, rubro) => {
      return acc + (rubro.seguimientos?.reduce((segAcc, seg) => segAcc + (seg.subSeguimientos || 0), 0) || 0);
    }, 0) + totalSeguimientos;

    const pendientes = rubrosActivos.filter(r => r.estado === 'Pendiente').length;
    const enProceso = rubrosActivos.filter(r => r.estado === 'En proceso').length;

    return {
      totalRubros,
      totalSeguimientos,
      totalProcesos: totalProcesos,
      pendientes,
      enProceso
    };
  };

  const resumen = calcularResumen();

  // NUEVO: items de información visual estilo Citas
  const infoItems = [
    {
      key: 'ubicacion',
      icon: MapPinIcon,
      label: 'Ubicación',
      value: report.ubicacion || 'No definido',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      key: 'tipoInmueble',
      icon: HomeIcon,
      label: 'Tipo de Inmueble',
      value: report.tipoInmueble || 'No definido',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      key: 'referencia',
      icon: FileTextIcon,
      label: 'Referencia',
      value: report.referencia || 'No definido',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      key: 'propietario',
      icon: UserIcon,
      label: 'Propietario',
      value: report.propietario || 'No definido',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      key: 'tipoReporte',
      icon: FileTextIcon,
      label: 'Título del Reporte',
      value: report.tipoReporte || 'No definido',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      key: 'responsable',
      icon: UserIcon,
      label: 'Responsable',
      value: report.responsable || 'No asignado',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      key: 'estado',
      icon: CalendarIcon,
      label: 'Estado',
      value: report.estado || 'No definido',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      key: 'fecha',
      icon: CalendarIcon,
      label: 'Fecha de Creación',
      value: formatDate(report.fecha),
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <EyeIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Ver Detalles del Reporte</h2>
                  <p className="text-sm text-slate-600">
                    {report.tipoReporte} - ID: {report.id}
                  </p>
                </div>
                <Badge className={`${getStatusColor(report.estado)} text-sm px-3 py-1 ml-4`}>
                  {report.estado || 'No definido'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {onEdit && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onEdit(report);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <FileTextIcon className="w-4 h-4" />
                    Editar
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <XCircleIcon className="w-5 h-5 text-slate-500" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
              <div className="space-y-6">
                {/* Información Principal - estilo Citas */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <HomeIcon className="w-5 h-5 text-slate-600" />
                    Información Principal
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {infoItems.map((item, index) => (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`p-4 rounded-xl border ${item.bgColor} border-opacity-50`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-white shadow-sm">
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-600 mb-1">{item.label}</p>
                            {item.key === 'estado' ? (
                              <Badge className={`${getStatusColor(report.estado)} text-xs rounded-full px-2`}>
                                {report.estado || 'No definido'}
                              </Badge>
                            ) : (
                              <p className="text-slate-800 font-semibold break-words">{item.value}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      <FileTextIcon className="w-4 h-4 inline mr-1" />
                      Descripción
                    </label>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm min-h-[80px] whitespace-pre-wrap">
                      {report.descripcion || 'Sin descripción disponible'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <CalendarIcon className="w-4 h-4 inline mr-1" />
                        Estado
                      </label>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg">
                        <Badge className={`${getStatusColor(report.estado)} text-xs`}>
                          {report.estado || 'No definido'}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <CalendarIcon className="w-4 h-4 inline mr-1" />
                        Fecha de Creación
                      </label>
                      <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm">
                        {formatDate(report.fecha)}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Archivos e Imágenes */}
                {((report.imagenes && report.imagenes.length > 0) || (report.archivos && report.archivos.length > 0)) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-6"
                  >
                    <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                      <FileIcon className="w-5 h-5 text-slate-600" />
                      Archivos e Imágenes
                    </h3>

                    {/* Imágenes */}
                    {report.imagenes && report.imagenes.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium text-slate-700 mb-3 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Imágenes ({report.imagenes.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {report.imagenes.slice(0, 4).map((imagen, index) => (
                            <div
                              key={imagen.id_imagen || imagen.id || `img-${index}`}
                              className="relative group bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all"
                              onClick={() => openViewer(index)}
                            >
                              <div className="aspect-square bg-slate-100">
                                <img
                                  src={imagen.url || imagen.preview}
                                  alt={imagen.name || `Imagen ${index + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              </div>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                {index === 3 && report.imagenes.length > 4 ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <Plus className="w-8 h-8 text-white" />
                                    <span className="text-white font-bold text-lg">
                                      +{report.imagenes.length - 3}
                                    </span>
                                  </div>
                                ) : (
                                  <EyeIcon className="w-8 h-8 text-white" />
                                )}
                              </div>
                              {index === 3 && report.imagenes.length > 4 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <Plus className="w-8 h-8 text-white" />
                                    <span className="text-white font-bold text-lg">
                                      +{report.imagenes.length - 3}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Archivos */}
                    {report.archivos && report.archivos.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-slate-700 mb-3 flex items-center gap-2">
                          <FileIcon className="w-4 h-4" />
                          Archivos ({report.archivos.length})
                        </h4>
                        <div className="space-y-2">
                          {report.archivos.map((archivo, index) => (
                            <div key={archivo.id_archivo || archivo.id || `file-${index}`} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex items-center space-x-2">

                                <FileIcon className="w-6 h-6 text-slate-400" />

                                <div>
                                  <p className="font-medium text-slate-900 text-sm">{archivo.name || `Archivo ${index + 1}`}</p>
                                  <p className="text-xs text-slate-500">
                                    {archivo.size ? `${(archivo.size / 1024).toFixed(2)} KB` : 'Tamaño desconocido'}
                                    {archivo.type && ` • ${archivo.type}`}
                                  </p>
                                </div>
                              </div>
                              {archivo.url && (
                                <a
                                  href={archivo.url}
                                  download={archivo.name || `archivo-${index + 1}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs">
                                    <DownloadIcon className="w-3 h-3 mr-1" />
                                    Descargar
                                  </Button>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Seguimiento General */}
                {report.seguimientoGeneral && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-6"
                  >
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <FileTextIcon className="w-5 h-5 text-slate-600" />
                      Seguimiento General
                    </h3>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm whitespace-pre-wrap">
                      {report.seguimientoGeneral}
                    </div>
                  </motion.div>
                )}

                {/* Rubros Section */}
                {rubrosActivos.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <ClipboardListIcon className="w-5 h-5 text-slate-600" />
                        Rubros del Proyecto
                      </h3>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {rubrosActivos.length} rubros
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {rubrosActivos.map((rubro, index) => {
                        const rubroKey = rubro.id_rubro || rubro.id || `rubro-${index}`;
                        return (
                          <motion.div
                            key={rubroKey}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="border border-slate-200 rounded-lg overflow-hidden bg-white"
                          >
                            {/* Rubro Header */}
                            <div className="bg-slate-50 p-3 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-slate-900 text-sm">{rubro.nombre || 'Rubro sin nombre'}</h4>
                                  <p className="text-xs text-slate-600 mt-1">{rubro.descripcion || 'Sin descripción'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={`${getStatusColor(rubro.estado)} text-xs`}>
                                    {rubro.estado || 'Sin estado'}
                                  </Badge>
                                  {rubro.seguimientos && rubro.seguimientos.length > 0 && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                                      {rubro.seguimientos.length} seg.
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Seguimientos del Rubro */}
                            {rubro.seguimientos && rubro.seguimientos.length > 0 && (
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-slate-800 text-sm flex items-center">
                                    <ClipboardListIcon className="w-4 h-4 mr-2 text-blue-600" />
                                    Seguimientos
                                    <Badge className="ml-2 bg-blue-50 text-blue-700 border border-blue-200 text-xs rounded-full px-2">
                                      {rubro.seguimientos.length}
                                    </Badge>
                                  </h5>
                                </div>
                                <div className="space-y-2">
                                  {rubro.seguimientos.map((seguimiento, segIndex) => {
                                    const seguimientoKey = seguimiento.id_seguimiento_rubro || seguimiento.id || `seg-${rubroKey}-${segIndex}`;
                                    return (
                                      <div key={seguimientoKey} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center">
                                              <span className="text-xs font-semibold text-blue-700">#{segIndex + 1}</span>
                                            </div>
                                            <span className="text-sm font-medium text-slate-800">Seguimiento {segIndex + 1}</span>
                                          </div>
                                          <Badge className={`${getFollowUpStatusColor(seguimiento.estado)} text-[11px] rounded-full px-2`}>
                                            {seguimiento.estado || 'Sin estado'}
                                          </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <span className="font-medium text-slate-700">Descripción:</span>
                                            <p className="text-slate-900">{seguimiento.descripcion || 'Sin descripción'}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-3 h-3 text-slate-500" />
                                            <div>
                                              <span className="font-medium text-slate-700">Fecha:</span>
                                              <p className="text-slate-900">{seguimiento.fecha || 'Sin fecha'}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <UserIcon className="w-3 h-3 text-slate-500" />
                                            <div>
                                              <span className="font-medium text-slate-700">Responsable:</span>
                                              <p className="text-slate-900">{seguimiento.responsable || 'No asignado'}</p>
                                            </div>
                                          </div>
                                        </div>

                                        {seguimiento.subSeguimientos > 0 && (
                                          <div className="mt-2 pt-2 border-t border-slate-200">
                                            <span className="text-[11px] text-slate-600">
                                              Sub-seguimientos: {seguimiento.subSeguimientos}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Resumen del Proyecto */}
                {rubrosActivos.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-r from-blue-50 to-slate-50 border border-slate-200 rounded-xl p-4"
                  >
                    <h4 className="text-lg font-semibold text-slate-800 mb-3">Resumen del Proyecto</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{resumen.totalRubros}</div>
                        <div className="text-xs text-slate-600">Rubros totales</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">{resumen.totalSeguimientos}</div>
                        <div className="text-xs text-slate-600">Seguimientos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">{resumen.totalProcesos}</div>
                        <div className="text-xs text-slate-600">Procesos totales</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-600 mb-1">Estados por rubro:</div>
                        <div className="space-y-1">
                          <div className="text-orange-600 text-xs">Pendiente: {resumen.pendientes}</div>
                          <div className="text-blue-600 text-xs">En proceso: {resumen.enProceso}</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Mensaje cuando no hay información adicional */}
                {(!report.seguimientoGeneral) &&
                  (!report.imagenes || report.imagenes.length === 0) &&
                  (!report.archivos || report.archivos.length === 0) &&
                  (!rubrosActivos || rubrosActivos.length === 0) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-yellow-800 text-sm">
                        Este reporte no tiene seguimientos, imágenes, archivos o rubros adicionales registrados.
                      </p>
                    </div>
                  )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cerrar
              </motion.button>
            </div>

            <ImageViewer
              isOpen={viewerConfig.isOpen}
              onClose={() => setViewerConfig(prev => ({ ...prev, isOpen: false }))}
              images={report.imagenes}
              currentIndex={viewerConfig.currentIndex}
              onIndexChange={(index) => setViewerConfig(prev => ({ ...prev, currentIndex: index }))}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default ViewReportModal;
