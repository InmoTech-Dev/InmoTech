import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import PropertyVisitModal from "../components/PropertyVisitModal";
import { useAppointments } from "@/shared/contexts/AppointmentContext";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/shared/components/ui/carousel";
import {
  Building2,
  Calendar,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  Heart,
  Home,
  Info,
  Landmark,
  MapPin,
  Share2,
  ShowerHead,
} from "lucide-react";
import { inmueblesAPI } from "@/shared/services/propertyApidervice";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [property, setProperty] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { addExistingAppointment } = useAppointments();
  const { search } = useLocation();
 
  const propertyId = useMemo(() => {
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);

        const { items } = await inmueblesAPI.getPublicInmuebles(1, 100, { _t: Date.now() });
        const match = items.find((p) => {
          if (propertyId !== null) return String(p.id) === String(propertyId);
          return String(p.id) === String(id);
        });

        if (match) {
          if (mounted) setProperty(match);
          return;
        }

        if (propertyId === null) {
          if (mounted) setError("Identificador de inmueble invalido");
          return;
        }

        try {
          const byId = await inmueblesAPI.getInmuebleById(propertyId);
          if (mounted) setProperty(byId);
        } catch (_err) {
          if (mounted) setError("No encontramos la informacion de este inmueble");
        }
      } catch (err) {
        console.error("Error cargando inmueble:", err);
        if (mounted) setError("No se pudo cargar la informacion del inmueble");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProperty();
    return () => {
      mounted = false;
    };
  }, [propertyId, id]);

  const viewModel = useMemo(() => {
    if (!property) return null;

    const normalize = (value) =>
      (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const amenities = Array.isArray(property.comodidades) ? property.comodidades : [];
    const selectedAmenities = amenities.filter((item) => item && (item.seleccionada ?? true));
    const findAmenity = (name) => {
      const target = normalize(name);
      const item = amenities.find((c) => normalize(c.nombre) === target);
      return item?.cantidad ?? "N/D";
    };

    const images =
      Array.isArray(property.imagenes) && property.imagenes.length
        ? property.imagenes
        : ["/images/hero-inmuebles.jpg"];

    const mainImage = images[activeImageIndex] || images[0];
    const locationParts = [property.barrio, property.ciudad, property.departamento, property.pais].filter(Boolean);

    const formatPrice = (value) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return "Consultar";
      const formatted = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        currencyDisplay: "code",
        maximumFractionDigits: 0,
      }).format(n);
      return formatted.replace(/COP\s*\$/i, "COP ").trim();
    };

    const resolveAmenityIcon = (name = "") => {
      const target = normalize(name);
      if (["habitaciones", "cuartos", "dormitorios", "alcobas"].some((item) => target.includes(item))) return Building2;
      if (["banos", "bano", "baños", "baño"].some((item) => target.includes(item))) return ShowerHead;
      if (["parqueaderos", "parqueadero", "garaje", "garajes"].some((item) => target.includes(item))) return Car;
      return Home;
    };

    const summaryAmenities = [
      {
        label: "Area",
        value: property.area_construida ? `${property.area_construida} m2` : "N/D m2",
        Icon: Home,
      },
      ...selectedAmenities.map((item) => ({
        label: item.nombre || "Comodidad",
        value:
          Number.isFinite(Number(item.cantidad)) && Number(item.cantidad) > 0
            ? String(Number(item.cantidad))
            : "Si",
        Icon: resolveAmenityIcon(item.nombre || ""),
      })),
    ].slice(0, 4);

    return {
      id: property.id,
      title: property.titulo,
      location: locationParts.join(", "),
      price: property.precio_venta || property.precio_arriendo ? formatPrice(property.precio) : "Consultar",
      pricePerM2: property.area_construida
        ? `${formatPrice((property.precio || 0) / property.area_construida)} / m2`
        : null,
      area: property.area_construida ? `${property.area_construida} m2` : "N/D",
      bedrooms: findAmenity("habitaciones"),
      bathrooms: findAmenity("banos"),
      parking: findAmenity("parqueaderos"),
      code: property.registro || property.registro_inmobiliario || property.id,
      type: property.categoria || property.tipo || "Inmueble",
      operation: property.operacion || "Sin definir",
      status: property.estado_bool === false ? "No disponible" : "Disponible",
      description: property.descripcion || "Sin descripcion",
      amenities: selectedAmenities,
      summaryAmenities,
      images,
      mainImage,
      owner: property.propietario,
    };
  }, [property, activeImageIndex]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [property?.id]);
 
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("reschedule") === "true") {
      setIsVisitModalOpen(true);
    }
  }, [search]);

  const handleScheduleVisit = (nuevaCita) => {
    addExistingAppointment(nuevaCita);
    setIsVisitModalOpen(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando informacion del inmueble...</p>
      </main>
    );
  }

  if (error || !viewModel) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-red-600 font-semibold">No se pudo cargar el inmueble</p>
          {error && <p className="text-sm text-gray-600">{error}</p>}
          <Button asChild className="mt-2">
            <Link to="/inmuebles">Volver al listado</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center text-sm text-gray-500">
            <Link to="/" className="hover:text-[#00457B]">
              Inicio
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <Link to="/inmuebles" className="hover:text-[#00457B]">
              Inmuebles
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-gray-900 font-medium">{viewModel.title}</span>
          </div>
        </div>
      </div>

      <section className="bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="relative h-[400px] rounded-xl overflow-hidden">
                <img
                  src={viewModel.mainImage || "/placeholder.svg"}
                  alt={viewModel.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white/80 hover:bg-white"
                    onClick={() => setIsFavorite(!isFavorite)}
                  >
                    <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/80 hover:bg-white">
                    <Share2 className="h-5 w-5 text-gray-700" />
                  </Button>
                </div>
                <Badge className="absolute top-4 left-4 bg-[#00457B] text-white">{viewModel.operation}</Badge>
              </div>

              <Carousel className="w-full">
                <CarouselContent>
                  {viewModel.images.map((image, index) => (
                    <CarouselItem key={index} className="basis-1/4 md:basis-1/5">
                      <div
                        className={`relative h-24 rounded-lg overflow-hidden cursor-pointer border ${index === activeImageIndex ? "border-blue-500" : "border-transparent"
                          }`}
                        onClick={() => setActiveImageIndex(index)}
                      >
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`${viewModel.title} - Imagen ${index + 1}`}
                          className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{viewModel.title}</h1>
                    <div className="flex items-center mt-2 text-gray-500">
                      <MapPin className="h-5 w-5 mr-1 text-[#00457B]" />
                      <span>{viewModel.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#00457B]">{viewModel.price}</div>
                    {viewModel.pricePerM2 && <div className="text-sm text-gray-500">{viewModel.pricePerM2}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[#00457B]">{property.priceLabel}</div>
                  {property.operacion && <div className="text-sm text-gray-500">{property.operacion}</div>}
                </div>
              </div>

              <div
                className={`grid gap-4 bg-gray-50 p-4 rounded-xl ${
                  (viewModel.summaryAmenities?.length || 0) <= 2 ? "justify-items-center" : ""
                }`}
                style={{
                  gridTemplateColumns: `repeat(${Math.min(Math.max(viewModel.summaryAmenities?.length || 1, 1), 4)}, minmax(0, 1fr))`,
                }}
              >
                {(viewModel.summaryAmenities || []).map((item, index) => {
                  const Icon = item.Icon || Home;
                  return (
                    <div key={`${item.label}-${index}`} className="flex flex-col items-center text-center p-3">
                      <Icon className="h-6 w-6 text-[#00457B] mb-2" />
                      <span className="text-sm text-gray-500">{item.label}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-[#00457B]/10 flex items-center justify-center mr-3">
                    <Info className="h-5 w-5 text-[#00457B]" />
                  </div>
                  <div>
                    <h3 className="font-medium">Codigo de la propiedad</h3>
                    <p className="text-gray-500">{viewModel.code}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-[#00457B]/10 flex items-center justify-center mr-3">
                    <Landmark className="h-5 w-5 text-[#00457B]" />
                  </div>
                  <div>
                    <h3 className="font-medium">Tipo de propiedad</h3>
                    <p className="text-gray-500">{viewModel.type}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-[#00457B]/10 flex items-center justify-center mr-3">
                    <Clock className="h-5 w-5 text-[#00457B]" />
                  </div>
                  <div>
                    <h3 className="font-medium">Operacion</h3>
                    <p className="text-gray-500">{viewModel.operation}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-[#00457B]/10 flex items-center justify-center mr-3">
                    <CheckCircle className="h-5 w-5 text-[#00457B]" />
                  </div>
                  <div>
                    <h3 className="font-medium">Estado</h3>
                    <p className="text-gray-500">{viewModel.status}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-[#00457B] text-[#00457B] hover:bg-[#00457B]/10"
                  onClick={() => setIsVisitModalOpen(true)}
                >
                  <Calendar className="h-5 w-5 mr-2" /> Agendar visita
                </Button>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="space-y-8">
            <Tabs defaultValue="descripcion" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-white">
                <TabsTrigger value="descripcion" className="rounded-lg">
                  Descripcion
                </TabsTrigger>
                <TabsTrigger value="caracteristicas" className="rounded-lg">
                  Caracteristicas
                </TabsTrigger>
                <TabsTrigger value="ubicacion" className="rounded-lg">
                  Ubicacion
                </TabsTrigger>
              </TabsList>

              <TabsContent value="descripcion" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Descripcion</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {viewModel.description || "Sin descripcion."}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="caracteristicas" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Comodidades</h2>
                    {viewModel.amenities?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {viewModel.amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-gray-700">
                              {amenity.nombre} {amenity.cantidad ? `(${amenity.cantidad})` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">Sin comodidades registradas.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ubicacion" className="mt-6">
                <Card>
                  <CardContent className="p-6 space-y-2 text-gray-700">
                    <h2 className="text-xl font-bold mb-2">Ubicacion</h2>
                    <p><span className="font-medium">Direccion:</span> {property.direccion || "N/D"}</p>
                    <p><span className="font-medium">Barrio:</span> {property.barrio || "N/D"}</p>
                    <p><span className="font-medium">Ciudad:</span> {property.ciudad || "N/D"}</p>
                    <p><span className="font-medium">Departamento:</span> {property.departamento || "N/D"}</p>
                    <p><span className="font-medium">Pais:</span> {property.pais || "N/D"}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <PropertyVisitModal
        isOpen={isVisitModalOpen}
        onClose={() => setIsVisitModalOpen(false)}
        property={viewModel} // ✅ Pasar viewModel en lugar de property raw
        onSubmit={handleScheduleVisit}
      />
    </main>
  );
}

