import { useState } from "react"
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Users, Building2, AlertCircle } from "lucide-react"
import { useAuth } from "../../../shared/contexts/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import ForgotPasswordModal from "../components/ForgotPasswordModal"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null)

  const { login, requestPasswordReset } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Obtener la ruta de redirección después del login
  const from = location.state?.from?.pathname || "/"

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const userData = await login(email, password, rememberMe)

      // Roles administrativos que deben ir al dashboard
      const rolesAdministrativos = ['Super Administrador', 'Administrador', 'Empleado']

      let redirectPath = "/"
      if (userData?.roles?.some((rol) => rolesAdministrativos.includes(rol))) {
        redirectPath = "/dashboard"
      }

      // Si viene de una ruta protegida y tiene permisos, redirigir ahí
      if (from !== "/" && from.startsWith("/dashboard")) {
        const hasDashboardAccess = userData?.roles?.some((rol) => rolesAdministrativos.includes(rol))
        if (hasDashboardAccess) {
          redirectPath = from
        }
      }

      setPendingVerificationEmail(null)
      navigate(redirectPath, { replace: true })
    } catch (err) {
      const serverMessage = err?.data?.message || err?.message
      setPendingVerificationEmail(null)
      setError(serverMessage || 'Error al iniciar sesión. Verifica tus credenciales.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-1 ">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#00457B] via-[#0056A3] to-[#0066CC] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white mx-auto">
          <div className="max-w-md text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight">
                Bienvenido a tu
                <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                  Portal Inmobiliario
                </span>
              </h1>
              <p className="text-xl text-blue-100">Gestiona tus propiedades, clientes y ventas desde un solo lugar</p>
            </div>

            <div className="grid grid-cols-1 gap-6 mt-12">
              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-3 rounded-xl">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Gestion de Propiedades</h3>
                  <p className="text-blue-100 text-sm">Administra tu portafolio completo</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="bg-gradient-to-r from-green-400 to-emerald-400 p-3 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Control de Clientes</h3>
                  <p className="text-blue-100 text-sm">Seguimiento completo de leads</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-3 rounded-xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Seguridad Avanzada</h3>
                  <p className="text-blue-100 text-sm">Proteccion de datos garantizada</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorativos */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-yellow-300/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-orange-300/20 rounded-full blur-lg"></div>
      </div>

      {/* Panel derecho */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-md space-y-8 min-h-[830px] flex flex-col justify-center">
          {/* Logo movil */}
          <div className="lg:hidden text-center">
            <img
              src="/images/logo-matriz-sin-fondo-negro.png"
              alt="Matriz Inmobiliaria"
              className="mx-auto w-[380px] h-[200px] object-contain"
            />
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Hola de nuevo!</h2>
            <p className="text-gray-600">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {pendingVerificationEmail && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <div>
                <p className="text-blue-800 font-semibold">Tu cuenta aun no esta verificada.</p>
                <p className="text-blue-700 text-sm">Te enviamos un codigo a {pendingVerificationEmail}. Ingresa con ese enlace.</p>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-gray-700 font-medium flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-[#00457B]" />
                  Correo electronico
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                  className="h-12 pl-12 rounded-xl border-2 border-gray-200 focus:border-[#00457B] focus:ring-[#00457B] transition-all duration-200 w-full"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setPendingVerificationEmail(null)
                  }}
                  required
                  disabled={isLoading}
                />
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-gray-700 font-medium flex items-center">
                    <Lock className="h-4 w-4 mr-2 text-[#00457B]" />
                    Contrasena
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-sm text-[#00457B] hover:text-[#003b69] font-medium transition-colors"
                  >
                    Olvidaste tu contrasena?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                  className="h-12 pl-12 pr-12 rounded-xl border-2 border-gray-200 focus:border-[#00457B] focus:ring-[#00457B] transition-all duration-200 w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <button
                    type="button"
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Recordar sesión */}
            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-5 w-5 border-2 border-gray-300 text-[#00457B] rounded-md"
                disabled={isLoading}
              />
              <label htmlFor="remember" className="text-gray-600 font-medium">
                Recordar sesión
              </label>
            </div>

            {/* Botón */}
            <button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-[#00457B] to-[#0056A3] hover:from-[#003b69] hover:to-[#004a8f] rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Iniciando sesion...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Iniciar Sesion
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-gray-600">
              No tienes una cuenta?{" "}
              <a href="/registro" className="text-[#00457B] font-semibold hover:text-[#003b69] transition-colors">
                Registrate gratis
              </a>
            </p>
          </div>
        </div>
      </div>
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onSubmit={({ email: recoveryEmail }) => requestPasswordReset(recoveryEmail)}
      />
    </div>
  );
}
