import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircleIcon, ImageIcon, RefreshCwIcon } from 'lucide-react';
import FileDownloadButton from '@/shared/components/files/FileDownloadButton';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/utils/cn';
import { getFileNameFromUrl, normalizeRemoteUrl } from '@/shared/utils/fileUrl';

export default function ImageViewer({
  url,
  alt = 'Imagen',
  title = 'Vista previa de imagen',
  fileName,
  className,
  imageClassName,
  aspectRatioClassName = 'aspect-video',
}) {
  const normalizedUrl = useMemo(() => normalizeRemoteUrl(url), [url]);
  const resolvedFileName = fileName || getFileNameFromUrl(normalizedUrl, 'imagen');
  const [status, setStatus] = useState(normalizedUrl ? 'loading' : 'error');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setStatus(normalizedUrl ? 'loading' : 'error');
  }, [normalizedUrl, retryKey]);

  const handleRetry = () => {
    if (!normalizedUrl) return;
    setStatus('loading');
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
          label="Descargar"
          className="shrink-0"
        />
      </header>

      <div className={cn('relative overflow-hidden bg-slate-100', aspectRatioClassName)}>
        {status === 'loading' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
            <Skeleton className="h-full w-full rounded-none" />
            <div className="absolute inset-0 flex items-center justify-center bg-white/65 backdrop-blur-[1px]">
              <span className="text-sm font-medium text-slate-700">Cargando imagen...</span>
            </div>
          </div>
        ) : null}

        {!normalizedUrl || status === 'error' ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-full bg-red-50 p-3 text-red-600">
              <AlertCircleIcon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">No se pudo cargar la imagen</p>
              <p className="text-xs text-slate-500">Verifica que la URL exista y permita acceso remoto.</p>
            </div>
            {normalizedUrl ? (
              <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCwIcon className="h-4 w-4" />
                Reintentar
              </Button>
            ) : null}
          </div>
        ) : (
          <img
            key={`${normalizedUrl}-${retryKey}`}
            src={normalizedUrl}
            alt={alt}
            loading="lazy"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            className={cn(
              'h-full w-full object-contain transition-opacity duration-200',
              status === 'loaded' ? 'opacity-100' : 'opacity-0',
              imageClassName
            )}
          />
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        <ImageIcon className="h-4 w-4" />
        Soporta URLs remotas, incluidas imágenes almacenadas en Cloudinary.
      </footer>
    </article>
  );
}
