import React, { useEffect, useMemo, useState } from 'react';
import { Building2, TrendingUp, HandCoins, UserRound, Home, MapPin, Calendar, BadgeCheck } from 'lucide-react';
import ownerPortalApiService from '../../../shared/services/ownerPortalApiService';

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

const MyPropertiesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portfolio, setPortfolio] = useState({
    propietario: null,
    resumen: {
      total_inmuebles: 0,
      inmuebles_venta: 0,
      inmuebles_arriendo: 0,
      canon_total_esperado: 0
    },
    inmuebles: []
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await ownerPortalApiService.getMyPortfolio();
        if (mounted) {
          setPortfolio(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'No se pudo cargar la informacion de tus inmuebles.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: portfolio?.resumen?.total_inmuebles || 0,
      venta: portfolio?.resumen?.inmuebles_venta || 0,
      arriendo: portfolio?.resumen?.inmuebles_arriendo || 0,
      canon: portfolio?.resumen?.canon_total_esperado || 0
    }),
    [portfolio]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00457B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:pt-14">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:pt-14 space-y-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#00457B] via-[#005a9e] to-[#0080ff] px-6 py-7 lg:px-10 shadow-lg text-white">
          <div className="flex items-center gap-6">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Mis Inmuebles</h1>
              <p className="text-sm lg:text-base text-white/80 mt-1">
                Aqui puedes ver los inmuebles que tienes asignados, su estado y valores esperados.
              </p>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 px-5 py-5 space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Resumen</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 p-4 text-center">
              <Home className="h-5 w-5 mx-auto text-slate-500 mb-2" />
              <p className="text-3xl font-semibold text-slate-800">{stats.total}</p>
              <p className="text-sm text-slate-600">Total</p>
            </div>
            <div className="rounded-2xl border border-blue-200 p-4 text-center">
              <Building2 className="h-5 w-5 mx-auto text-blue-500 mb-2" />
              <p className="text-3xl font-semibold text-blue-600">{stats.venta}</p>
              <p className="text-sm text-blue-600">En venta</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 p-4 text-center">
              <BadgeCheck className="h-5 w-5 mx-auto text-emerald-500 mb-2" />
              <p className="text-3xl font-semibold text-emerald-600">{stats.arriendo}</p>
              <p className="text-sm text-emerald-600">En arriendo</p>
            </div>
            <div className="rounded-2xl border border-amber-200 p-4 text-center">
              <HandCoins className="h-5 w-5 mx-auto text-amber-500 mb-2" />
              <p className="text-lg font-semibold text-amber-700">{formatCurrency(stats.canon)}</p>
              <p className="text-sm text-amber-600">Canon esperado total</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {portfolio.inmuebles.map((item) => (
            <article key={item.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">{item.titulo}</h3>
                  <p className="text-sm text-slate-500">Registro: {item.registro}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {item.estadoInmueble || 'Sin estado'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">Ubicacion</p>
                  <p className="font-medium text-slate-800 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {item.direccion}
                  </p>
                  <p className="text-slate-600">{item.ciudad}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">Operacion</p>
                  <p className="font-medium text-slate-800">{item.operacion}</p>
                  <p className="text-slate-600">Estado: {item.estadoInmueble}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">Precio venta</p>
                  <p className="font-medium text-slate-800">{formatCurrency(item.precioVenta)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">Canon esperado</p>
                  <p className="font-medium text-slate-800">{formatCurrency(item.precioArriendo || item.canon)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Periodo arriendo
                  </p>
                  <p className="font-medium text-slate-800">{formatDate(item.arriendo?.fechaInicio)}</p>
                  <p className="text-slate-600">hasta {formatDate(item.arriendo?.fechaFinalizacion)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Arrendatario</p>
                  {item.arrendatario ? (
                    <div className="text-sm text-slate-600 space-y-1">
                      <p className="font-medium text-slate-800 flex items-center gap-1">
                        <UserRound className="h-4 w-4" />
                        {item.arrendatario.nombre}
                      </p>
                      <p>{item.arrendatario.correo || 'Sin correo'}</p>
                      <p>{item.arrendatario.telefono || 'Sin telefono'}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Sin arrendatario asignado.</p>
                  )}
                </div>
              </div>
            </article>
          ))}

          {portfolio.inmuebles.length === 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-slate-500">
              No tienes inmuebles asociados en este momento.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MyPropertiesPage;
