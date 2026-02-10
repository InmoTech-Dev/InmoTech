import { useState, useCallback, useEffect } from 'react';

/**
 * Hook personalizado para persistencia temporal de datos de formularios
 * Guarda automáticamente datos en sessionStorage con expiración configurable
 *
 * @param {string} key - Clave única para almacenar los datos
 * @param {object} defaultValue - Valores por defecto
 * @param {number} expiryMinutes - Minutos antes de expirar (default: 15)
 * @returns {[object, function, function, boolean, boolean, number]} [data, saveData, cleanup, isDataLoaded, hasStoredData, timeLeft]
 */
export const useTemporaryFormStorage = (key, defaultValue, expiryMinutes = 15) => {
  const [data, setData] = useState(defaultValue);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [hasStoredData, setHasStoredData] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [intervalId, setIntervalId] = useState(null);

  // Cargar datos al inicializar
  useEffect(() => {
    if (!key) return;

    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const parsedData = JSON.parse(stored);
        if (parsedData.timestamp && parsedData.formData) {
          const elapsed = Date.now() - parsedData.timestamp;
          const maxAge = expiryMinutes * 60 * 1000;

          if (elapsed < maxAge) {
            // Cargar datos válidos
            setData(parsedData.formData);
            setHasStoredData(true);

            // Calcular tiempo restante
            const remainingTime = maxAge - elapsed;
            setTimeLeft(Math.max(0, Math.floor(remainingTime / 1000))); // en segundos

            // Iniciar countdown
            const countdownInterval = setInterval(() => {
              setTimeLeft(current => {
                const newTime = current - 1;
                if (newTime <= 0) {
                  clearInterval(countdownInterval);
                  cleanup();
                  return 0;
                }
                return newTime;
              });
            }, 1000);

            setIntervalId(countdownInterval);
          } else {
            // Limpiar datos expirados
            cleanup();
          }
        }
      }
    } catch (error) {
      console.warn('Error loading temporary form data:', error);
      cleanup();
    }
    setIsDataLoaded(true);
  }, [key, expiryMinutes]);

  const saveData = useCallback((newData) => {
    setData(newData);
    setHasStoredData(true);

    if (Object.values(newData).some(value => value && value.toString().trim())) {
      const tempData = {
        formData: newData,
        timestamp: Date.now()
      };
      sessionStorage.setItem(key, JSON.stringify(tempData));

      // Resetear tiempo si hay actividad
      setTimeLeft(expiryMinutes * 60); // convertir a segundos
    }
  }, [key, expiryMinutes]);

  const cleanup = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    sessionStorage.removeItem(key);
    setHasStoredData(false);
    setTimeLeft(0);
  }, [key, intervalId]);

  // Limpiar al salir del componente
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return [data, saveData, cleanup, isDataLoaded, hasStoredData, timeLeft];
};

/**
 * Formato de tiempo para mostrar al usuario
 * @param {number} seconds - Segundos restantes
 * @returns {string} Tiempo formateado (MM:SS o 'Expirado')
 */
export const formatTimeLeft = (seconds) => {
  if (seconds <= 0) return 'Expirado';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
