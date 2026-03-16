import { useEffect, useMemo, useState } from 'react'
import { Building2, MapPin, CircleDollarSign, Home, RefreshCw } from 'lucide-react'
import { useAuth } from '../../../../shared/contexts/AuthContext'
import { inmueblesAPI } from '../../../../shared/services/propertyApidervice'

const formatCurrency = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Sin valor definido'

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount)
}

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const getUserFullName = (user) => {
  const fullName = [
    user?.primer_nombre,
    user?.segundo_nombre,
    user?.primer_apellido,
    user?.segundo_apellido
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return (
    fullName ||
    user?.nombre_completo ||
    user?.name ||
    user?.correo ||
    'Propietario'
  )
}

const matchesOwner = (property, user) => {
  const userId = Number(user?.id_persona ?? user?.id)
  const userDocument = normalizeText(user?.numero_documento)
  const userEmail = normalizeText(user?.correo || user?.email)
  const userName = normalizeText(getUserFullName(user))

  if (userId && Array.isArray(property.ownerIds) && property.ownerIds.some((id) => Number(id) === userId)) {
    return true
  }

  const owners = Array.isArray(property.propietarios) ? property.propietarios : []

  return owners.some((owner) => {
    const ownerId = Number(owner?.id)
    const ownerDocument = normalizeText(owner?.documento)
    const ownerEmail = normalizeText(owner?.email)
    const ownerName = normalizeText(owner?.nombreCompleto)

    if (userId && ownerId === userId) return true
    if (userDocument && ownerDocument && userDocument === ownerDocument) return true
    if (userEmail && ownerEmail && userEmail === ownerEmail) return true
    if (userName && ownerName && userName === ownerName) return true

    return false
  })
}

export default function OwnerPortfolioPage() {
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProperties = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await inmueblesAPI.getInmuebles(1, 200)
      const items = Array.isArray(response?.items) ? response.items : []
      setProperties(items.filter((property) => matchesOwner(property, user)))
    } catch (requestError) {
      console.error('Error cargando inmuebles del propietario:', requestError)
      setError(requestError.message || 'No se pudieron cargar tus inmuebles.')
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProperties()
  }, [user?.id_persona])

  const stats = useMemo(() => {
    const total = properties.length
    const disponibles = properties.filter((property) => normalizeText(property.estado).includes('disponible')).length
    const enVenta = properties.filter((property) => normalizeText(property.operacion).includes('venta')).length
    const enArriendo = properties.filter((property) => normalizeText(property.operacion).includes('arriendo')).length

    return { total, disponibles, enVenta, enArriendo }
  }, [properties])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eff6ff_0%,#f8fafc_45%,#ffffff_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#0f4c81_55%,#38bdf8_100%)] text-white shadow-xl">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.4fr_1fr] lg:px-10">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sky-100">Portal del propietario</p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Mis inmuebles</h1>
              <p className="mt-3 max-w-2xl text-sm text-sky-50 sm:text-base">
                Vista consolidada de los inmuebles asociados a {getUserFullName(user)}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-sky-100">Total</p>
                <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-sky-100">Disponibles</p>
                <p className="mt-2 text-2xl font-semibold">{stats.disponibles}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-sky-100">En venta</p>
                <p className="mt-2 text-2xl font-semibold">{stats.enVenta}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-sky-100">En arriendo</p>
                <p className="mt-2 text-2xl font-semibold">{stats.enArriendo}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Listado de inmuebles</h2>
              <p className="text-sm text-slate-500">Resultados filtrados con tu perfil actual.</p>
            </div>

            <button
              type="button"
              onClick={loadProperties}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar
            </button>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Cargando tus inmuebles...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-600">
              {error}
            </div>
          ) : properties.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <Home className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">No encontramos inmuebles asociados a tu cuenta.</p>
              <p className="mt-1 text-sm text-slate-500">
                Si ya tienes propiedades registradas, verifica que estén vinculadas con tu documento, correo o id de persona.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {properties.map((property) => (
                <article
                  key={property.id}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="h-48 bg-slate-100">
                    {property.image ? (
                      <img src={property.image} alt={property.titulo} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_100%)]">
                        <Building2 className="h-12 w-12 text-slate-500" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{property.titulo}</h3>
                        <p className="mt-1 text-sm text-slate-500">{property.tipo || 'Inmueble'}</p>
                      </div>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        {property.estado || 'Sin estado'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>{[property.direccion, property.ciudad, property.departamento].filter(Boolean).join(', ') || 'Ubicación no disponible'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-slate-400" />
                        <span>{formatCurrency(property.precio)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                      <span className="text-slate-500">Operación</span>
                      <span className="font-medium text-slate-800">{property.operacion || 'Sin definir'}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
