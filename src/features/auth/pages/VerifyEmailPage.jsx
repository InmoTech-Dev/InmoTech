import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ShieldCheck, AlertTriangle, RotateCcw, CheckCircle2, XCircle, Clock, Inbox } from 'lucide-react';
import authService from '../../../shared/services/authService';
import invitacionApi from '../../../shared/services/invitacionApiService';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';
  const [activeToken, setActiveToken] = useState(initialToken);
  const [email, setEmail] = useState(initialEmail);
  const [codigoDigits, setCodigoDigits] = useState(['', '', '', '', '', '']);
  const codeRefs = useRef(Array(6).fill(null));

  const [estado, setEstado] = useState('idle'); // idle | success | error
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [remainingCodes, setRemainingCodes] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    codeRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const fetchFromToken = async () => {
      if (!activeToken) {
        setTokenError('Link invalido. Abre el enlace de tu correo para verificar.');
        setEstado('error');
        setMensaje('Link invalido.');
        return;
      }
      setTokenError('');
      setInfo('Validando tu enlace...');
      try {
        const res = await invitacionApi.validar(activeToken);
        if (res?.success && res.data?.correo) {
          setEmail(res.data.correo);
          setInfo('Enlace validado. Ingresa el codigo que recibiste en tu correo.');
          setLimitReached(false);
        } else {
          setActiveToken(null);
          setTokenError(res?.message || 'No pudimos validar el enlace. Solicita un nuevo correo de verificacion.');
          setEstado('error');
          setMensaje(res?.message || 'Link invalido o expirado.');
        }
      } catch (err) {
        setActiveToken(null);
        setTokenError(err?.data?.message || err?.message || 'No pudimos validar el enlace. Solicita un nuevo correo de verificacion.');
        setEstado('error');
        setMensaje(err?.data?.message || err?.message || 'Link invalido o expirado.');
      }
    };
    fetchFromToken();
  }, [activeToken, navigate]);

  const codigo = useMemo(() => codigoDigits.join(''), [codigoDigits]);

  const handleCodeChange = (idx, value) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const next = [...codigoDigits];
    next[idx] = digit;
    setCodigoDigits(next);

    if (digit && idx < codeRefs.current.length - 1) {
      codeRefs.current[idx + 1]?.focus();
    } else if (!digit && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const handleCodeKeyDown = (idx, event) => {
    if (event.key === 'Backspace' && !codigoDigits[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeToken) {
      setEstado('error');
      setMensaje('Link invalido. Abre el enlace de tu correo para verificar.');
      return;
    }
    if (codigo.length !== 6) {
      setEstado('error');
      setMensaje('Ingresa los 6 digitos del codigo.');
      return;
    }

    setIsSubmitting(true);
    setMensaje('');
    setEstado('idle');
    try {
      const res = await authService.verifyEmailCode(email.trim().toLowerCase(), codigo);
      if (res?.success) {
        setEstado('success');
        setMensaje('Listo, tu correo quedo verificado. Redirigiendo al inicio de sesion...');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        setEstado('error');
        setMensaje(res?.message || 'No pudimos verificar el codigo.');
      }
    } catch (err) {
      setEstado('error');
      const reason = err?.reason || err?.data?.reason;
      if (reason === 'VERIFICATION_LIMIT') {
        setLimitReached(true);
      }
      setMensaje(err?.data?.message || err?.message || 'No pudimos verificar el codigo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!activeToken && !email) {
      setEstado('error');
      setMensaje('Link invalido. Abre el enlace de tu correo para verificar.');
      return;
    }
    setIsResending(true);
    setMensaje('');
    setInfo('');
    try {
      let res = null;
      if (activeToken) {
        res = await invitacionApi.reenviar(activeToken);
      } else if (email) {
        res = await authService.resendVerificationCode(email.trim().toLowerCase());
      }
      if (res?.success) {
        const total = res.data?.total_enviados || 0;
        const max = res.data?.max_codigos || 5;
        setRemainingCodes(Math.max(max - total, 0));
        setLimitReached(total >= max);
        setCodigoDigits(['', '', '', '', '', '']);
        codeRefs.current[0]?.focus();
        setEstado('success');
        setMensaje('Enviamos un nuevo codigo. Revisa tu bandeja y escribe los 6 digitos.');
        if (res.data?.token) {
          const newToken = res.data.token;
          setActiveToken(newToken);
          const url = new URL(window.location.href);
          url.searchParams.set('token', newToken);
          window.history.replaceState({}, '', url.toString());
        }
        setInfo('');
      } else {
        setEstado('error');
        setMensaje(res?.message || 'No pudimos reenviar el codigo.');
      }
    } catch (err) {
      const reason = err?.reason || err?.data?.reason;
      if (reason === 'VERIFICATION_LIMIT') {
        setLimitReached(true);
      }
      setEstado('error');
      setMensaje(err?.data?.message || err?.message || 'No pudimos reenviar el codigo.');
    } finally {
      setIsResending(false);
    }
  };

  const remainingText = useMemo(() => {
    if (remainingCodes === null) return null;
    if (remainingCodes <= 0) return 'Alcanzaste el limite de codigos (5). Contacta a soporte.';
    if (remainingCodes === 1) return 'Te queda 1 codigo disponible.';
    return `Te quedan ${remainingCodes} codigos disponibles.`;
  }, [remainingCodes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl bg-white shadow-2xl rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-slate-100">
        <div className="bg-gradient-to-br from-[#00457B] via-[#0056A3] to-[#0066CC] text-white p-10 relative">
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6" />
              <div>
                <p className="text-blue-100 text-sm">Paso final</p>
                <h1 className="text-2xl font-semibold">Verifica tu correo</h1>
              </div>
            </div>

            <div className="space-y-3 text-blue-50">
              <p className="font-semibold text-white">Como funciona</p>
              <div className="flex items-start gap-3 bg-white/10 rounded-xl px-4 py-3">
                <Inbox className="h-5 w-5 mt-0.5" />
                <p className="text-sm leading-relaxed">Revisa tu bandeja y copia el codigo de 6 digitos que enviamos.</p>
              </div>
              <div className="flex items-start gap-3 bg-white/10 rounded-xl px-4 py-3">
                <ShieldCheck className="h-5 w-5 mt-0.5" />
                <p className="text-sm leading-relaxed">Ingresa el codigo aqui para habilitar tu cuenta. Cada reenvio invalida el codigo anterior.</p>
              </div>
              <div className="flex items-start gap-3 bg-white/10 rounded-xl px-4 py-3">
                <Clock className="h-5 w-5 mt-0.5" />
                <p className="text-sm leading-relaxed">Solo puedes solicitar 5 codigos. Si llegas al limite, contáctanos para validar tu cuenta.</p>
              </div>
              {remainingText && (
                <p className="text-xs text-blue-100/90">{remainingText}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-10 space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Paso 2 de 2</p>
            <h2 className="text-2xl font-bold text-slate-900">Confirma tu correo con el codigo</h2>
            <p className="text-slate-600">Usa el enlace del correo y escribe el codigo recibido.</p>
            {tokenError && (
              <p className="text-red-600 text-sm">{tokenError}</p>
            )}
            {info && (
              <p className="text-blue-700 text-sm">{info}</p>
            )}
          </div>

          {estado === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-green-700 font-semibold">Todo listo</p>
                <p className="text-green-600 text-sm">{mensaje || 'Codigo correcto.'}</p>
              </div>
            </div>
          )}

          {estado === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-red-700 font-semibold">No pudimos verificar</p>
                <p className="text-red-600 text-sm">{mensaje}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#00457B]" />
                Verificando: <span className="font-semibold text-[#00457B]">{email || '---'}</span>
              </p>
              <p className="text-xs text-slate-600">Este enlace es unico para tu correo.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#00457B]" />
                Codigo de verificacion (6 digitos)
              </label>
              <div className="flex gap-2">
                {codigoDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => { codeRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                    className="w-12 h-12 text-center text-lg font-semibold rounded-xl border-2 border-gray-200 focus:border-[#00457B] focus:ring-[#00457B] transition-all"
                    placeholder="*"
                    disabled={isSubmitting || limitReached}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || limitReached || !activeToken}
              className="w-full h-12 bg-gradient-to-r from-[#00457B] to-[#0056A3] hover:from-[#003b69] hover:to-[#004a8f] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  <span>Confirmar codigo</span>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-700">¿No recibiste el correo?</p>
              <p className="text-xs text-slate-500">Reenviamos un nuevo codigo y anulamos el anterior.</p>
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || limitReached || (!activeToken && !email)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#00457B] border border-[#00457B] hover:bg-blue-50 disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <div className="h-4 w-4 border-2 border-[#00457B] border-t-transparent rounded-full animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Reenviar codigo
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-[#00457B] font-semibold hover:text-[#003b69]"
            >
              Volver al inicio de sesion
            </button>
            {limitReached && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                <span>Limite de codigos alcanzado. Contacta soporte.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


