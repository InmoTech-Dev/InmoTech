import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Building2, Home, Key, MapPin, Search, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { inmueblesAPI } from "@/shared/services/propertyApidervice";

export default function PropertiesPage() {
  const [activeTab, setActiveTab] = useState("venta");
  const [filters, setFilters] = useState({
    type: "Todos los tipos",
    location: "Todas las ubicaciones",
    maxPrice: "Sin límite",
  });
  const [propertiesVisible, setPropertiesVisible] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const propertiesRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPropertiesVisible(true);
        }
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    if (propertiesRef.current) {
      observer.observe(propertiesRef.current);
    }

    return () => {
      if (propertiesRef.current) {
        observer.unobserve(propertiesRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const allItems = [];
        let page = 1;
        const limit = 100;
        const maxPages = 30;

        while (page <= maxPages) {
          const { items, pagination } = await inmueblesAPI.getPublicInmuebles(page, limit, { _t: Date.now() });
          allItems.push(...(items || []));

          const totalPages = pagination?.paginas_totales || pagination?.totalPages || 1;
          if (page >= totalPages) break;
          page += 1;
        }

        setProperties(allItems);
        setError(null);
      } catch (err) {
        console.error("Error cargando inmuebles:", err);
        setError(err.message || "No se pudo cargar la lista de inmuebles");
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatPrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "Consultar";
    const formatted = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(n);
    // Deja el código de moneda y quita el símbolo
    return formatted.replace(/COP\\s*\\$/i, "COP ").trim();
  };

  const normalizeOperation = (operacion = "") => {
    const op = (operacion || "").toLowerCase();
    const hasVenta = op.includes("venta");
    const hasArriendo = op.includes("arriendo") || op.includes("alquiler");

    if (hasVenta && hasArriendo) {
      return { label: "Venta y Arriendo", isVenta: true, isAlquiler: true };
    }

    if (hasVenta) {
      return { label: "Venta", isVenta: true, isAlquiler: false };
    }

    if (hasArriendo) {
      return { label: "Alquiler", isVenta: false, isAlquiler: true };
    }

    // Si no hay operacion definida, mostramos el inmueble en ambos tabs para no ocultarlo
    return { label: operacion || "Disponible", isVenta: true, isAlquiler: true };
  };

  const findAmenityAmount = (property, targets = []) => {
    const normalize = (text = "") =>
      text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();

    const targetSet = targets.map(normalize);
    const match = property.comodidades?.find?.((c) => targetSet.includes(normalize(c.nombre || "")));
    return match?.cantidad ?? "N/D";
  };

  const normalizedProperties = properties.map((property) => {
    const operation = normalizeOperation(property.operacion);

    return {
      id: property.id,
      type: (property.tipo || property.categoria || "Otro").toLowerCase(),
      title: property.titulo,
      price: formatPrice(property.precio || property.precio_venta || property.precio_arriendo),
      location: [property.ciudad, property.departamento].filter(Boolean).join(", "),
      area: property.area_construida ? `${property.area_construida} m2` : "N/D",
      bedrooms: findAmenityAmount(property, ["habitaciones", "cuartos", "dormitorios"]),
      bathrooms: findAmenityAmount(property, ["banos", "baños", "bano", "baño"]),
      image:
        Array.isArray(property.imagenes) && property.imagenes.length
          ? property.imagenes[0]
          : "/images/hero-inmuebles.jpg",
      status: operation.label,
      isVenta: operation.isVenta,
      isAlquiler: operation.isAlquiler,
    };
  });

  // Filtrar propiedades según el tab activo y filtros
  const filteredProperties = normalizedProperties.filter((property) => {
    const matchesTab = activeTab === "venta" ? property.isVenta : property.isAlquiler;

    const matchesType =
      filters.type === "Todos los tipos" || property.type?.toLowerCase() === filters.type.toLowerCase();
    const matchesLocation =
      filters.location === "Todas las ubicaciones" ||
      property.location.toLowerCase().includes(filters.location.toLowerCase());

    return matchesTab && matchesType && matchesLocation;
  });
  const propertiesToShow = filteredProperties;

  return (
    <main className="flex min-h-screen flex-col">
      <section className="relative h-[400px]">
        <img src="/images/hero-inmuebles.jpg" alt="Inmuebles" className="w-full h-full object-cover brightness-[0.65]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 animate-fade-in-up animate-pulse">
            Nuestros Inmuebles
          </h1>
          <p className="text-lg max-w-2xl animate-fade-in-up animation-delay-300">
            Encuentra la propiedad perfecta para ti entre nuestra amplia selección de inmuebles.
          </p>
        </div>
      </section>

      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <Tabs defaultValue="venta" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="relative grid w-full grid-cols-2 mb-6 bg-[#F4F4F5] rounded-md select-none">
                <div
                  className={`absolute top-1 left-1 h-[32px] bg-white rounded-md shadow transition-transform duration-300 ease-in-out`}
                  style={{
                    width: "calc(50% - 12px)",
                    transform: activeTab === "venta" ? "translateX(0%)" : "translateX(calc(100% + 14px))",
                  }}
                />
                <TabsTrigger
                  value="venta"
                  className={`relative z-10 py-2 text-center text-sm font-medium cursor-pointer ${
                    activeTab === "venta" ? "text-black" : "text-gray-500"
                  }`}
                >
                  Venta
                </TabsTrigger>
                <TabsTrigger
                  value="alquiler"
                  className={`relative z-10 py-2 text-center text-sm font-medium cursor-pointer ${
                    activeTab === "alquiler" ? "text-black" : "text-gray-500"
                  }`}
                >
                  Alquiler
                </TabsTrigger>
              </TabsList>
              <TabsContent value="venta" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tipo de propiedad</label>
                    <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Todos los tipos">Todos los tipos</SelectItem>
                        <SelectItem value="Casa">Casa</SelectItem>
                        <SelectItem value="Apartamento">Apartamento</SelectItem>
                        <SelectItem value="Oficina">Oficina</SelectItem>
                        <SelectItem value="Local">Local</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Ubicación</label>
                    <Select value={filters.location} onValueChange={(value) => setFilters({ ...filters, location: value })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todas las ubicaciones" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Todas las ubicaciones">Todas las ubicaciones</SelectItem>
                        <SelectItem value="El Poblado">El Poblado</SelectItem>
                        <SelectItem value="Laureles">Laureles</SelectItem>
                        <SelectItem value="Envigado">Envigado</SelectItem>
                        <SelectItem value="Belén">Belén</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Precio máximo</label>
                    <Select value={filters.maxPrice} onValueChange={(value) => setFilters({ ...filters, maxPrice: value })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Sin límite" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Sin límite">Sin límite</SelectItem>
                        <SelectItem value="200000">$200,000</SelectItem>
                        <SelectItem value="500000">$500,000</SelectItem>
                        <SelectItem value="1000000">$1,000,000</SelectItem>
                        <SelectItem value="2000000">$2,000,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full bg-[#0c4a7b] hover:bg-[#0a3d68] text-white">
                      <Search className="h-4 w-4 mr-2" /> Buscar
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="text-[#0c4a7b]">
                    <Filter className="h-4 w-4 mr-2" /> Filtros avanzados
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="alquiler" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tipo de propiedad</label>
                    <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent className="bg-white transition-all duration-300 animate-in fade-in-0 slide-in-from-top-2">
                        <SelectItem value="Todos los tipos">Todos los tipos</SelectItem>
                        <SelectItem value="Casa">Casa</SelectItem>
                        <SelectItem value="Apartamento">Apartamento</SelectItem>
                        <SelectItem value="Oficina">Oficina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Ubicación</label>
                    <Select value={filters.location} onValueChange={(value) => setFilters({ ...filters, location: value })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todas las ubicaciones" />
                      </SelectTrigger>
                      <SelectContent className="bg-white transition-all duration-300 animate-in fade-in-0 slide-in-from-top-2">
                        <SelectItem value="Todas las ubicaciones">Todas las ubicaciones</SelectItem>
                        <SelectItem value="El Poblado">El Poblado</SelectItem>
                        <SelectItem value="Laureles">Laureles</SelectItem>
                        <SelectItem value="Envigado">Envigado</SelectItem>
                        <SelectItem value="Belén">Belén</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Precio máximo mensual</label>
                    <Select value={filters.maxPrice} onValueChange={(value) => setFilters({ ...filters, maxPrice: value })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Sin límite" />
                      </SelectTrigger>
                      <SelectContent className="bg-white transition-all duration-300 animate-in fade-in-0 slide-in-from-top-2">
                        <SelectItem value="Sin límite">Sin límite</SelectItem>
                        <SelectItem value="1000">$1,000</SelectItem>
                        <SelectItem value="2000">$2,000</SelectItem>
                        <SelectItem value="3000">$3,000</SelectItem>
                        <SelectItem value="5000">$5,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full bg-[#0c4a7b] hover:bg-[#0a3d68] text-white">
                      <Search className="h-4 w-4 mr-2" /> Buscar
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="text-[#0c4a7b]">
                    <Filter className="h-4 w-4 mr-2" /> Filtros avanzados
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <section className="py-16" ref={propertiesRef}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-[#0c4a7b]">
              Propiedades Disponibles ({propertiesToShow.length})
            </h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Ordenar por:</span>
              <Select defaultValue="recent">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Más recientes" />
                </SelectTrigger>
                <SelectContent className="bg-white transition-all duration-300 animate-in fade-in-0 slide-in-from-top-2">
                  <SelectItem value="recent">Más recientes</SelectItem>
                  <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                  <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
                  <SelectItem value="area-asc">Área: menor a mayor</SelectItem>
                  <SelectItem value="area-desc">Área: mayor a menor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && <p className="text-center text-gray-500">Cargando inmuebles...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          {!loading && properties.length === 0 && (
            <p className="text-center text-gray-500">No hay inmuebles disponibles con los filtros seleccionados.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <p className="text-gray-500">Cargando inmuebles...</p>
            ) : propertiesToShow.length === 0 ? (
              <p className="text-gray-500">No hay inmuebles disponibles.</p>
            ) : (
              propertiesToShow.map((property, index) => (
                <Card
                  key={index}
                  className={`overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-600 ease-out ${
                    propertiesVisible ? "animate-fade-in-up" : ""
                  }`}
                  style={
                    propertiesVisible
                      ? {
                          animationDelay: `${index * 100}ms`,
                          animationFillMode: "both",
                          animationTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                        }
                      : {}
                  }
                >
                  <div className="relative h-64">
                    <img src={property.image || "/placeholder.svg"} alt={property.title} className="w-full h-full object-cover" />
                    <Badge className="absolute top-4 right-4 bg-[#0c4a7b]">{property.status}</Badge>
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{property.title}</CardTitle>
                      <p className="text-xl font-bold text-[#0c4a7b]">{property.price}</p>
                    </div>
                    <div className="flex items-center text-gray-500 text-sm">
                      <MapPin className="h-4 w-4 mr-1" /> {property.location}
                    </div>
                  </CardHeader>
                    <CardContent>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center">
                        <Home className="h-4 w-4 mr-1" /> {property.area}
                      </div>
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-1" /> {property.bedrooms} Hab.
                      </div>
                      <div className="flex items-center">
                        <Key className="h-4 w-4 mr-1" /> {property.bathrooms} Baños
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full bg-[#0c4a7b] hover:bg-[#0a3d68] text-white">
                      <Link to={`/inmuebles/${property.id}`}>Ver detalles</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
