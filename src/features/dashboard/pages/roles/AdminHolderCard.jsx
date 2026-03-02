import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useToast } from "../../../../shared/hooks/use-toast";
import rolesApiService from "../../../../shared/services/rolesApiService";
import administrativosApiService from "../../../../shared/services/administrativosApiService";
import { apiClient } from "../../../../shared/services/api.config";
import { Select, SelectTrigger, SelectContent, SelectItem } from "../../../../shared/components/ui/select";
import ConfirmationDialog from "../../../../shared/components/ui/ConfirmationDialog";

const EMPTY_FORM = {
  targetPersonaId: "",
  reason: "",
  disablePreviousAccount: true,
};
const EMPTY_ERRORS = {
  targetPersonaId: "",
  reason: "",
};

const resolveArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
};

const formatCandidateLabel = (candidate) => {
  const nombreCompleto = candidate?.nombre_completo || "";
  const apellidoCompleto = candidate?.apellido_completo || "";
  const fullName = [nombreCompleto, apellidoCompleto]
    .filter(Boolean)
    .join(" ")
    .trim();
  const safeName = fullName || "Sin nombre";
  const safeEmail = candidate?.correo ? ` - ${candidate.correo}` : "";
  return `${safeName}${safeEmail}`;
};

const normalizeCandidates = (administrativosRaw) => {
  const seen = new Set();
  const mapped = [];

  for (const item of administrativosRaw) {
    const persona = item?.persona || {};
    const idPersona = persona?.id_persona;
    if (!idPersona || seen.has(idPersona)) {
      continue;
    }

    const rolesPersona = Array.isArray(persona?.roles) ? persona.roles : [];
    const hasSuperAdminRole = rolesPersona.some(
      (rol) => (rol?.nombre_rol || rol?.nombre) === "Super Administrador"
    );
    if (hasSuperAdminRole) {
      continue;
    }

    seen.add(idPersona);
    mapped.push({
      id_persona: idPersona,
      nombre_completo: persona?.nombre_completo || "",
      apellido_completo: persona?.apellido_completo || "",
      correo: persona?.correo || "",
    });
  }

  return mapped.sort((a, b) =>
    formatCandidateLabel(a).localeCompare(formatCandidateLabel(b), "es")
  );
};

