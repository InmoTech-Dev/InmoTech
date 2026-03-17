import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { motion } from 'framer-motion';
import { FaUserPlus, FaSearch, FaHome, FaPhone, FaEnvelope } from "react-icons/fa";
import { Plus, Search, Filter, Eye, Edit, Home, Phone, Mail, X, ChevronDown } from 'lucide-react';
import "../../../../shared/styles/globals.css";
import LeasesPersonForm from "../../components/leases/TenantForm";
import ViewTenantModal from "../../components/leases/ViewTenantForm";
import { renantsApiService } from "../../../../shared/services/arrendatarioApiService";
import arriendoApiService from "../../../../shared/services/arriendoApiService";
import { inmueblesAPI } from "../../../../shared/services/propertyApidervice";
import MESSAGES from "../../../../shared/constants/messages";
import { useToast } from "../../../../shared/hooks/use-toast";
import { Pagination } from "../../pages/Inmuebles/components/common/pagination";

const normalizeEstado = (estado = "") => (estado || "").toString().trim().toLowerCase();
const getTenantStatusSortWeight = (estado = "") => {
  const normalized = normalizeEstado(estado);
  if (normalized === "activo" || normalized === "al dia") return 0;
  if (normalized === "moroso") return 1;
  if (normalized === "proceso") return 2;
  if (normalized === "inactivo") return 3;
  return 9;
};

const sortTenantsByStatus = (tenants = []) =>
  [...tenants].sort((a, b) => {
    const statusDiff =
      getTenantStatusSortWeight(a?.estado) - getTenantStatusSortWeight(b?.estado);
    if (statusDiff !== 0) return statusDiff;

    const nameA = String(
      a?.nombreCompleto ||
        [a?.primerNombre, a?.segundoNombre, a?.primerApellido, a?.segundoApellido]
          .filter(Boolean)
          .join(" ")
    ).trim();
    const nameB = String(
      b?.nombreCompleto ||
        [b?.primerNombre, b?.segundoNombre, b?.primerApellido, b?.segundoApellido]
          .filter(Boolean)
          .join(" ")
    ).trim();

    return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
  });

const normalizeDocumentValue = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const getTenantDocumentKey = (tenant = {}) => {
  const tipo = String(
    tenant.tipoDocumento ||
      tenant.persona?.tipo_documento ||
      tenant.arrendatario?.persona?.tipo_documento ||
      ""
  )
    .trim()
    .toUpperCase();
  const documento = normalizeDocumentValue(
    tenant.documento ||
      tenant.persona?.numero_documento ||
      tenant.arrendatario?.persona?.numero_documento
  );
  return tipo && documento ? `${tipo}:${documento}` : "";
};

const getLeaseTenantIdentity = (lease = {}) => {
  const arr = lease.arrendatario || lease.Arrendatario || {};
  const persona = arr.persona || arr.Persona || {};
  const tipo = String(arr.tipo_documento || persona.tipo_documento || "").trim().toUpperCase();
  const documento = normalizeDocumentValue(arr.numero_documento || persona.numero_documento);

  return {
    arrendatarioId: arr.id_arrendatario || arr.id || arr.idCliente || arr.id_cliente || null,
    personaId: persona.id_persona || null,
    documentKey: tipo && documento ? `${tipo}:${documento}` : "",
  };
};

const tenantMatchesLease = (tenant = {}, lease = {}) => {
  const tenantArrendatarioId = tenant.id_arrendatario || tenant.arrendatario?.id_arrendatario || null;
  const tenantPersonaId =
    tenant.personaId || tenant.persona?.id_persona || tenant.arrendatario?.persona?.id_persona || null;
  const tenantDocumentKey = getTenantDocumentKey(tenant);
  const leaseIdentity = getLeaseTenantIdentity(lease);

  if (tenantArrendatarioId && leaseIdentity.arrendatarioId) {
    return tenantArrendatarioId === leaseIdentity.arrendatarioId;
  }

  if (tenantDocumentKey && leaseIdentity.documentKey) {
    return tenantDocumentKey === leaseIdentity.documentKey;
  }

  if (!tenantArrendatarioId && !leaseIdentity.arrendatarioId && tenantPersonaId && leaseIdentity.personaId) {
    return tenantPersonaId === leaseIdentity.personaId;
  }

  return false;
};
const hasAssociatedLease = (tenant = {}) => {
  const raw = tenant.raw || tenant.arrendatarioRaw || {};
  const relatedLeases = [
    ...(Array.isArray(raw.arriendos) ? raw.arriendos : []),
    ...(Array.isArray(raw.arriendosComoArrendatario) ? raw.arriendosComoArrendatario : []),
    ...(Array.isArray(tenant.arriendos) ? tenant.arriendos : []),
    ...(Array.isArray(tenant.arriendosComoArrendatario) ? tenant.arriendosComoArrendatario : []),
  ].filter(Boolean);

  return Boolean(
    tenant.rawLease ||
    tenant.id_arriendo ||
    tenant.idArriendo ||
    tenant.arriendo?.id_arriendo ||
    tenant.arriendo?.id ||
    relatedLeases.length > 0
  );
};

