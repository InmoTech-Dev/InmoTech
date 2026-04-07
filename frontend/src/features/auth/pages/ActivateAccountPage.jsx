import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Lock, Mail, RefreshCcw, ShieldCheck, XCircle } from 'lucide-react';
import invitacionApi from '../../../shared/services/invitacionApiService';
import { useAuth } from '../../../shared/contexts/AuthContext';

const strengthLabels = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte'];

const isUsedOrInvalid = (msg = '') => {
  const normalized = (msg || '').toLowerCase();
  return normalized.includes('utiliz') || normalized.includes('no encontrada') || normalized.includes('invalida') || normalized.includes('invalido');
};

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const { isAuthenticated, user, logout } = useAuth();

  const [estado, setEstado] = useState('loading'); // loading | ready | success | error | redirect
  const [mensaje, setMensaje] = useState('');
  const [correo, setCorreo] = useState('');
  const [nombre, setNombre] = useState('');
  const [expira, setExpira] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const [codigoDigits, setCodigoDigits] = useState(['', '', '', '', '', '']);
  const codeRefs = useRef(Array(6).fill(null));
  const passwordRef = useRef(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordScore = Object.values(passwordStrength).filter(Boolean).length;
  const getPasswordStrengthText = () => strengthLabels[Math.max(0, Math.min(passwordScore - 1, 4))] || strengthLabels[0];
  const getPasswordStrengthColor = () => {
    if (passwordScore <= 2) return 'bg-red-500';
    if (passwordScore <= 3) return 'bg-yellow-500';
    if (passwordScore <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const handleCodeChange = (idx, value) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const next = [...codigoDigits];
    next[idx] = digit;
    setCodigoDigits(next);
    if (inlineError) setInlineError('');

    if (digit && idx < codeRefs.current.length - 1) {
      codeRefs.current[idx + 1]?.focus();
    } else if (digit && idx === codeRefs.current.length - 1) {
      passwordRef.current?.focus();
    }
    if (!digit && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const handleCodeKeyDown = (idx, event) => {
    if (event.key === 'Backspace' && !codigoDigits[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const updatePasswordStrength = (value) => {
    setPasswordStrength({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value)
    });
  };

  const handleResend = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setMensaje('');
    try {
      const res = await invitacionApi.reenviar(token);
      if (res && res.success) {
        setEstado('ready');
        setMensaje('Enviamos un nuevo enlace y código a tu correo.');
        setCanResend(false);
      } else {
        setEstado('error');
        setMensaje(res?.message || 'No se pudo reenviar la invitación');
        setCanResend(!(res?.message || '').toLowerCase().includes('vigente'));
      }
    } catch (err) {
      setEstado('error');
      setMensaje(err?.data?.message || err.message || 'No se pudo reenviar la invitación');
      setCanResend(!(err?.data?.message || err.message || '').toLowerCase().includes('vigente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setEstado('error');
        setMensaje('Token de invitación no encontrado');
        setCanResend(false);
        return;
      }
      try {
        const res = await invitacionApi.validar(token);
        if (res && res.success) {
          setCorreo(res.data?.correo || '');
          setNombre(res.data?.nombre_completo || '');
          setExpira(res.data?.expira_en || '');
          const inviteEmail = (res.data?.correo || '').toLowerCase();
          const currentEmail = (user?.correo || '').toLowerCase();
          const mismatch = isAuthenticated && inviteEmail && currentEmail && inviteEmail !== currentEmail;
          setSessionBlocked(mismatch);
          setEstado('ready');
          setCanResend(true);
        } else {
          const rawMsg = res?.message || 'Invitación inválida o expirada';
          if (isUsedOrInvalid(rawMsg)) {
            setMensaje('Esta invitación ya fue utilizada o es inexistente. Volviendo al inicio...');
            setEstado('redirect');
            setCanResend(false);
            setTimeout(() => navigate('/'), 2500);
            return;
          }
          setEstado('error');
          setMensaje(rawMsg);
          setCanResend(true);
        }
      } catch (err) {
        const rawMsg = err?.data?.message || err.message || 'No se pudo validar la invitación';
        if (isUsedOrInvalid(rawMsg)) {
          setMensaje('Esta invitación ya fue utilizada o es inexistente. Volviendo al inicio...');
          setEstado('redirect');
          setCanResend(false);
          setTimeout(() => navigate('/'), 2500);
          return;
        }
        setEstado('error');
        setMensaje(rawMsg);
        setCanResend(true);
      }
    };
    fetchData();
  }, [token, isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    const codigo = codigoDigits.join('');
    if (codigo.length !== 6) {
      setEstado('error');
      setMensaje('Ingresa el código completo de 6 dígitos');
      return;
    }
    if (password !== confirmPassword) {
      setEstado('error');
      setMensaje('Las contraseñas no coinciden');
      return;
    }

    setIsSubmitting(true);
    setMensaje('');
    setInlineError('');
    try {
      const res = await invitacionApi.aceptar({ token, codigo_6d: codigo, password });
      if (res && res.success) {
        setEstado('success');
        setMensaje('Contraseña creada. Ya puedes iniciar sesión.');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        const rawMsg = res?.message || 'No se pudo completar la activación';
        if (isUsedOrInvalid(rawMsg)) {
          setEstado('redirect');
          setMensaje('Esta invitación ya fue utilizada. Volviendo al inicio...');
          setTimeout(() => navigate('/'), 2500);
          return;
        }

        if (rawMsg.toLowerCase().includes('codigo') || rawMsg.toLowerCase().includes('código')) {
          setInlineError(rawMsg);
        } else {
          setEstado('error');
          setMensaje(rawMsg);
        }
      }
    } catch (err) {
      const rawMsg = err?.data?.message || err.message || 'No se pudo completar la activación';
      if (isUsedOrInvalid(rawMsg)) {
        setEstado('redirect');
        setMensaje('Esta invitación ya fue utilizada. Volviendo al inicio...');
        setTimeout(() => navigate('/'), 2500);
        return;
      }

      if (rawMsg.toLowerCase().includes('codigo') || rawMsg.toLowerCase().includes('código')) {
        setInlineError(rawMsg);
      } else {
        setEstado('error');
        setMensaje(rawMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutAndReload = async () => {
    try {
      setIsSubmitting(true);
      await logout();
      window.location.reload();
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  const renderEstado = () => {
    if (estado === 'loading') {
      return (
        <div className="text-center space-y-3">
          <div className="animate-pulse text-gray-600">Validando invitación...</div>
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
        </div>
      );
    }

    if (estado === 'error') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-red-700 font-semibold">No se pudo activar</p>
            <p className="text-red-600 text-sm">{mensaje}</p>
            {canResend && (
              <button
                onClick={handleResend}
                className="mt-3 text-sm font-medium text-[#00457B] hover:text-[#003b69] underline"
                disabled={isSubmitting}
              >
                Reenviar invitación
              </button>
            )}
          </div>
        </div>
      );
    }

    if (estado === 'success') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-green-700 font-semibold">Activación completada</p>
            <p className="text-green-600 text-sm">Redirigiendo al login...</p>
          </div>
        </div>
      );
    }

    if (estado === 'redirect') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-3">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-blue-700 font-semibold">{mensaje || 'Redirigiendo...'}</p>
            <p className="text-blue-600 text-sm">Espera un momento.</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const expiraTexto = expira ? new Date(expira).toLocaleString() : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-gradient-to-br from-[#00457B] via-[#0056A3] to-[#0066CC] text-white p-10 relative">
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative z-10 space-y-6 flex flex-col items-center text-center">
            <div className="w-full flex justify-center">
              <img src="/images/logo-matriz-sin-fondo.png" alt="Matriz Inmobiliaria" className="w-52 drop-shadow-md" />
            </div>
            <h1 className="text-3xl font-bold leading-tight">Activa tu cuenta</h1>
            <p className="text-blue-100 max-w-md">Define tu contraseña y usa el código de 6 dígitos que te enviamos al correo.</p>
            <div className="grid gap-3 text-sm text-blue-50/90 w-full max-w-md">
              <div className="flex items-center space-x-3 bg-white/10 rounded-xl px-3 py-2 justify-center">
                <ShieldCheck className="h-5 w-5 -ml-1" />
                <div>
                  <div className="font-semibold text-white">Seguro y temporal</div>
                  <div className="text-xs text-blue-100">Enlace con vencimiento: {expiraTexto || '24h'}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-black/10 rounded-xl px-3 py-2 justify-center">
                <RefreshCcw className="h-5 w-5 -ml-1" />
                <div>
                  <div className="font-semibold text-white">¿Expiró?</div>
                  <div className="text-xs text-blue-100">Pide un nuevo enlace a un administrador.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-6">
          {renderEstado()}

          {estado === 'ready' && sessionBlocked && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 font-semibold">Para activar esta cuenta debes cerrar la sesión actual.</p>
              <p className="text-amber-700 text-sm mb-3">Cierra sesión y continuaremos con la activación.</p>
              <button
                type="button"
                onClick={handleLogoutAndReload}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00457B] text-white font-medium hover:bg-[#003b69] disabled:opacity-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Cerrar sesión y continuar
              </button>
            </div>
          )}

          {estado === 'ready' && !sessionBlocked && (
            <>
              <div className="space-y-2">
                <p className="text-gray-800 font-semibold text-lg">Hola {nombre || 'usuario'}</p>
                <p className="text-gray-600 text-sm">Tu correo de acceso: <strong>{correo}</strong></p>
                <p className="text-gray-500 text-sm">Ingresa el código que te llegó al correo y define tu contraseña.</p>
                {canResend && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isSubmitting}
                    className="text-sm font-semibold text-[#00457B] hover:text-[#003b69] underline"
                  >
                    ¿No recibiste el correo? Reenviar invitación
                  </button>
                )}
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <ShieldCheck className="h-4 w-4 mr-2 text-[#00457B]" />
                    Código de verificación (6 dígitos)
                  </label>
                  <div className="flex gap-2">
                    {codigoDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { codeRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        required
                        value={digit}
                        onChange={(e) => handleCodeChange(idx, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                        className="w-10 h-12 text-center text-lg font-semibold rounded-xl border-2 border-gray-200 focus:border-[#00457B] focus:ring-[#00457B] transition-all"
                        placeholder="*"
                        disabled={isSubmitting}
                      />
                    ))}
                  </div>
                  {inlineError && (
                    <div className="flex items-center mt-2 text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                      <AlertTriangle className="h-4 w-4 mr-1.5" />
                      <span className="text-sm font-medium">{inlineError}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Lock className="h-4 w-4 mr-2 text-[#00457B]" />
                    Define tu contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        updatePasswordStrength(e.target.value);
                      }}
                      ref={passwordRef}
                      className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-gray-200 focus:border-[#00457B] focus:ring-[#00457B] transition-all"
                      placeholder="Contraseña segura"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`} style={{ width: `${(passwordScore / 5) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{getPasswordStrengthText()}</span>
                  </div>
                  <p className="text-xs text-gray-500">Mínimo 8 caracteres, incluye mayúscula, minúscula, número y símbolo.</p>
                  {password && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center">
                          {passwordStrength.length ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          <span className="text-gray-600">8+ caracteres</span>
                        </div>
                        <div className="flex items-center">
                          {passwordStrength.uppercase ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          <span className="text-gray-600">Mayúscula</span>
                        </div>
                        <div className="flex items-center">
                          {passwordStrength.number ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          <span className="text-gray-600">Número</span>
                        </div>
                        <div className="flex items-center">
                          {passwordStrength.special ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          <span className="text-gray-600">Símbolo</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Lock className="h-4 w-4 mr-2 text-[#00457B]" />
                    Confirma tu contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-gray-200 focus:border-[#00457B] focus:ring-[#00457B] transition-all"
                      placeholder="Repite la contraseña"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && confirmPassword && password !== confirmPassword && (
                    <div className="flex items-center mt-2 text-red-600">
                      <XCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Las contraseñas no coinciden</span>
                    </div>
                  )}
                  {password && confirmPassword && password === confirmPassword && (
                    <div className="flex items-center mt-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      <span className="text-sm">Las contraseñas coinciden</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-[#00457B] to-[#0056A3] hover:from-[#003b69] hover:to-[#004a8f] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5" />
                      <span>Activar y guardar contraseña</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