export default function AdminHolderCard({ className = "" }) {
  const { toast } = useToast();
  const [adminRoleId, setAdminRoleId] = useState(null);
  const [currentHolder, setCurrentHolder] = useState(null);
  const [loadingHolder, setLoadingHolder] = useState(true);
  const [holderError, setHolderError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState(EMPTY_ERRORS);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const holderSummary = useMemo(() => {
    if (loadingHolder) return "Cargando titular...";
    if (holderError) return "Error cargando titular";
    if (!currentHolder) return "Sin titular asignado";

    const nombreCompleto = currentHolder?.nombre_completo || "";
    const apellidoCompleto = currentHolder?.apellido_completo || "";
    const correo = currentHolder?.correo || "";

    // Limpiar los valores para evitar "undefined" y espacios vacíos
    const safeNombre = nombreCompleto && nombreCompleto !== "undefined" && nombreCompleto.trim() ? nombreCompleto.trim() : "";
    const safeApellido = apellidoCompleto && apellidoCompleto !== "undefined" && apellidoCompleto.trim() ? apellidoCompleto.trim() : "";
    const safeCorreo = correo && correo !== "undefined" && correo.trim() ? correo.trim() : "";

    const fullName = [safeNombre, safeApellido]
      .filter(Boolean)
      .join(" ")
      .trim();
    const safeName = fullName || "Titular sin nombre";
    return safeCorreo ? `${safeName} - ${safeCorreo}` : safeName;
  }, [currentHolder, holderError, loadingHolder]);

  const loadCurrentHolder = useCallback(async () => {
    try {
      setLoadingHolder(true);
      setHolderError("");

      const roles = await rolesApiService.obtenerRoles();
      const adminRole = (roles || []).find(
        (rol) => (rol?.nombre_rol || rol?.nombre) === "Administrador"
      );

      const resolvedRoleId = adminRole?.id_rol || adminRole?.id;
      if (!resolvedRoleId) {
        setAdminRoleId(null);
        setCurrentHolder(null);
        setHolderError("No se encontro el rol Administrador en el sistema.");
        return;
      }

      setAdminRoleId(resolvedRoleId);

      const response = await apiClient.get(`/roles/${resolvedRoleId}/personas`);
      const personas = resolveArray(
        response?.data,
        response?.data?.data,
        response?.personas,
        response?.data?.personas
      );

      if (personas.length > 1) {
        toast({
          title: "Inconsistencia detectada",
          description: "Hay mas de un usuario con rol Administrador activo.",
          variant: "destructive",
        });
      }

      setCurrentHolder(personas[0] || null);
    } catch (error) {
      setHolderError(error?.message || "No se pudo obtener el titular de Administrador.");
      setCurrentHolder(null);
    } finally {
      setLoadingHolder(false);
    }
  }, [toast]);

  const loadCandidates = useCallback(async () => {
    try {
      setLoadingCandidates(true);
      const response = await administrativosApiService.getAdministrativos({
        page: 1,
        limit: 200,
        estado: "Activo",
      });
      const administrativos = resolveArray(
        response?.data?.data?.administrativos,
        response?.data?.administrativos,
        response?.administrativos
      );

      // Filtrar al titular actual para que no aparezca en la lista de candidatos
      const currentHolderId = currentHolder?.id_persona || currentHolder?.id;
      const filteredAdministrativos = administrativos.filter(admin => {
        const adminId = admin?.persona?.id_persona;
        return adminId !== currentHolderId;
      });

      setCandidates(normalizeCandidates(filteredAdministrativos));
    } catch (error) {
      setCandidates([]);
      toast({
        title: "Error cargando administrativos",
        description: error?.message || "No se pudieron cargar los candidatos.",
        variant: "destructive",
      });
    } finally {
      setLoadingCandidates(false);
    }
  }, [toast, currentHolder]);

  useEffect(() => {
    loadCurrentHolder();
  }, [loadCurrentHolder]);

  useEffect(() => {
    if (!isModalOpen || typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  const handleOpenModal = () => {
    setForm(EMPTY_FORM);
    setFormErrors(EMPTY_ERRORS);
    setIsConfirmOpen(false);
    setIsModalOpen(true);
    loadCandidates();
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setForm(EMPTY_FORM);
    setFormErrors(EMPTY_ERRORS);
    setIsConfirmOpen(false);
  };

  const validateForm = () => {
    const targetPersonaId = Number.parseInt(form.targetPersonaId, 10);
    const reason = String(form.reason || "").trim();
    const nextErrors = {
      targetPersonaId: "",
      reason: "",
    };

    if (!Number.isInteger(targetPersonaId) || targetPersonaId <= 0) {
      nextErrors.targetPersonaId = "Debes seleccionar un administrativo destino.";
    }

    if (!reason) {
      nextErrors.reason = "La razon de la transferencia es obligatoria.";
    } else if (reason.length < 10 || reason.length > 300) {
      nextErrors.reason = "La razon debe tener entre 10 y 300 caracteres.";
    }

    setFormErrors(nextErrors);
    return !nextErrors.targetPersonaId && !nextErrors.reason;
  };

  const handleRequestConfirmation = () => {
    if (!validateForm()) return;
    setIsConfirmOpen(true);
  };

  const handleSubmit = async () => {
    const targetPersonaId = Number.parseInt(form.targetPersonaId, 10);
    const reason = String(form.reason || "").trim();

    try {
      setIsSubmitting(true);
      const payload = {
        target_persona_id: targetPersonaId,
        disable_previous_account: form.disablePreviousAccount,
        reason,
      };

      const response = await apiClient.put("/security/admin/holder", payload);
      const message = response?.message || "Titular de Administrador actualizado.";

      toast({
        title: "Operacion exitosa",
        description: message,
      });

      setIsConfirmOpen(false);
      setIsModalOpen(false);
      setForm(EMPTY_FORM);
      setFormErrors(EMPTY_ERRORS);
      await loadCurrentHolder();
    } catch (error) {
      setIsConfirmOpen(false);
      toast({
        title: "Error al transferir",
        description: error?.message || "No se pudo transferir el rol Administrador.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCandidate = useMemo(
    () =>
      candidates.find(
        (candidate) => String(candidate.id_persona) === String(form.targetPersonaId)
      ) || null,
    [candidates, form.targetPersonaId]
  );

  const selectedCandidateLabel = selectedCandidate
    ? formatCandidateLabel(selectedCandidate)
    : "Selecciona un administrativo";

  const confirmMessage = selectedCandidate
    ? `Confirmas cambiar el titular del rol Administrador a "${formatCandidateLabel(selectedCandidate)}"?${form.disablePreviousAccount
      ? " La cuenta del administrador saliente sera deshabilitada."
      : ""
    }`
    : "Confirmas cambiar el titular del rol Administrador?";

  const modal = isModalOpen && typeof document !== "undefined"
    ? createPortal(
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            handleCloseModal();
          }
        }}
      >
        <div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200"
          data-admin-holder-content="true"
        >
          <div className="px-5 py-4 border-b border-slate-200">
            <h4 className="text-lg font-semibold text-slate-800">Transferir titular de Administrador</h4>
            <p className="mt-1 text-sm text-slate-600">
              Esta accion mueve el rol protegido Administrador a otro administrativo activo.
            </p>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Administrativo destino
              </label>
              <Select
                value={form.targetPersonaId}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, targetPersonaId: value }));
                  setFormErrors((prev) => ({ ...prev, targetPersonaId: "" }));
                }}
              >
                <SelectTrigger className={formErrors.targetPersonaId ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""}>
                  <span className="block truncate">{selectedCandidateLabel}</span>
                </SelectTrigger>
                <SelectContent
                  autoScrollOnOpen={false}
                  constrainToBoundary={true}
                  boundarySelector='[data-admin-holder-content="true"]'
                  bottomOffset={20}
                  maxListHeight={240}
                  className="max-h-56"
                >
                  {candidates.map((candidate) => (
                    <SelectItem
                      key={candidate.id_persona}
                      value={String(candidate.id_persona)}
                    >
                      {formatCandidateLabel(candidate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.targetPersonaId && (
                <p className="mt-1 text-xs text-red-600">{formErrors.targetPersonaId}</p>
              )}
              {loadingCandidates && (
                <p className="mt-1 text-xs text-slate-500">Cargando candidatos...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Razon de la transferencia (10-300)
              </label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({ ...prev, reason: value }));
                  setFormErrors((prev) => ({ ...prev, reason: "" }));
                }}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.reason
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:ring-amber-500"
                  }`}
                placeholder="Ejemplo: Cambio de titular por salida de personal."
              />
              {formErrors.reason && (
                <p className="mt-1 text-xs text-red-600">{formErrors.reason}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.disablePreviousAccount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    disablePreviousAccount: event.target.checked,
                  }))
                }
              />
              Deshabilitar cuenta del administrador saliente
            </label>
          </div>

          <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRequestConfirmation}
              disabled={isSubmitting || loadingCandidates}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Continuar
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <>
      <div
        className={`min-w-0 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 ${className}`}
        title="Desde aqui se cambia quien ocupa el rol Administrador del sistema."
      >
        <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
        <span className="text-xs font-medium text-amber-800 whitespace-nowrap">Titular:</span>
        <span
          className={`text-xs ${holderError ? "text-red-600" : "text-slate-700"
            } truncate max-w-[220px]`}
          title={holderError || holderSummary}
        >
          {holderError || holderSummary}
        </span>
        <span className="hidden xl:inline text-[11px] text-amber-800/90 whitespace-nowrap">
          Cambia aqui quien ocupa el rol Administrador.
        </span>
        <button
          type="button"
          onClick={loadCurrentHolder}
          className="p-1.5 rounded-md border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors"
          title="Actualizar titular"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleOpenModal}
          disabled={loadingHolder || !adminRoleId}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Cambiar titular
        </button>
      </div>
      {modal}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          if (isSubmitting) return;
          setIsConfirmOpen(false);
        }}
        onConfirm={handleSubmit}
        isLoading={isSubmitting}
        variant="warning"
        title="Confirmar cambio de titular"
        message={confirmMessage}
        confirmText="Si, cambiar titular"
        cancelText="Cancelar"
      />
    </>
  );
}
