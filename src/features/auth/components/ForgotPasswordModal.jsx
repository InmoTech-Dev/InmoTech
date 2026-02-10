import React, { useEffect, useState } from 'react';
import { X, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

const ForgotPasswordModal = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    email: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm({ email: '' });
      setStatus({ type: '', message: '' });
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setStatus({ type: 'error', message: 'Ingresa un correo válido.' });
      return;
    }

    try {
      setSubmitting(true);
      setStatus({ type: '', message: '' });
      await onSubmit({ email: form.email });
      setStatus({
        type: 'success',
        message:
          'Correo de recuperacin enviado. Si no lo ves, revisa tu bandeja de spam o correo no deseado.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'No pudimos procesar la solicitud. Intenta nuevamente.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatus = () => {
    if (!status.message) return null;
    const Icon = status.type === 'success' ? CheckCircle2 : AlertCircle;
    const styles =
      status.type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-700 border-red-200';
    return (
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${styles}`}>
        <Icon className="h-4 w-4" />
        <p>{status.message}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recuperar contraseña</h2>
            <p className="text-xs text-slate-500">
              Verificaremos que los datos coincidan antes de enviar el enlace seguro.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {renderStatus()}

          <div>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-blue-500" />
              Correo electrónico registrado
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="usuario@dominio.com"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              Enviar enlace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
