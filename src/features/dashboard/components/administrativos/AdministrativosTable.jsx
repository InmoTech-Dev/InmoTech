import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Edit, Trash2, ChevronLeft, ChevronRight, User, Mail, Phone, Calendar } from 'lucide-react';
import { formatPhoneNumber } from '../../../../shared/utils/phoneFormatter';
import administrativosApiService from '../../../../shared/services/administrativosApiService';
import AdministrativoStatusSelector from '../../../../shared/components/ui/AdministrativoStatusSelector';
import EmptyState from '../../../../shared/components/ui/EmptyState';

const AdministrativosTable = ({
  administrativos,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  loadingStatusChanges,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const getStatusBadge = (estado) => {
    const statusConfig = {
      'Activo': {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Activo'
      },
      'Inactivo': {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Inactivo'
      },
      'Suspendido': {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        label: 'Suspendido'
      },
      'Retirado': {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Retirado'
      }
    };

    const config = statusConfig[estado] || statusConfig.Activo;

    return (
      <span
        className={`inline-flex w-[100px] min-w-0 flex-none items-center gap-1 px-1.5 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 truncate whitespace-nowrap justify-center ${config.bg} ${config.borderColor} ${config.text} ${estado === 'Retirado' ? 'opacity-60' : ''}`}
      >
        {config.label}
      </span>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return administrativosApiService.formatFecha(dateString);
  };

  // Helper para obtener el nombre completo
  const getFullName = (administrativo) => {
    if (!administrativo?.persona) return 'Sin nombre';

    const { nombre_completo, apellido_completo } = administrativo.persona;
    return `${nombre_completo || ''} ${apellido_completo || ''}`.trim() || 'Sin nombre';
  };

  // Helper para obtener el email
  const getEmail = (administrativo) => {
    return administrativo?.persona?.correo || '-';
  };

  // Helper para obtener el teléfono
  const getPhone = (administrativo) => {
    return administrativo?.persona?.telefono || '-';
  };

  // Helper para obtener el código de empleado
  const getEmployeeCode = (administrativo) => {
    return administrativo?.codigo_empleado || '-';
  };

  // Helper para obtener la fecha de ingreso
  const getHireDate = (administrativo) => {
    return administrativo?.fecha_ingreso ? formatDate(administrativo.fecha_ingreso) : '-';
  };

  // Helper para verificar si el administrativo es super admin o admin
  const isSuperAdminOrAdmin = (administrativo) => {
    if (!administrativo?.persona?.roles) return false;
    return administrativo.persona.roles.some(rol =>
      rol.nombre_rol === 'Super Administrador' || rol.nombre_rol === 'Administrador'
    );
  };

  // Componente para vista móvil
  const MobileAdministrativoCard = ({ administrativo }) => {
    const isRetired = administrativo.estado_laboral === 'Retirado';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-lg border border-slate-200 p-4 mb-4 ${isRetired ? 'opacity-60' : ''}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-slate-800">{getFullName(administrativo)}</h3>
            <p className="text-sm text-slate-600">{getEmployeeCode(administrativo)}</p>
          </div>
          <AdministrativoStatusSelector
            value={administrativo.estado_laboral}
            onChange={(newStatus) => onStatusChange(administrativo, newStatus)}
            loading={loadingStatusChanges.has(administrativo.id_administrativo)}
            disabled={isSuperAdminOrAdmin(administrativo)}
            className="w-[120px]"
          />
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4" />
            <span>{getEmail(administrativo)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-4 h-4" />
            <span>{formatPhoneNumber(getPhone(administrativo))}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Ingreso: {getHireDate(administrativo)}</span>
          </div>

        </div>

        <div className="flex gap-2">
          <motion.button
            key={`mobile-view-${administrativo.id_administrativo}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onView(administrativo)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Ver
          </motion.button>
          <motion.button
            key={`mobile-edit-${administrativo.id_administrativo}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onEdit(administrativo)}
            disabled={isSuperAdminOrAdmin(administrativo)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSuperAdminOrAdmin(administrativo)
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-slate-600 text-white hover:bg-slate-700 cursor-pointer'
            }`}
            title={isSuperAdminOrAdmin(administrativo) ? "No se puede editar" : "Editar administrativo"}
          >
            <Edit className="w-4 h-4" />
            Editar
          </motion.button>


        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
      {!administrativos || administrativos.length === 0 ? (
        <EmptyState message="No hay personal administrativo para mostrar." />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Administrativo
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Información Laboral
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {administrativos.map((administrativo, index) => {
                const isRetired = administrativo.estado_laboral === 'Retirado';

                return (
                  <motion.tr
                    key={administrativo.id_administrativo || `admin-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`hover:bg-slate-50 transition-colors ${isRetired ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-slate-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{getFullName(administrativo)}</div>
                          <div className="text-sm text-slate-500">{getEmployeeCode(administrativo)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900">{getEmail(administrativo)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-500">{formatPhoneNumber(getPhone(administrativo))}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <AdministrativoStatusSelector
                        value={administrativo.estado_laboral}
                        onChange={(newStatus) => onStatusChange(administrativo, newStatus)}
                        loading={loadingStatusChanges.has(administrativo.id_administrativo)}
                        disabled={isSuperAdminOrAdmin(administrativo)}
                        className="w-[120px]"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900">{getHireDate(administrativo)}</span>
                      </div>

                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <motion.button
                          key={`view-${administrativo.id_administrativo}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onView(administrativo)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          key={`edit-${administrativo.id_administrativo}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onEdit(administrativo)}
                          disabled={isSuperAdminOrAdmin(administrativo)}
                          className={`p-2 rounded-lg transition-colors ${
                            isSuperAdminOrAdmin(administrativo)
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 hover:bg-slate-50 cursor-pointer'
                          }`}
                          title={isSuperAdminOrAdmin(administrativo) ? "No se puede editar" : "Editar administrativo"}
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>


                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden p-4">
        {administrativos.map((administrativo, index) => (
          <MobileAdministrativoCard key={administrativo.id_administrativo || `mobile-admin-${index}`} administrativo={administrativo} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-slate-600 hover:bg-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>

              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                const isCurrentPage = page === currentPage;

                return (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isCurrentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    {page}
                  </motion.button>
                );
              })}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-600 hover:bg-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default AdministrativosTable;
