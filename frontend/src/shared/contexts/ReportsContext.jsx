import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const ReportsContext = createContext(undefined);

export const ReportsProvider = ({ children }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const nextId = useCallback(() => {
    const lastNumeric = reports.length > 0
      ? Math.max(...reports
          .map(r => parseInt((r.id || '0').toString().replace(/\D/g, '') || '0')))
      : 0;
    return `J${String(lastNumeric + 1).padStart(3, '0')}`;
  }, [reports]);

  const today = () => {
    const d = new Date();
    return d.toLocaleDateString('es-ES');
  };

  const createReport = useCallback(async (data) => {
    // Generar id y fecha para la UI
    const nuevo = {
      id: data.id || nextId(),
      fecha: data.fecha || today(),
      ubicacion: data.ubicacion || '',
      tipoInmueble: data.tipoInmueble || '',
      referencia: data.referencia || (data.id || ''),
      propietario: data.propietario || '',
      tipoReporte: data.tipoReporte || '',
      descripcion: data.descripcion || '',
      estado: data.estado || 'En proceso',
      seguimientoGeneral: data.seguimientoGeneral || '',
      rubros: data.rubros || [],
      imagenes: data.imagenes || [],
      archivos: data.archivos || [],
      id_inmueble: data.id_inmueble || null,
    };
    setReports(prev => [nuevo, ...prev]);
    return nuevo;
  }, [nextId]);

  const updateReport = useCallback(async (id, data) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    return { ...data, id };
  }, []);

  const deleteReport = useCallback(async (id) => {
    setReports(prev => prev.filter(r => r.id !== id));
  }, []);

  const refreshReports = useCallback(async () => {
    // No-op por ahora (sin persistencia); dejamos hook listo
    setLoading(false);
  }, []);

  const value = useMemo(() => ({
    reports,
    loading,
    createReport,
    updateReport,
    deleteReport,
    refreshReports,
  }), [reports, loading, createReport, updateReport, deleteReport, refreshReports]);

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
};

export const useReports = () => {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports debe usarse dentro de ReportsProvider');
  return ctx;
};

export default ReportsContext;