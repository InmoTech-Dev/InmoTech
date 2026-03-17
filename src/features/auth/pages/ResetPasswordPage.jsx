import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle2, AlertTriangle, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useAuth } from './../../shared/contexts/AuthContext';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { resetPassword, validateResetToken, forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [resendEmail, setResendEmail] = useState(searchParams.get('email') || '');
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenError, setTokenError] = useState('');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError('El enlace de recuperacion no es valido o ya expiro.');
        setCheckingToken(false);
        return;
      }
      try {
        setCheckingToken(true);
        const res = await validateResetToken(token);
        if (res?.success) {
          const foundEmail = res.data?.email || '';
          setEmail(foundEmail);
          if (foundEmail) setResendEmail(foundEmail);
          setTokenError('');
        } else {
          setTokenError(res?.message || 'El enlace no es valido.');
        }
      } catch (err) {
        setTokenError(err?.message || 'El enlace no es valido o ya expiro.');
      } finally {
        setCheckingToken(false);
      }
    };

    validateToken();
  }, [token, validateResetToken]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (tokenError) {
      setStatus({ type: 'error', message: tokenError });
      return false;
    }
    if (form.password.length < 8) {
      setStatus({ type: 'error', message: 'La nueva contrasena debe tener al menos 8 caracteres.' });
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Las contrasenas no coinciden.' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      setStatus({ type: '', message: '' });
      await resetPassword(token, form.password);
      setStatus({
        type: 'success',
        message: 'Nueva contrasena guardada correctamente. Puedes ir al inicio de sesion.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'No se pudo restablecer la contrasena.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    const targetEmail = resendEmail || email;
    if (!targetEmail) return;
    try {
      setIsResending(true);
      setStatus({ type: '', message: '' });
      await forgotPassword(targetEmail);
      setStatus({
        type: 'success',
        message: 'Enviamos un nuevo enlace de recuperacion. Revisa tu bandeja o spam.'
      });
      setTokenError('');
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'No pudimos reenviar el correo de recuperacion.'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/70 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-2 rounded-2xl bg-white/90 backdrop-blur shadow-2xl p-2">
        <div className="rounded-2xl bg-gradient-to-br from-[#0f2b46] via-[#134d77] to-[#0f2b46] p-6 text-white shadow-xl">
          <p className="text-sm opacity-80 mb-2">Paso 2 de 2</p>
          <h2 className="text-2xl font-bold mb-2">Restablece tu contrasena</h2>
          <p className="text-sm text-white/80 mb-4">
            Usa el enlace del correo para definir una nueva contrasena y continuar con el acceso.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white/10 rounded-xl px-4 py-3">
              <Lock className="h-5 w-5 mt-0.5" />
              <p className="text-sm leading-relaxed">
                El enlace es unico y expira pronto. Solo necesitas definir la nueva contrasena.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-slate-500">Verificando:</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{email || '---'}</p>
            </div>
            {tokenError && (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {isResending ? 'Reenviando...' : 'Reenviar correo'}
              </button>
            )}
          </div>

          {tokenError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>{tokenError}</span>
            </div>
          )}
          {tokenError && (
            <div className="mb-4 space-y-2">
              <label className="text-xs font-medium text-slate-600">Correo para reenviar el enlace</label>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="tu-correo@dominio.com"
              />
            </div>
          )}

          {status.message && !tokenError && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                status.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {status.message}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Nueva contrasena</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Ingresa una contrasena segura"
                    disabled={checkingToken || Boolean(tokenError)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 mt-1 flex items-center text-slate-500"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Confirma la contrasena</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Repite la contrasena"
                    disabled={checkingToken || Boolean(tokenError)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 right-2 mt-1 flex items-center text-slate-500"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || checkingToken || Boolean(tokenError) || status.type === 'success'}
              className="w-full rounded-xl bg-[#00457B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#003b69] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Actualizando...' : 'Guardar nueva contrasena'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium ${status.type === 'success' ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Volver al inicio de sesion
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