export function LeasesManagementPage() {
  const PAGE_SIZE = 5;
  const fetchRequestIdRef = useRef(0);
  const [arrendatarios, setArrendatarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
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
  const [tenantToEdit, setTenantToEdit] = useState(null);
  const [tenantToView, setTenantToView] = useState(null);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [statusChangingId, setStatusChangingId] = useState(null);
  const [statusMenuId, setStatusMenuId] = useState(null);
  const { toast } = useToast();

  const getTenantRowId = (tenant = {}) =>
    tenant.id ?? tenant.id_arrendatario ?? tenant.personaId ?? null;

  const getTenantApiId = (tenant = {}) =>
    tenant.id_arrendatario ?? tenant.id ?? tenant.personaId ?? null;

  const pickBestLeaseForTenant = (tenant, arriendos = []) => {
    const matches = arriendos.filter((a) => tenantMatchesLease(tenant, a));

    if (!matches.length) return null;

    return matches
      .map((m) => ({
        m,
        ts: new Date(m.fecha_inicio || m.fechaInicio || m.fecha_cobro || m.fechaCobro || 0).getTime(),
      }))
      .sort((a, b) => b.ts - a.ts)[0].m;
  };
  const handleViewTenant = async (tenant) => {
    if (!tenant) return;
    // Optimistic show basic data
    setTenantToView(tenant);
    try {
      const full = await renantsApiService.getById(tenant.id || tenant.id_arrendatario || tenant.personaId);

      let leaseData = {};
      const pickBestLease = (arrList = []) => {
        const matches = arrList.filter((a) => tenantMatchesLease(full, a) || tenantMatchesLease(tenant, a));
        if (!matches.length) return null;
        // elegir el más reciente por fecha_inicio
        return matches
          .map((m) => ({
            m,
            ts: new Date(m.fecha_inicio || m.fechaInicio || m.fecha_cobro || m.fechaCobro || 0).getTime(),
          }))
          .sort((a, b) => b.ts - a.ts)[0].m;
      };

      if (tenant.rawLease) {
        leaseData = mapArriendoToLeaseData(tenant.rawLease);
      } else {
        try {
          const arriendosResp = await arriendoApiService.obtenerArriendos({ page: 1, limit: 200 });
          const arriendosList = arriendosResp?.data || [];
          const match = pickBestLease(arriendosList);
          if (match) {
            leaseData = mapArriendoToLeaseData(match);
          }
        } catch (_err) {
          // si falla la carga de arriendos, seguimos mostrando datos básicos
        }
      }

      const merged = {
        ...tenant,
        ...full,
        ...leaseData,
      };
      // Conservar inmueble y codeudor si el detalle no los trae
      if (!merged.inmueble && tenant.inmueble) merged.inmueble = tenant.inmueble;
      if ((!merged.inmueblesArrendados || merged.inmueblesArrendados.length === 0) && tenant.inmueblesArrendados) {
        merged.inmueblesArrendados = tenant.inmueblesArrendados;
      }
      merged.codeudorNombre = merged.codeudorNombre || tenant.codeudorNombre;
      merged.codeudorTelefono = merged.codeudorTelefono || tenant.codeudorTelefono;
      merged.codeudorCorreo = merged.codeudorCorreo || tenant.codeudorCorreo;
      merged.primerNombreCodeudor = merged.primerNombreCodeudor || tenant.primerNombreCodeudor;
      merged.segundoNombreCodeudor = merged.segundoNombreCodeudor || tenant.segundoNombreCodeudor;
      merged.primerApellidoCodeudor = merged.primerApellidoCodeudor || tenant.primerApellidoCodeudor;
      merged.segundoApellidoCodeudor = merged.segundoApellidoCodeudor || tenant.segundoApellidoCodeudor;
      merged.telefonoCodeudor = merged.telefonoCodeudor || tenant.telefonoCodeudor;
      merged.correoCodeudor = merged.correoCodeudor || tenant.correoCodeudor;

      const registroInmueble =
        merged.registroInmobiliario ||
        merged.inmueble?.registro ||
        merged.inmueble?.registro_inmobiliario ||
        merged.rawLease?.Inmueble?.registro_inmobiliario ||
        merged.rawLease?.Inmueble?.registro;

      if (registroInmueble) {
        try {
          const fetchedProperty = await inmueblesAPI.getInmuebleByRegistro(registroInmueble);
          if (fetchedProperty) {
            const enrichedInmueble = {
              ...(merged.inmueble || {}),
              ...fetchedProperty,
              registro: fetchedProperty.registro || merged.registroInmobiliario || merged.inmueble?.registro,
              registro_inmobiliario:
                fetchedProperty.registro ||
                fetchedProperty.registro_inmobiliario ||
                merged.registroInmobiliario ||
                merged.inmueble?.registro_inmobiliario,
            };

            merged.inmueble = enrichedInmueble;
            merged.nombreInmueble =
              fetchedProperty.titulo ||
              fetchedProperty.nombre ||
              fetchedProperty.nombre_comercial ||
              merged.nombreInmueble;
            merged.imagenInmueble =
              fetchedProperty.image ||
              fetchedProperty.imagen_principal ||
              fetchedProperty.imagen_portada ||
              fetchedProperty.portada ||
              merged.imagenInmueble;
            merged.inmueblesArrendados = [
              {
                ...(merged.inmueblesArrendados?.[0] || {}),
                id: fetchedProperty.id || merged.inmueblesArrendados?.[0]?.id,
                nombre:
                  fetchedProperty.titulo ||
                  fetchedProperty.nombre ||
                  fetchedProperty.nombre_comercial ||
                  merged.nombreInmueble,
                direccion: fetchedProperty.direccion || merged.direccion || merged.inmueblesArrendados?.[0]?.direccion || "",
                registro:
                  fetchedProperty.registro ||
                  fetchedProperty.registro_inmobiliario ||
                  merged.registroInmobiliario ||
                  merged.inmueblesArrendados?.[0]?.registro ||
                  "",
                imagen_principal:
                  fetchedProperty.image ||
                  fetchedProperty.imagen_principal ||
                  fetchedProperty.imagen_portada ||
                  fetchedProperty.portada ||
                  merged.imagenInmueble ||
                  "",
                imagenes: fetchedProperty.imagenes || merged.inmueblesArrendados?.[0]?.imagenes || [],
              },
            ];

            if (merged.rawLease?.Inmueble || merged.rawLease?.inmueble) {
              const leasePropertyKey = merged.rawLease?.Inmueble ? "Inmueble" : "inmueble";
              merged.rawLease = {
                ...merged.rawLease,
                [leasePropertyKey]: {
                  ...(merged.rawLease?.[leasePropertyKey] || {}),
                  ...enrichedInmueble,
                },
              };
            }
          }
        } catch (_error) {
          // Si falla el enriquecimiento del inmueble, conservamos los datos ya resueltos.
        }
      }

      setTenantToView(merged);
    } catch (error) {
      console.error("No se pudo cargar el detalle del arrendatario", error);
      // Keep basic tenant data already set
    }
  };

  const handleToggleEstado = async (tenant, forcedEstado) => {
    if (!tenant) return;
    const rowId = getTenantRowId(tenant);
    const targetId = getTenantApiId(tenant);
    if (!rowId || !targetId) {
      setStatusMessage({ type: "error", message: "No se pudo identificar el arrendatario." });
      return;
    }
    const current = normalizeEstado(tenant.estado || "Activo");
    const nextEstado = forcedEstado || (current === "activo" ? "Inactivo" : "Activo");
    try {
      setStatusChangingId(rowId);
      const payload = {
        estado: nextEstado,
        tipoDocumento: tenant.tipoDocumento || tenant.persona?.tipo_documento || "CC",
        documento: tenant.documento || tenant.persona?.numero_documento || "",
        primerNombre: tenant.primerNombre || tenant.primerNombreArrendatario || "",
        segundoNombre: tenant.segundoNombre || tenant.segundoNombreArrendatario || "",
        primerApellido: tenant.primerApellido || tenant.primerApellidoArrendatario || "",
        segundoApellido: tenant.segundoApellido || tenant.segundoApellidoArrendatario || "",
        correo: tenant.correo || tenant.correoArrendatario || "",
        telefono: tenant.telefono || tenant.telefonoArrendatario || "",
      };
      const updated = await renantsApiService.update(targetId, payload);
      setArrendatarios((prev) =>
        prev.map((t) =>
          getTenantRowId(t) === rowId
            ? { ...t, estado: updated.estado || nextEstado }
            : t
        )
      );
      toast({
        title: "Estado actualizado",
        description: `El arrendatario ahora está ${nextEstado}.`,
        variant: "default",
      });
      setStatusMenuId(null);
    } catch (error) {
      const errMsg = error.message || "No se pudo cambiar el estado del arrendatario";
      setStatusMessage({ type: "error", message: errMsg });
      toast({
        title: "Error al cambiar estado",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleEditTenant = (tenant) => {
    if (hasAssociatedLease(tenant)) {
      toast({
        title: "Edición bloqueada",
        description: "No puedes editar un arrendatario con un arriendo asociado.",
        variant: "destructive",
      });
      return;
    }

    setTenantToEdit(tenant);
    setShowForm(true);
  };

  const mapArriendoToLeaseData = (arriendo = {}) => {
    const inmueble = arriendo.Inmueble || arriendo.inmueble || {};
    const codeudor = arriendo.codeudor || arriendo.Codeudor || {};
    const codeudorPersona = codeudor.persona || codeudor.Persona || codeudor;
    const inmuebleImagenes = Array.isArray(inmueble.imagenes) ? inmueble.imagenes : [];
    const imagenPrincipal =
      inmuebleImagenes.find((img) => Boolean(img?.es_principal)) ||
      inmuebleImagenes[0] ||
      inmueble.imagen_principal ||
      inmueble.imagen_portada ||
      inmueble.portada ||
      inmueble.imagen_destacada ||
      null;
    const inmuebleNombre =
      inmueble.nombre ||
      inmueble.titulo ||
      inmueble.nombre_inmueble ||
      inmueble.registro_inmobiliario ||
      inmueble.registro ||
      inmueble.direccion ||
      null;
    const inmuebleRegistro = inmueble.registro_inmobiliario || inmueble.registro || null;
    const inmuebleDireccion = inmueble.direccion || null;
    const inmuebleId = inmueble.id || inmueble.id_inmueble || null;
    const inmuebleSimple =
      inmuebleNombre || inmuebleRegistro || inmuebleId
        ? [
            {
              id: inmuebleId,
              nombre: inmuebleNombre || "Inmueble",
              direccion: inmuebleDireccion || "",
              registro: inmuebleRegistro || "",
              imagen_principal: imagenPrincipal?.ruta_archivo || imagenPrincipal?.url || imagenPrincipal?.secure_url || imagenPrincipal || "",
              imagenes: inmuebleImagenes,
            },
          ]
        : [];
    return {
      inmueble,
      inmueblesArrendados: inmuebleSimple,
      registroInmobiliario: inmuebleRegistro,
      tipoInmueble: inmueble.categoria || inmueble.tipo || null,
      nombreInmueble: inmuebleNombre,
      imagenInmueble:
        imagenPrincipal?.ruta_archivo ||
        imagenPrincipal?.url ||
        imagenPrincipal?.secure_url ||
        imagenPrincipal ||
        null,
      direccion: inmuebleDireccion,
      ciudad: inmueble.ciudad || null,
      departamento: inmueble.departamento || null,
      valorMensual: arriendo.valor_mensual || arriendo.valor_arriendo || arriendo.precio_arriendo || null,
      fechaInicio: arriendo.fecha_inicio || arriendo.fechaInicio || null,
      fechaFin: arriendo.fecha_finalizacion || arriendo.fecha_fin || arriendo.fechaFin || null,
      estadoContrato: arriendo.estado || null,
      tipoGarantia: arriendo.tipo_garantia || arriendo.tipoGarantia || null,
      valorGarantia: arriendo.valor_garantia || arriendo.valorGarantia || null,
      descripcionGarantia: arriendo.descripcion_garantia || arriendo.descripcionGarantia || arriendo.descripcion || null,
      codeudorNombre: codeudorPersona.nombre_completo || null,
      codeudorTelefono: codeudorPersona.telefono || null,
      codeudorCorreo: codeudorPersona.correo || null,
      primerNombreCodeudor: codeudorPersona.primer_nombre || null,
      segundoNombreCodeudor: codeudorPersona.segundo_nombre || null,
      primerApellidoCodeudor: codeudorPersona.primer_apellido || null,
      segundoApellidoCodeudor: codeudorPersona.segundo_apellido || null,
      rawLease: arriendo,
    };
  };

    const fetchTenants = async (query = "", page = 1) => {
        const requestId = ++fetchRequestIdRef.current;
        try {
            setIsLoading(true);
            const tenantParams = { page, limit: PAGE_SIZE };
            if (query) {
              tenantParams.search = query;
            }
            if (estadoFilter !== "todos") tenantParams.estado = estadoFilter;
            const tenantsResult = await renantsApiService.getAll(tenantParams);
            const apiTenants = tenantsResult?.data || [];
            const baseTenants = apiTenants;

            let tenants = baseTenants;
            try {
              const arriendosResp = await arriendoApiService.obtenerArriendos({ page: 1, limit: 200 });
              const arriendosList = arriendosResp?.data || [];

              tenants = await Promise.all(
                baseTenants.map(async (tenant) => {
                  if (normalizeEstado(tenant.estado) !== "activo") {
                    return tenant;
                  }

                  if (
                    tenant.inmueble?.titulo ||
                    tenant.inmueble?.nombre ||
                    tenant.nombreInmueble ||
                    tenant.inmueblesArrendados?.[0]?.nombre
                  ) {
                    return tenant;
                  }

                  const match = pickBestLeaseForTenant(tenant, arriendosList);
                  if (!match) return tenant;

                  const leaseData = mapArriendoToLeaseData(match);
                  const registroInmueble =
                    leaseData.registroInmobiliario ||
                    leaseData.inmueble?.registro ||
                    leaseData.inmueble?.registro_inmobiliario ||
                    match?.Inmueble?.registro_inmobiliario ||
                    match?.Inmueble?.registro ||
                    match?.inmueble?.registro_inmobiliario ||
                    match?.inmueble?.registro;

                  let fetchedProperty = null;
                  if (registroInmueble) {
                    try {
                      fetchedProperty = await inmueblesAPI.getInmuebleByRegistro(registroInmueble);
                    } catch (_error) {
                      fetchedProperty = null;
                    }
                  }

                  if (!fetchedProperty) {
                    return {
                      ...tenant,
                      ...leaseData,
                    };
                  }

                  const enrichedInmueble = {
                    ...(leaseData.inmueble || tenant.inmueble || {}),
                    ...fetchedProperty,
                    registro:
                      fetchedProperty.registro ||
                      fetchedProperty.registro_inmobiliario ||
                      leaseData.registroInmobiliario ||
                      "",
                    registro_inmobiliario:
                      fetchedProperty.registro ||
                      fetchedProperty.registro_inmobiliario ||
                      leaseData.registroInmobiliario ||
                      "",
                  };

                  return {
                    ...tenant,
                    ...leaseData,
                    inmueble: enrichedInmueble,
                    nombreInmueble:
                      fetchedProperty.titulo ||
                      fetchedProperty.nombre ||
                      fetchedProperty.nombre_comercial ||
                      leaseData.nombreInmueble ||
                      tenant.nombreInmueble,
                    imagenInmueble:
                      fetchedProperty.image ||
                      fetchedProperty.imagen_principal ||
                      fetchedProperty.imagen_portada ||
                      fetchedProperty.portada ||
                      leaseData.imagenInmueble ||
                      tenant.imagenInmueble,
                    inmueblesArrendados: [
                      {
                        ...(leaseData.inmueblesArrendados?.[0] || tenant.inmueblesArrendados?.[0] || {}),
                        id: fetchedProperty.id || leaseData.inmueblesArrendados?.[0]?.id || tenant.inmueblesArrendados?.[0]?.id,
                        nombre:
                          fetchedProperty.titulo ||
                          fetchedProperty.nombre ||
                          fetchedProperty.nombre_comercial ||
                          leaseData.nombreInmueble ||
                          tenant.nombreInmueble ||
                          "Inmueble asignado",
                        direccion:
                          fetchedProperty.direccion ||
                          leaseData.direccion ||
                          tenant.direccion ||
                          "",
                        registro:
                          fetchedProperty.registro ||
                          fetchedProperty.registro_inmobiliario ||
                          leaseData.registroInmobiliario ||
                          tenant.registroInmobiliario ||
                          "",
                        imagen_principal:
                          fetchedProperty.image ||
                          fetchedProperty.imagen_principal ||
                          fetchedProperty.imagen_portada ||
                          fetchedProperty.portada ||
                          leaseData.imagenInmueble ||
                          tenant.imagenInmueble ||
                          "",
                        imagenes:
                          fetchedProperty.imagenes ||
                          leaseData.inmueblesArrendados?.[0]?.imagenes ||
                          tenant.inmueblesArrendados?.[0]?.imagenes ||
                          [],
                      },
                    ],
                  };
                })
              );
            } catch (_error) {
              tenants = baseTenants;
            }

            if (requestId !== fetchRequestIdRef.current) {
              return {
                tenants,
                pagination: tenantsResult?.pagination || null,
              };
            }

            setArrendatarios(sortTenantsByStatus(tenants));
            setPagination(tenantsResult?.pagination || {
              total: tenants.length,
              pagina: page,
              limite: PAGE_SIZE,
              paginas_totales: 1,
              has_next_page: false,
              has_prev_page: page > 1,
            });
            setCurrentPage(tenantsResult?.pagination?.pagina || page);
            return {
              tenants,
              pagination: tenantsResult?.pagination || null,
            };
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) {
        return {
          tenants: [],
          pagination: null,
        };
      }
      setStatusMessage({
        type: "error",
        message: error.message || "No fue posible obtener los arrendatarios"
      });
      return {
        tenants: [],
        pagination: null,
      };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchTenants(term, 1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
    fetchTenants(searchTerm.trim(), 1);
  }, [estadoFilter]);

  useEffect(() => {
    if (!statusMenuId) return undefined;

    const handleOutsideClick = (event) => {
      if (event.target.closest("[data-status-menu]")) return;
      setStatusMenuId(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [statusMenuId]);

  const handleCloseForm = () => {
    setShowForm(false);
    setTenantToEdit(null);
  };

  const handleCreateTenant = async (formData) => {
    setFormSubmitting(true);
    try {
      const newTenant = await renantsApiService.create(formData);
      const createdTenantId = getTenantRowId(newTenant);
      const createdDocumentKey = getTenantDocumentKey(newTenant);
      setArrendatarios((prev) => {
        const withoutDuplicate = prev.filter((tenant) => {
          const tenantId = getTenantRowId(tenant);
          const tenantDocumentKey = getTenantDocumentKey(tenant);
          return !(
            (createdTenantId && tenantId && String(createdTenantId) === String(tenantId)) ||
            (createdDocumentKey && tenantDocumentKey && createdDocumentKey === tenantDocumentKey)
          );
        });
        return [newTenant, ...withoutDuplicate].slice(0, PAGE_SIZE);
      });
      setPagination((prev) => ({
        ...prev,
        pagina: 1,
        total: (prev?.total || 0) + 1,
        paginas_totales: Math.max(Math.ceil(((prev?.total || 0) + 1) / PAGE_SIZE), 1),
      }));
      setCurrentPage(1);
      toast({ title: "Arrendatario creado", description: MESSAGES.leaseTenant.create, variant: "default" });
      handleCloseForm();
    } catch (error) {
      toast({
        title: "Error al crear arrendatario",
        description: error.message || MESSAGES.leaseTenant.createError,
        variant: "destructive",
      });
      throw error;
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateTenant = async (formData) => {
    if (!tenantToEdit) return;
    setFormSubmitting(true);
    try {
      const updated = await renantsApiService.update(tenantToEdit.id, formData);
      setArrendatarios((prev) => prev.map((tenant) => (tenant.id === updated.id ? updated : tenant)));
      fetchTenants(searchTerm.trim(), currentPage);
      toast({ title: "Arrendatario actualizado", description: MESSAGES.leaseTenant.update, variant: "default" });
      handleCloseForm();
    } catch (error) {
      toast({
        title: "Error al actualizar arrendatario",
        description: error.message || MESSAGES.leaseTenant.updateError,
        variant: "destructive",
      });
      throw error;
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSubmit = (formData) => {
    if (tenantToEdit) {
      return handleUpdateTenant(formData);
    }
    return handleCreateTenant(formData);
  };

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;
    try {
      const removedTenant = await renantsApiService.delete(tenantToDelete.id);
      const removedId = removedTenant?.id ?? tenantToDelete.id;
      setArrendatarios((prev) => prev.filter((tenant) => tenant.id !== removedId));
      fetchTenants(searchTerm.trim(), currentPage);
      toast({ title: "Arrendatario eliminado", description: MESSAGES.leaseTenant.delete, variant: "default" });
    } catch (error) {
      toast({
        title: "Error al eliminar arrendatario",
        description: error.message || MESSAGES.leaseTenant.deleteError,
        variant: "destructive",
      });
    } finally {
      setTenantToDelete(null);
    }
  };

  // Calcular estadísticas
  const stats = {
    total: pagination.total,
    activos: arrendatarios.filter(t => normalizeEstado(t.estado) === 'activo').length,
    morosos: arrendatarios.filter(t => normalizeEstado(t.estado) === 'moroso').length,
    conInmuebles: arrendatarios.filter(t => t.inmueblesArrendados && t.inmueblesArrendados.length > 0).length
  };

  const renderFormModal = () => {
    if (!showForm) return null;

    const modalContent = (
      <LeasesPersonForm
        onSubmit={handleSubmit}
        onClose={handleCloseForm}
        nextId={arrendatarios.length + 1}
        initialData={tenantToEdit}
        isSubmitting={formSubmitting}
      />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById("modal-root") || document.body
    );
  };

  const renderViewModal = () => {
    if (!tenantToView) return null;
    const modalContent = (
      <ViewTenantModal tenant={tenantToView} onClose={() => setTenantToView(null)} />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById("modal-root") || document.body
    );
  };

const renderDeleteModal = () => {
  return null;

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setTenantToDelete(null)}
      />

      {/* Card */}
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
            onClick={() => setTenantToDelete(null)}
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
              {tenantToDelete.primerNombre} {tenantToDelete.primerApellido}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTenantToDelete(null)}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDeleteTenant}
            className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
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

  return (
    <>
      <div className="p-6 space-y-6">
        {/* HEADER CON NUEVO ESTILO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Arrendatarios</h1>
            <p className="text-slate-600 mt-1">Administra la información de tus arrendatarios, contratos y propiedades vinculadas</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setTenantToEdit(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Nuevo Arrendatario
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
                placeholder="Buscar arrendatario por nombre, documento, correo..."
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
                className="pl-10 pr-8 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Banner removido: se usarán toasts para feedback */}

        {/* CONTENT AREA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* TABLA REORGANIZADA */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-visible">
            {/* CABECERA DE TABLA */}
            <div className="overflow-x-auto overflow-y-visible">
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
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          Cargando arrendatarios...
                        </div>
                      </td>
                    </tr>
                  ) : arrendatarios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-slate-500">No se encontraron arrendatarios con el criterio seleccionado.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    arrendatarios.map((tenant) => {
                      const estadoNormalized = normalizeEstado(tenant.estado);
                      const estadoLabel = tenant.estado || "Pendiente";
                      const isEditBlocked = hasAssociatedLease(tenant);
                      const tenantRowId = getTenantRowId(tenant);
                      return (
                      <tr key={tenantRowId} className="hover:bg-slate-50 transition-colors">
                        {/* INFORMACIÓN PERSONAL */}
                        <td className="px-6 py-4">
                          <div className="text-center">
                            <p className="font-semibold text-slate-800 text-sm">
                              {tenant.primerNombre} {tenant.primerApellido}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {tenant.correo}
                            </p>
                          </div>
                        </td>

                        {/* DOCUMENTO */}
                        <td className="px-6 py-4 text-center">
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500 block">Tipo</span>
                            <span className="text-sm font-medium text-slate-700 block">{tenant.tipoDocumento}</span>
                            <span className="text-xs text-slate-500 block">Número</span>
                            <span className="text-sm font-semibold text-slate-800 block">{tenant.documento}</span>
                          </div>
                        </td>

                        {/* INMUEBLE ASIGNADO */}
                        <td className="px-6 py-4">
                          {(tenant.inmueblesArrendados && tenant.inmueblesArrendados.length > 0) || tenant.nombreInmueble || tenant.inmueble ? (
                            <div className="flex flex-col items-center justify-center gap-1 text-center">
                              <Home className="w-4 h-4 text-slate-400" />
                              <p className="text-xs text-slate-500">
                                {tenant.inmueblesArrendados?.[0]?.nombre ||
                                  tenant.nombreInmueble ||
                                  tenant.inmueble?.titulo ||
                                  tenant.inmueble?.nombre ||
                                  tenant.inmueble?.nombre_comercial ||
                                  (tenant.inmueblesArrendados?.[0]?.id ? `Inmueble #${tenant.inmueblesArrendados[0].id}` : "Inmueble asignado")}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <Home className="w-6 h-6 mb-1" />
                              <span className="text-xs italic">Sin inmuebles asignados</span>
                            </div>
                          )}
                        </td>

                        {/* CONTACTO */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <div className="flex items-center gap-1 text-slate-600">
                              <Phone className="w-3 h-3" />
                              <span className="text-sm font-medium">{tenant.telefono}</span>
                            </div>
                            {tenant.celular && (
                              <div className="text-xs text-slate-500">
                                Cel: {tenant.celular}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* ESTADO */}
                        <td className="px-6 py-4 text-center relative">
                          <div className="flex flex-col items-center justify-center space-y-2" data-status-menu>
                            <button
                              type="button"
                              onClick={() =>
                                setStatusMenuId((prev) =>
                                  prev === tenantRowId
                                    ? null
                                    : tenantRowId
                                )
                              }
                              disabled={statusChangingId === tenantRowId}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition shadow-sm ${
                                estadoNormalized === "activo"
                                  ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:ring-2 hover:ring-green-200"
                                  : estadoNormalized === "moroso"
                                  ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:ring-2 hover:ring-red-200"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 hover:ring-2 hover:ring-yellow-200"
                              } ${statusChangingId === tenantRowId ? "opacity-60 cursor-not-allowed" : ""} ${statusMenuId === tenantRowId ? "ring-2 ring-slate-200" : ""}`}
                            >
                              {statusChangingId === tenantRowId && (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              )}
                              <span>{estadoLabel}</span>
                              <ChevronDown className="w-3 h-3 ml-2" />
                            </button>
                            {statusMenuId === tenantRowId && (
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-10 z-[60] bg-white border border-slate-200 rounded-lg shadow-xl text-xs w-36 py-1">
                                {["Activo", "Inactivo"].map((estadoOpcion) => (
                                  <button
                                    key={estadoOpcion}
                                    type="button"
                                    onClick={() => handleToggleEstado(tenant, estadoOpcion)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                  >
                                    {estadoOpcion}
                                  </button>
                                ))}
                              </div>
                            )}
                            {tenant.fechaInicio && (
                              <span className="text-xs text-slate-500">
                                Desde: {new Date(tenant.fechaInicio).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ACCIONES */}
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleViewTenant(tenant)}
                              className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                              aria-label="Ver arrendatario"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              disabled={isEditBlocked}
                              onClick={() => handleEditTenant(tenant)}
                              className={`p-2 transition-colors ${isEditBlocked ? "text-slate-300 cursor-not-allowed" : "text-green-600 hover:text-green-800"}`}
                              title={isEditBlocked ? "No puedes editar un arrendatario con un arriendo asociado" : "Editar arrendatario"}
                              aria-label="Editar arrendatario"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            {/* Acción de eliminar temporalmente deshabilitada */}
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={
              (Boolean(pagination?.has_next_page) ||
                ((pagination?.paginas_totales || 1) <= currentPage && arrendatarios.length === PAGE_SIZE))
                ? Math.max(pagination?.paginas_totales || 1, currentPage + 1)
                : Math.max(pagination?.paginas_totales || 1, currentPage)
            }
            hasPrevPage={currentPage > 1}
            hasNextPage={
              Boolean(pagination?.has_next_page) ||
              ((pagination?.paginas_totales || 1) <= currentPage && arrendatarios.length === PAGE_SIZE)
            }
            onPageChange={(page) => {
              const hasNextPage =
                Boolean(pagination?.has_next_page) ||
                ((pagination?.paginas_totales || 1) <= currentPage && arrendatarios.length === PAGE_SIZE);
              const totalPages = hasNextPage
                ? Math.max(pagination?.paginas_totales || 1, currentPage + 1)
                : Math.max(pagination?.paginas_totales || 1, currentPage);
              if (page === currentPage || page < 1 || (page > totalPages && !hasNextPage)) return;
              setCurrentPage(page);
              fetchTenants(searchTerm.trim(), page);
            }}
          />
        </motion.div>
      </div>

      {/* MODALES */}
      {renderFormModal()}
      {renderViewModal()}
      {renderDeleteModal()}
    </>
  );
}