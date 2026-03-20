import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Edit, ChevronLeft, ChevronRight, User, Mail, Phone, Calendar, ShieldCheck, RefreshCcw } from 'lucide-react';
import { formatPhoneNumber } from '../../../../shared/utils/phoneFormatter';
import usersApiService from '../../../../shared/services/usersApiService';
import UserStatusSelector from '../../../../shared/components/ui/UserStatusSelector';
import EmptyState from '../../../../shared/components/ui/EmptyState';

const UserTable = ({
  users,
  onView,
  onEdit,
  onStatusChange,
  loadingStatusChanges,
  onResendInvitation,
  loadingResend = new Set(),
  currentPage,
  totalPages,
  onPageChange
}) => {
  const renderInvitationStatus = (user) => {
    const isDisabled = user.estado === false;
    const hasAccount = user.tiene_cuenta === true || user.tiene_cuenta === 1;

    let shortLabel = user.invitacion_estado || 'Cuenta activa';
    let variant = { bg: 'bg-green-100/60', text: 'text-green-800', border: 'border border-green-200' };

    if (isDisabled) {
      shortLabel = 'Cuenta deshabilitada';
      variant = { bg: 'bg-red-100/70', text: 'text-red-800', border: 'border border-red-200' };
    } else if (!hasAccount) {
      shortLabel = 'Activacion pendiente';
      variant = { bg: 'bg-blue-100/60', text: 'text-blue-800', border: 'border border-blue-200' };
    } else {
      shortLabel = 'Cuenta activa';
      variant = { bg: 'bg-green-100/60', text: 'text-green-800', border: 'border border-green-200' };
    }

    return (
      <span
        className={`inline-flex max-w-full items-center justify-center px-2 py-1 rounded-md text-xs font-semibold text-center leading-tight truncate whitespace-nowrap ${variant.bg} ${variant.text} ${variant.border}`}
        title={user.invitacion_estado || shortLabel}
      >
        {shortLabel}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return usersApiService.formatFecha(dateString);
  };

  // Helper para obtener el nombre completo
  const getFullName = (user) => {
    // Múltiples fallbacks para nombres (diferentes formatos en BD)
    const nombre = user.nombre_completo || user.nombres || user.primer_nombre;
    const apellido = user.apellido_completo || user.apellidos || user.primer_apellido;

    const nombreCompleto = `${nombre || ''} ${apellido || ''}`.trim();

    return nombreCompleto || 'Sin nombre';
  };

  // Helper para obtener el documento completo
  const getDocument = (user) => {
    const tipo = user.tipo_documento || user.tipoDocumento;
    const numero = user.numero_documento || user.numeroDocumento;

    return tipo && numero ? `${tipo} ${numero}` : '-';
  };

  // Helper para obtener el email
  const getEmail = (user) => {
    return (user.correo || user.email || '-').trim();
  };

  // Helper para obtener el teléfono
  const getPhone = (user) => {
    return (user.telefono || user.phone || '-').trim();
  };

  // Helper para obtener la fecha de registro
  const getRegistrationDate = (user) => {
    const fecha = user.fecha_registro || user.createdAt || user.fecha_creacion;
    return fecha ? formatDate(fecha) : '-';
  };

  const shouldShowResend = (user) => {
    return user && user.estado !== false && user.tiene_cuenta !== true;
  };

  // Helper para obtener el objeto de rol protegido activo con prioridad
  const getProtectedRole = (user) => {
    const roles = user.roles || [];
    if (!Array.isArray(roles)) return null;

    const priority = {
      'super administrador': 1,
      'administrador': 2,
      'admin': 3
    };

    let bestRole = null;
    let bestPriority = Infinity;

    roles.forEach(rol => {
      const nombre = (rol.nombre_rol || rol.nombre || rol.name || '').trim().toLowerCase();
      const isActive = rol.PersonasRol ? !!rol.PersonasRol.estado :
        rol.through ? !!rol.through.estado : true;

      if (isActive && priority[nombre] < bestPriority) {
        bestPriority = priority[nombre];
        bestRole = rol;
      }
    });

    return bestRole;
  };

  // Componente para vista móvil
  const MobileUserCard = ({ user }) => {
    const isDisabled = user.estado === false;
    const protectedRole = getProtectedRole(user);
    const isProtected = !!protectedRole;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-lg border border-slate-200 p-4 mb-4 ${isDisabled ? 'opacity-60' : ''}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-slate-800">{getFullName(user)}</h3>
            {isProtected ? (
              <p className="text-sm font-semibold text-blue-600">{protectedRole.nombre_rol}</p>
            ) : (
              <p className="text-sm text-slate-600">{getDocument(user)}</p>
            )}
          </div>
          <UserStatusSelector
            value={user.estado}
            onChange={(newStatus) => onStatusChange(user, newStatus)}
            loading={loadingStatusChanges.has(user.id_persona)}
            disabled={isProtected}
            className="w-[150px]"
          />
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4" />
            <span>{getEmail(user)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-4 h-4" />
            <span>{formatPhoneNumber(getPhone(user))}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            {renderInvitationStatus(user)}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Registro: {getRegistrationDate(user)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            key={`mobile-view-${user.id_persona}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onView(user)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Ver
          </motion.button>
          <motion.button
            key={`mobile-edit-${user.id_persona}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onEdit(user)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Editar
          </motion.button>
          {shouldShowResend(user) && (
            <motion.button
              key={`mobile-resend-${user.id_persona}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onResendInvitation && onResendInvitation(user)}
              disabled={loadingResend.has(user.id_persona)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              <RefreshCcw className="w-4 h-4" />
              {loadingResend.has(user.id_persona) ? 'Enviando...' : 'Reenviar'}
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden min-h-0 flex-1">
      {!users || users.length === 0 ? (
        <EmptyState message="No hay usuarios para mostrar." />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:flex md:flex-col min-h-0 flex-1">
            <div className="w-full flex-1 overflow-hidden">
              <table className="w-full table-auto lg:table-fixed">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 lg:px-4 xl:px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Información del Usuario
                    </th>
                    <th className="hidden 2xl:table-cell px-3 lg:px-4 xl:px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="hidden lg:table-cell px-3 lg:px-4 xl:px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="hidden xl:table-cell px-3 lg:px-4 xl:px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Estado Acceso
                    </th>
                    <th className="px-3 lg:px-4 xl:px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[120px] lg:w-[160px]">
                      Estado
                    </th>
                    <th className="hidden 2xl:table-cell px-4 lg:px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Registro
                    </th>
                    <th className="px-3 lg:px-4 xl:px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[100px] lg:w-[140px]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user, index) => {
                    const isDisabled = user.estado === false;
                    const protectedRole = getProtectedRole(user);
                    const isProtected = !!protectedRole;

                    return (
                      <motion.tr
                        key={user.id_persona || `user-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`hover:bg-slate-50 transition-colors ${isDisabled || isProtected ? 'opacity-60' : ''}`}
                      >
                        <td className="px-3 lg:px-4 xl:px-6 py-3.5 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                <User className="h-5 w-5 text-slate-600" />
                              </div>
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="text-sm font-bold text-slate-900 truncate" title={getFullName(user)}>{getFullName(user)}</div>
                              <div className="text-[11px] font-semibold text-blue-600 block lg:hidden">
                                {isProtected ? protectedRole.nombre_rol : getDocument(user)}
                              </div>
                              {/* Contact Stack below name for mid-screens */}
                              <div className="lg:hidden flex flex-col text-[11px] text-slate-500">
                                <span className="truncate">{getEmail(user)}</span>
                                <span className="truncate">{formatPhoneNumber(getPhone(user))}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden 2xl:table-cell px-3 lg:px-4 xl:px-6 py-3.5 align-middle">
                          <div className="text-sm text-slate-900 font-medium truncate" title={getDocument(user)}>
                            {isProtected ? (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-bold border border-blue-100">
                                {protectedRole.nombre_rol}
                              </span>
                            ) : getDocument(user)}
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-3 lg:px-4 xl:px-6 py-3.5 align-middle">
                          <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-600 truncate" title={getEmail(user)}>{getEmail(user)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 min-w-0 max-w-[200px]">
                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-500 truncate" title={formatPhoneNumber(getPhone(user))}>{formatPhoneNumber(getPhone(user))}</span>
                          </div>
                        </td>
                        <td className="hidden xl:table-cell px-3 lg:px-4 xl:px-6 py-3.5 align-middle">
                          {renderInvitationStatus(user)}
                        </td>
                        <td className="px-3 lg:px-4 xl:px-6 py-3.5 align-middle">
                          <UserStatusSelector
                            value={user.estado}
                            onChange={(newStatus) => onStatusChange(user, newStatus)}
                            loading={loadingStatusChanges.has(user.id_persona)}
                            disabled={isProtected}
                            className="w-full"
                          />
                        </td>
                        <td className="hidden 2xl:table-cell px-3 lg:px-4 xl:px-6 py-3.5 align-middle text-center lg:text-left">
                          <div className="flex items-center lg:justify-start justify-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-600 truncate" title={getRegistrationDate(user)}>{getRegistrationDate(user)}</span>
                          </div>
                        </td>
                        <td className="px-3 lg:px-4 xl:px-6 py-3.5 align-middle text-sm font-medium">
                          <div className="flex items-center justify-end lg:justify-start gap-1 flex-nowrap">
                            <motion.button
                              key={`view-${user.id_persona}`}
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(37, 99, 235, 0.05)' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => onView(user)}
                              className="p-1.5 text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              key={`edit-${user.id_persona}`}
                              whileHover={isProtected ? {} : { scale: 1.1, backgroundColor: 'rgba(71, 85, 105, 0.05)' }}
                              whileTap={isProtected ? {} : { scale: 0.9 }}
                              onClick={() => !isProtected && onEdit(user)}
                              disabled={isProtected}
                              className={`p-1.5 rounded-lg transition-colors border border-transparent ${isProtected ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:border-slate-200'}`}
                              title={isProtected ? "No se puede editar" : "Editar usuario"}
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            {shouldShowResend(user) && (
                              <motion.button
                                key={`resend-${user.id_persona}`}
                                whileHover={isProtected ? {} : { scale: 1.1, backgroundColor: 'rgba(217, 119, 6, 0.05)' }}
                                whileTap={isProtected ? {} : { scale: 0.9 }}
                                onClick={() => !isProtected && onResendInvitation && onResendInvitation(user)}
                                disabled={loadingResend.has(user.id_persona) || isProtected}
                                className={`p-1.5 rounded-lg transition-colors border border-transparent ${isProtected ? 'text-slate-300 cursor-not-allowed' : 'text-amber-600 hover:border-amber-200'} disabled:opacity-60`}
                                title={isProtected ? "No se puede reenviar" : "Reenviar invitación"}
                              >
                                {loadingResend.has(user.id_persona) ? (
                                  <RefreshCcw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCcw className="w-4 h-4" />
                                )}
                              </motion.button>
                            )}
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
            {users.map((user, index) => (
              <MobileUserCard key={user.id_persona || `mobile-user-${index}`} user={user} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-2.5 border-t border-slate-200 bg-slate-50">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
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
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${isCurrentPage
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

export default UserTable;




