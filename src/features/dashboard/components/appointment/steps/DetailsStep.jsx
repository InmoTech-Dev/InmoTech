import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Home, FileText, Search, Building2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../../shared/components/ui/select';
import { Input } from '../../../../../shared/components/ui/input';
import propertiesApiService from '../../../../../shared/services/propertiesApiService';

const DetailsStep = ({ formData, errors, updateFormData, onFieldComplete }) => {
  const servicios = [
    'Avalúos',
    'Gestión de Alquileres',
    'Asesoría Legal',
    'Visita a Propiedad'
  ];

  const requiereInmueble = useMemo(() => {
    return String(formData.servicio || '').toLowerCase().includes('visita');
  }, [formData.servicio]);

  const [propertiesCatalog, setPropertiesCatalog] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const carouselViewportRef = useRef(null);
  const carouselItemRefs = useRef([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const scrollRafRef = useRef(null);

  useEffect(() => () => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }
  }, []);

  // Refs para los campos
  const servicioRef = useRef(null);
  const inmueblesRef = useRef(null);
  const notasRef = useRef(null);

  useEffect(() => {
    const loadCatalog = async () => {
      if (!requiereInmueble) return;
      if (propertiesCatalog.length || propertiesLoading) return;

      setPropertiesLoading(true);
      setPropertiesError(null);

      try {
        const catalog = await propertiesApiService.getAll();
        setPropertiesCatalog(catalog);
      } catch (error) {
        console.error('❌ Error cargando catálogo de inmuebles:', error);
        setPropertiesError('No fue posible cargar los inmuebles. Intenta recargar el modal.');
      } finally {
        setPropertiesLoading(false);
      }
    };

    loadCatalog();
  }, [requiereInmueble, propertiesCatalog.length, propertiesLoading]);

  const filteredProperties = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return propertiesCatalog;

    return propertiesCatalog.filter((property) => {
      const label = String(property?.label || '').toLowerCase();
      const registro = String(property?.registro || '').toLowerCase();
      return label.includes(query) || registro.includes(query);
    });
  }, [propertiesCatalog, searchTerm]);

  const handleSelectProperty = (property) => {
    updateFormData('inmueble_label', property?.label || '');
    updateFormData('id_inmueble', property?.id || null);
  };

  const syncCarouselIndex = useCallback(() => {
    const viewport = carouselViewportRef.current;
    if (!viewport) return;

    const center = viewport.scrollLeft + viewport.clientWidth / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    carouselItemRefs.current.forEach((node, index) => {
      if (!node) return;
      const nodeCenter = node.offsetLeft + node.clientWidth / 2;
      const distance = Math.abs(nodeCenter - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    setCarouselIndex(bestIndex);
  }, []);

  const handleCarouselScroll = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      syncCarouselIndex();
    });
  }, [syncCarouselIndex]);

  const scrollToCarouselIndex = useCallback((index) => {
    const clamped = Math.max(0, Math.min(index, filteredProperties.length - 1));
    const node = carouselItemRefs.current[clamped];

    if (node?.scrollIntoView) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    setCarouselIndex(clamped);
  }, [filteredProperties.length]);

  useEffect(() => {
    if (!filteredProperties.length) return;
    carouselItemRefs.current = carouselItemRefs.current.slice(0, filteredProperties.length);
    const selectedIndex = filteredProperties.findIndex((property) => property.id === formData.id_inmueble);
    if (selectedIndex >= 0) {
      scrollToCarouselIndex(selectedIndex);
    }
  }, [filteredProperties, formData.id_inmueble, scrollToCarouselIndex]);

  // Scroll automático al siguiente bloque cuando se selecciona un servicio
  useEffect(() => {
    if (!formData.servicio) return;

    if (requiereInmueble && inmueblesRef.current) {
      inmueblesRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      return;
    }

    if (notasRef.current) {
      notasRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [formData.servicio, requiereInmueble]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Servicio</h3>
        <p className="text-slate-600">Selecciona el servicio y, si aplica, el inmueble</p>
      </div>

      <div className="space-y-6">
        {/* Servicio */}
        <div ref={servicioRef}>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Home className="w-4 h-4 inline mr-2" />
            Servicio *
          </label>
          <Select
            value={formData.servicio}
            onValueChange={(value) => updateFormData('servicio', value)}
          >
            <SelectTrigger
              className={errors.servicio ? 'border-red-500' : ''}
            >
              <SelectValue placeholder="Selecciona un servicio" />
            </SelectTrigger>
            <SelectContent>
              {servicios.map((servicio, index) => (
                <SelectItem key={index} value={servicio}>
                  {servicio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.servicio && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm mt-1"
            >
              {errors.servicio}
            </motion.p>
          )}
        </div>

        {/* Inmueble (solo Visita a Propiedad) */}
        {requiereInmueble && (
          <div ref={inmueblesRef} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              <Building2 className="w-4 h-4 inline mr-2" />
              Inmueble *
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar inmuebles por nombre, registro o ciudad..."
                className={`pl-10 ${errors.id_inmueble ? 'border-red-500' : ''}`}
              />
            </div>

            {propertiesError && (
              <p className="text-red-500 text-sm">{propertiesError}</p>
            )}

            {propertiesLoading ? (
              <div className="flex items-center justify-center py-6 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Cargando inmuebles...</span>
                </div>
              </div>
            ) : filteredProperties.length > 0 ? (
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-white via-white/70 to-white opacity-60" />

                <div className="relative">
                  {/* Flechas */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => scrollToCarouselIndex(carouselIndex - 1)}
                    disabled={carouselIndex <= 0}
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-lg h-10 w-10 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-700" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => scrollToCarouselIndex(carouselIndex + 1)}
                    disabled={carouselIndex >= filteredProperties.length - 1}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-lg h-10 w-10 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-700" />
                  </motion.button>

                  {/* Carrusel */}
                  <div
                    ref={carouselViewportRef}
                    onScroll={handleCarouselScroll}
                    className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-x-auto scroll-smooth snap-x snap-mandatory px-14 py-2"
                  >
                    <div className="flex gap-4 items-stretch">
                      {filteredProperties.map((property, index) => {
                        const isSelected = formData.id_inmueble === property.id;
                        const isActive = index === carouselIndex;
                        const title = property.titulo || property.label || 'Inmueble';
                        const subtitle = property.ciudad || property.departamento || '';
                        const imageSrc = property.imagen || property.imagenes?.[0] || '';

                        return (
                          <motion.button
                            key={property.id}
                            ref={(node) => { carouselItemRefs.current[index] = node; }}
                            type="button"
                            onClick={() => handleSelectProperty(property)}
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            animate={{
                              scale: isActive ? 1.02 : 0.98,
                              opacity: isActive ? 1 : 0.88,
                            }}
                            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                            className={`snap-center flex-none w-[86%] sm:w-[72%] md:w-[58%] lg:w-[48%] rounded-2xl border bg-white/80 backdrop-blur transition-all duration-300 ${
                              isSelected
                                ? 'border-blue-500 ring-2 ring-blue-200 shadow-xl shadow-blue-200/40'
                                : 'border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/40'
                            } will-change-transform`}
                          >
                            <div className="p-4">
                              <div className="relative h-36 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <ImageIcon className="h-5 w-5" />
                                    <span className="text-sm">Sin imagen</span>
                                  </div>
                                </div>
                                {imageSrc && (
                                  <img
                                    src={imageSrc}
                                    alt={title}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                    onError={(event) => {
                                      event.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                                <div className="absolute bottom-3 left-3 right-3 text-left">
                                  <p className="text-white font-semibold leading-tight truncate">{title}</p>
                                  {subtitle && (
                                    <p className="text-white/90 text-xs mt-0.5 truncate">{subtitle}</p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between gap-3">
                                <div className="min-w-0 text-left">
                                  <p className="font-semibold text-slate-800 truncate">{title}</p>
                                  <p className="text-sm text-slate-600 truncate">
                                    {property.registro ? `Registro: ${property.registro}` : 'Registro: —'}
                                  </p>
                                </div>
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border transition-colors ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}>
                                  <ChevronRight className="h-5 w-5" />
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Indicador */}
                  <div className="flex justify-center gap-1.5 mt-2">
                    {filteredProperties.slice(0, 10).map((property, idx) => (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => scrollToCarouselIndex(idx)}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          idx === carouselIndex ? 'bg-blue-600' : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                        aria-label={`Ir al inmueble ${idx + 1}`}
                      />
                    ))}
                    {filteredProperties.length > 10 && (
                      <span className="text-xs text-slate-500 ml-2">+{filteredProperties.length - 10}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
                No se encontraron inmuebles con ese criterio.
              </div>
            )}

            {errors.id_inmueble && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm"
              >
                {errors.id_inmueble}
              </motion.p>
            )}
          </div>
        )}

        {/* Notas */}
        <div ref={notasRef}>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            Notas Adicionales
          </label>
          <textarea
            value={formData.notas}
            onChange={(e) => updateFormData('notas', e.target.value)}
            placeholder="Información adicional sobre la cita, preferencias del cliente, etc."
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
          />
          <p className="text-slate-500 text-sm mt-1">
            Opcional: Agrega cualquier información relevante para la cita
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          <strong>Recordatorio:</strong> Los horarios ocupados se bloquean automáticamente para evitar traslapes.
        </p>
      </div>
    </motion.div>
  );
};

export default DetailsStep;
