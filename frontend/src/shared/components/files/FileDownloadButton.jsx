import React, { useState } from 'react';
import { DownloadIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';
import { downloadFile } from '@/shared/utils/downloadFile';

export default function FileDownloadButton({
  url,
  fileName,
  label = 'Descargar',
  className,
  buttonClassName,
  variant = 'outline',
  size = 'sm',
  onDownloaded,
  onError,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDownload = async () => {
    if (!url || isDownloading) return;

    setIsDownloading(true);
    setErrorMessage('');

    try {
      const result = await downloadFile(url, fileName);
      onDownloaded?.(result);
    } catch (error) {
      const nextMessage = error?.message || 'No fue posible descargar el archivo.';
      setErrorMessage(nextMessage);
      onError?.(error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={buttonClassName}
        onClick={handleDownload}
        disabled={!url || isDownloading}
      >
        {isDownloading ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          <DownloadIcon className="h-4 w-4" />
        )}
        {isDownloading ? 'Descargando...' : label}
      </Button>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
