import React, { useEffect, useState } from 'react';
import { Building2, FileText, HandCoins, UserRound } from 'lucide-react';
import ownerPortalApiService from '../../../../shared/services/ownerPortalApiService';

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-CO');
};

const StatCard = ({ title, value, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-2 flex items-center gap-2 text-slate-500">
      <Icon size={16} />
      <span className="text-xs uppercase tracking-wide">{title}</span>
    </div>
    <p className="text-xl font-semibold text-slate-800">{value}</p>
  </div>
);

const OwnerPortfolioPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portfolio, setPortfolio] = useState({
    propietario: null,
    resumen: null,
    inmuebles: []
  });

  useEffect(() => {
    let mounted = true;

    const loadPortfolio = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await ownerPortalApiService.getMyPortfolio();
        if (mounted) {
          setPortfolio(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'No se pudo cargar tu cartera de inmuebles.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPortfolio();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="p-4 text-slate-600">Cargando tu informacion de propietario...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis inmuebles</h1>
        <p className="text-sm text-slate-600">
          {portfolio?.propietario?.nombre_completo || 'Propietario'} - seguimiento de inmuebles y arriendos
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard title="Total inmuebles" value={portfolio?.resumen?.total_inmuebles || 0} icon={Building2} />
        <StatCard title="Con arriendo" value={portfolio?.resumen?.inmuebles_con_arriendo || 0} icon={FileText} />
        <StatCard title="Arriendos activos" value={portfolio?.resumen?.arriendos_activos || 0} icon={UserRound} />
        <StatCard
          title="Canon estimado"
          value={formatCurrency(portfolio?.resumen?.canon_total_estimado || 0)}
          icon={HandCoins}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {portfolio.inmuebles.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-800">{item.titulo}</h3>
                <p className="text-xs text-slate-500">Registro: {item.registro}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {item.arriendo?.estado || 'Sin arriendo'}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-700">{item.direccion}</p>
            <p className="text-sm text-slate-500">{item.ciudad}</p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <p>
                <span className="text-slate-500">Estado inmueble:</span> {item.estadoInmueble}
              </p>
              <p>
                <span className="text-slate-500">Operacion:</span> {item.operacion}
              </p>
              <p className="col-span-2">
                <span className="text-slate-500">Canon:</span> {formatCurrency(item.canon)}
              </p>
              <p>
                <span className="text-slate-500">Inicio:</span> {formatDate(item.arriendo?.fechaInicio)}
              </p>
              <p>
                <span className="text-slate-500">Finalizacion:</span> {formatDate(item.arriendo?.fechaFinalizacion)}
              </p>
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">Arrendatario</p>
              {item.arrendatario ? (
                <>
                  <p>{item.arrendatario.nombre}</p>
                  <p className="text-slate-500">{item.arrendatario.correo || 'Sin correo'}</p>
                  <p className="text-slate-500">{item.arrendatario.telefono || 'Sin telefono'}</p>
                </>
              ) : (
                <p className="text-slate-500">Sin arrendatario asignado</p>
              )}
            </div>
          </div>
        ))}
        {portfolio.inmuebles.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No tienes inmuebles asociados en este momento.
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerPortfolioPage;
