import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircleIcon, FileTextIcon, RefreshCwIcon } from 'lucide-react';
import FileDownloadButton from '@/shared/components/files/FileDownloadButton';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/utils/cn';
import { getFileNameFromUrl, normalizeRemoteUrl } from '@/shared/utils/fileUrl';

const PDF_LOAD_TIMEOUT_MS = 15000;

export default function PdfViewer({
  url,
  title = 'Vista previa de PDF',
  fileName,
  className,
  iframeClassName,
  heightClassName = 'h-[560px]',
}) {
  const normalizedUrl = useMemo(() => normalizeRemoteUrl(url), [url]);
  const resolvedFileName = fileName || getFileNameFromUrl(normalizedUrl, 'documento.pdf');
  const [status, setStatus] = useState(normalizedUrl ? 'loading' : 'error');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!normalizedUrl) {
      setStatus('error');
      return undefined;
    }

    setStatus('loading');
    const timeoutId = window.setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'error' : current));
    }, PDF_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedUrl, retryKey]);

  const handleRetry = () => {
    if (!normalizedUrl) return;
    setRetryKey((current) => current + 1);
  };

  return (
    <article className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{title}</h3>
          <p className="truncate text-xs text-slate-500">{resolvedFileName}</p>
        </div>
        <FileDownloadButton
          url={normalizedUrl}
          fileName={resolvedFileName}
          label="Descargar PDF"
          className="shrink-0"
        />
      </header>

      <div className={cn('relative bg-slate-100', heightClassName)}>
        {status === 'loading' ? (
          <div className="absolute inset-0 z-10">
            <Skeleton className="h-full w-full rounded-none" />
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <span className="text-sm font-medium text-slate-700">Cargando PDF...</span>
            </div>
          </div>
        ) : null}

        {!normalizedUrl || status === 'error' ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-full bg-red-50 p-3 text-red-600">
              <AlertCircleIcon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">No se pudo mostrar el PDF</p>
              <p className="text-xs text-slate-500">
                Puede deberse a una URL inválida o a que el servidor bloquea la vista embebida.
              </p>
            </div>
            {normalizedUrl ? (
              <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCwIcon className="h-4 w-4" />
                Reintentar
              </Button>
            ) : null}
          </div>
        ) : (
          <iframe
            key={`${normalizedUrl}-${retryKey}`}
            title={title}
            src={normalizedUrl}
            onLoad={() => setStatus('loaded')}
            className={cn('h-full w-full border-0', iframeClassName)}
          />
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        <FileTextIcon className="h-4 w-4" />
        La vista previa usa iframe para mantener compatibilidad con React + Vite.
      </footer>
    </article>
  );
}
