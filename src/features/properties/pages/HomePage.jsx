import "react"
import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/shared/components/ui/carousel"
import {
  Building2,
  Key,
  MapPin,
  ChevronRight,
  Users,
  Briefcase,
  Star,
  ArrowRight,
  Home,
  Calendar,
  Award,
  UserCheck,
  Search,
  Mail,
} from "lucide-react"

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const [categoriesVisible, setCategoriesVisible] = useState(false);
  const [servicesVisible, setServicesVisible] = useState(false);
  const [featuredVisible, setFeaturedVisible] = useState(false);
  const [whyChooseUsVisible, setWhyChooseUsVisible] = useState(false);
  const statsRef = useRef(null);
  const categoriesRef = useRef(null);
  const servicesRef = useRef(null);
  const featuredRef = useRef(null);
  const whyChooseUsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCategoriesVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (categoriesRef.current) {
      observer.observe(categoriesRef.current);
    }

    return () => {
      if (categoriesRef.current) {
        observer.unobserve(categoriesRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setServicesVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (servicesRef.current) {
      observer.observe(servicesRef.current);
    }

    return () => {
      if (servicesRef.current) {
        observer.unobserve(servicesRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFeaturedVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (featuredRef.current) {
      observer.observe(featuredRef.current);
    }

    return () => {
      if (featuredRef.current) {
        observer.unobserve(featuredRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setWhyChooseUsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (whyChooseUsRef.current) {
      observer.observe(whyChooseUsRef.current);
    }

    return () => {
      if (whyChooseUsRef.current) {
        observer.unobserve(whyChooseUsRef.current);
      }
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-transparent">
      {/* Hero Section - Enhanced with new image and overlay */}
      <section className="relative h-[970px] overflow-hidden">
        <img
          src="/images/imagen-hero.png"
          alt="Matriz Inmobiliaria - Tu hogar ideal"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 to-transparent flex flex-col items-start justify-center px-8 md:px-16 lg:px-24" style={{ marginTop: '-320px' }}>
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white drop-shadow-lg animate-slide-in-left">
              ENCUENTRA TU <span className="text-[#00AEFF]">HOGAR IDEAL</span>
            </h1>
            <p className="text-lg md:text-xl max-w-xl mb-10 text-white/90 drop-shadow animate-slide-in-left animation-delay-200">
              Más de 15 años de experiencia ayudando a familias a encontrar el lugar perfecto para crear recuerdos
              inolvidables.
            </p>

            {/* Botones rediseñados */}
            <div className="flex flex-col sm:flex-row gap-6 animate-slide-in-left animation-delay-400">
              <Button
                asChild
                size="lg"
                className="text-white bg-[#00457B] hover:bg-[#003b69] min-w-[200px] h-14 text-lg font-medium shadow-xl rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <Link to="/inmuebles" className="flex items-center justify-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar Inmuebles
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-white border-white hover:bg-white/20 min-w-[200px] h-14 text-lg font-medium shadow-xl rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{ backgroundColor: '#4E4E4E' }}
              >
                <Link to="/servicios" className="flex items-center justify-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Nuestros Servicios
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Completamente rediseñada */}
      <section ref={statsRef} className="relative z-10 mb-12 mt-[-60px]">
        <div className="container mx-auto px-4">
          <div className="rounded-xl shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-0">
              <div className={`stat-card bg-gradient-to-br from-[#00457B] to-[#005da3] text-white p-8 flex items-center space-x-6 transform transition-all duration-1000 hover:scale-105 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '0s' }}>
                <div className="bg-white/20 p-4 rounded-full flex-shrink-0">
                  <Calendar className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-4xl font-bold mb-1 leading-none">4+</div>
                  <div className="text-sm font-medium text-blue-100 leading-tight">Años de experiencia</div>
                </div>
              </div>

              <div className={`stat-card bg-gradient-to-br from-[#005da3] to-[#0075cc] text-white p-8 flex items-center space-x-6 transform transition-all duration-1000 hover:scale-105 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '0.2s' }}>
                <div className="bg-white/20 p-4 rounded-full flex-shrink-0">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-4xl font-bold mb-1 leading-none">100%</div>
                  <div className="text-sm font-medium text-blue-100 leading-tight">Compromiso legal garantizado</div>
                </div>
              </div>

              <div className={`stat-card bg-gradient-to-br from-[#0075cc] to-[#008df5] text-white p-8 flex items-center space-x-6 transform transition-all duration-1000 hover:scale-105 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '0.4s' }}>
                <div className="bg-white/20 p-4 rounded-full flex-shrink-0">
                  <UserCheck className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-xl font-bold mb-1 leading-none">Compromiso</div>
                  <div className="text-sm font-medium text-blue-100 leading-tight">Con cada cliente</div>
                </div>
              </div>

              <div className={`stat-card bg-gradient-to-br from-[#008df5] to-[#00a5ff] text-white p-8 flex items-center space-x-6 transform transition-all duration-1000 hover:scale-105 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transitionDelay: '0.6s' }}>
                <div className="bg-white/20 p-4 rounded-full flex-shrink-0">
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-xl font-bold mb-1 leading-none">3 Servicios</div>
                  <div className="text-sm font-medium text-blue-100 leading-tight">Esenciales para tu patrimonio</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section ref={categoriesRef} className={`py-16 transition-all duration-1000 ${categoriesVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#00457B] mb-4 relative inline-block">
              Explora por Categoría
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-[#00457B]"></span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mt-6">
              Encuentra el inmueble perfecto según tus necesidades específicas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category, index) => (
              <Link to={category.link} key={index}>
                <div className={`group relative h-80 rounded-xl overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl transform ${categoriesVisible ? 'translate-x-0 opacity-100 scale-100' : '-translate-x-16 opacity-0 scale-95'}`} style={{ transitionDelay: `${index * 0.2}s` }}>
                  <img
                    src={category.image || "/placeholder.svg"}
                    alt={category.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6">
                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg transform transition-transform group-hover:translate-y-0 translate-y-4">
                      <h3 className="text-2xl font-bold text-white mb-2">{category.title}</h3>
                      <p className="text-white/90 text-sm mb-3">{category.count} propiedades</p>
                      <div className="flex items-center text-white text-sm font-medium">
                        <span>Ver propiedades</span>
                        <ArrowRight className="h-4 w-4 ml-2 transition-transform duration-300 group-hover:translate-x-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section ref={servicesRef} className="py-20 bg-gray-50 transition-all duration-1000 ease-in-out transform" style={{opacity: servicesVisible ? 1 : 0, scale: servicesVisible ? 1 : 0.95}}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#00457B] mb-4 relative inline-block">
              Nuestros Servicios
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-[#00457B]"></span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mt-6">
              Ofrecemos una amplia gama de servicios inmobiliarios para satisfacer todas tus necesidades.
            </p>
          </div>

          <Carousel className="w-full max-w-6xl mx-auto" visibleCount={3}>
          <CarouselContent>
            {services.map((service, index) => (
              <CarouselItem key={index} index={index} className={`md:basis-1/2 lg:basis-1/3 p-3 transform transition-all duration-1000 ${servicesVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`} style={{ transitionDelay: `${index * 0.2}s` }}>
                <Card className="h-full border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group hover:scale-105">
                  <CardHeader className="pb-2 pt-6">
                    <div className="w-16 h-16 rounded-full bg-[#00457B]/10 flex items-center justify-center mb-4 group-hover:bg-[#00457B]/20 transition-all duration-300">
                      {service.icon}
                    </div>
                    <CardTitle className="text-2xl text-[#00457B]">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{service.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Link
                      to="/servicios"
                      className="text-[#00457B] font-medium flex items-center hover:underline group-hover:font-bold transition-all duration-300"
                    >
                      Saber más <ChevronRight className="h-4 w-4 ml-1 group-hover:ml-2 transition-all duration-300" />
                    </Link>
                  </CardFooter>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
            <CarouselPrevious className="left-0 -translate-x-1/2" />
            <CarouselNext className="right-0 translate-x-1/2" />
          </Carousel>
        </div>
      </section>

      {/* Featured Properties */}
      <section ref={featuredRef} className={`py-20 transition-all duration-1000 ${featuredVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-16">
            <div>
              <h2 className="text-3xl font-bold text-[#00457B] mb-4 relative inline-block">
                INMUEBLES DESTACADOS
                <span className="absolute -bottom-2 left-0 w-20 h-1 bg-[#00457B]"></span>
              </h2>
              <p className="text-gray-600 max-w-2xl mt-6">
                Descubre nuestras propiedades más exclusivas seleccionadas especialmente para ti.
              </p>
            </div>
            <div className="mt-6 md:mt-0">
              <Button
                asChild
                variant="outline"
                className="border-[#00457B] text-[#00457B] hover:bg-[#00457B] hover:text-white rounded-full px-6"
              >
                <Link to="/inmuebles" className="flex items-center gap-2">
                  <span>Ver todos los inmuebles</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {properties.map((property, index) => (
              <Card
                key={index}
                className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 group rounded-xl"
              >
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={property.image || "/placeholder.svg?height=256&width=384"}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <Badge className="absolute top-4 right-4 bg-[#00457B] px-3 py-1 text-sm font-medium text-white z-10">
                    {property.status}
                  </Badge>
                  {property.featured && (
                    <Badge className="absolute top-4 left-4 bg-amber-500 px-3 py-1 text-sm font-medium text-white z-10">
                      Destacado
                    </Badge>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent h-20 transition-transform duration-500 group-hover:scale-105"></div>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl group-hover:text-[#00457B] transition-colors duration-300">
                      {property.title}
                    </CardTitle>
                    <p className="text-xl font-bold text-[#00457B] bg-blue-50 px-3 py-1 rounded-full">
                      {property.price}
                    </p>
                  </div>
                  <div className="flex items-center text-gray-500 text-sm mt-1">
                    <MapPin className="h-4 w-4 mr-1 text-[#00457B]" /> {property.location}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Home className="h-4 w-4 mr-1 text-[#00457B]" /> {property.area}
                    </div>
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-1 text-[#00457B]" /> {property.bedrooms} Hab.
                    </div>
                    <div className="flex items-center">
                      <Key className="h-4 w-4 mr-1 text-[#00457B]" /> {property.bathrooms} Baños
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    className="w-full bg-[#00457B] hover:bg-[#003b69] rounded-full group-hover:shadow-lg transition-all duration-300"
                  >
                    <Link to={`/inmuebles/${property.id}`} className="flex items-center justify-center text-white gap-2">
                      Ver detalles
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section ref={whyChooseUsRef} className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className={`relative h-[500px] rounded-xl overflow-hidden shadow-2xl order-2 md:order-1 transform transition-all duration-1000 ${whyChooseUsVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95'}`} style={{ transitionDelay: '1s' }}>
              <img src="/images/porque-elegirnos.jpg" alt="Por qué elegirnos" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#00457B]/80 to-transparent flex items-end">
                <div className="p-8 text-white">
                  <h3 className="text-2xl font-bold mb-2">Matriz Inmobiliaria</h3>
                  <p>Tu socio de confianza en el mercado inmobiliario desde 2008</p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className={`text-3xl font-bold text-[#00457B] mb-6 relative inline-block transform transition-all duration-1000 ${whyChooseUsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`} style={{ transitionDelay: '0s' }}>
                ¿Por qué elegirnos?
                <span className="absolute -bottom-2 left-0 w-20 h-1 bg-[#00457B]"></span>
              </h2>
              <p className={`text-gray-600 mb-10 mt-6 text-lg transform transition-all duration-1000 ${whyChooseUsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`} style={{ transitionDelay: '0.2s' }}>
                En Matriz Inmobiliaria nos destacamos por ofrecer un servicio personalizado y de calidad, respaldado por
                años de experiencia en el mercado inmobiliario.
              </p>

              <div className="space-y-8">
                {whyChooseUs.map((item, index) => (
                  <div
                    key={index}
                    className={`flex bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${whyChooseUsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                    style={{ transitionDelay: `${1.5 + index * 0.3}s` }}
                  >
                    <div className="w-16 h-16 rounded-full bg-[#00457B]/10 flex items-center justify-center mr-5 flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-[#00457B]">{item.title}</h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                asChild
                className={`mt-10 bg-[#00457B] hover:bg-[#003b69] rounded-full px-8 py-6 h-auto text-lg font-medium shadow-lg transform transition-all duration-1000 ${whyChooseUsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{ transitionDelay: '2.5s' }}
              >
                <Link to="/nosotros" className="flex items-center text-white gap-2">
                  Conoce más sobre nosotros
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

// Data
const categories = [
  {
    title: "Casas",
    count: 124,
    image: "/images/category/categoria-casas.jpg",
    link: "/inmuebles?tipo=casa",
  },
  {
    title: "Apartamentos",
    count: 87,
    image: "/images/category/categoria-apartamentos.jpg",
    link: "/inmuebles?tipo=apartamento",
  },
  {
    title: "Apartaestudio",
    count: 53,
    image: "/images/category/categoria-apartaestudio.jpg",
    link: "/inmuebles?tipo=oficina",
  },
  {
    title: "Terrenos",
    count: 32,
    image: "/images/category/categoria-terrenos.jpg",
    link: "/inmuebles?tipo=terreno",
  },
  {
    title: "Locales comerciales",
    count: 87,
    image: "/images/category/categoria-locales-comerciales.jpg",
    link: "/inmuebles?tipo=apartamento",
  },
  {
    title: "Fincas",
    count: 53,
    image: "/images/category/categoria-fincas.jpg",
    link: "/inmuebles?tipo=oficina",
  },
]

const services = [

  {
    title: "Alquiler",
    description:
      "Gestión integral de alquileres, desde la búsqueda de inquilinos hasta la administración de la propiedad.",
    icon: <Key className="h-7 w-7 text-[#00457B]" />,
  },
  {
    title: "Asesoría Legal",
    description: "Asesoramiento legal en todas las etapas de la transacción inmobiliaria para tu tranquilidad.",
    icon: <Briefcase className="h-7 w-7 text-[#00457B]" />,
  },
  {
    title: "Avaluos",
    description: "Valoración profesional de inmuebles para conocer el precio real de mercado de tu propiedad.",
    icon: <Home className="h-7 w-7 text-[#00457B]" />,
  },
]

const properties = [
  {
    id: 1,
    title: "Casa Moderna en El Poblado",
    price: "$850,000",
    location: "El Poblado, Medellín",
    area: "280 m²",
    bedrooms: 4,
    bathrooms: 3,
    image: "/images/property/propiedad-1.jpg",
    status: "Venta",
    featured: true,
  },
  {
    id: 2,
    title: "Apartamento de Lujo",
    price: "$450,000",
    location: "Laureles, Medellín",
    area: "150 m²",
    bedrooms: 3,
    bathrooms: 2,
    image: "/images/property/propiedad-2.jpg",
    status: "Venta",
    featured: false,
  },
  {
    id: 3,
    title: "Penthouse con Vista Panorámica",
    price: "$1,200,000",
    location: "Envigado, Antioquia",
    area: "320 m²",
    bedrooms: 4,
    bathrooms: 4,
    image: "/images/property/propiedad-3.jpg",
    status: "Venta",
    featured: true,
  },
  {
    id: 4,
    title: "Casa Campestre",
    price: "$750,000",
    location: "Llanogrande, Rionegro",
    area: "450 m²",
    bedrooms: 5,
    bathrooms: 4,
    image: "/images/property/propiedad-4.jpg",
    status: "Venta",
    featured: false,
  },
  {
    id: 5,
    title: "Apartamento Amoblado",
    price: "$2,500/mes",
    location: "Belén, Medellín",
    area: "95 m²",
    bedrooms: 2,
    bathrooms: 2,
    image: "/images/property/propiedad-5.jpg",
    status: "Alquiler",
    featured: true,
  },
  {
    id: 6,
    title: "Local Comercial",
    price: "$350,000",
    location: "Centro, Medellín",
    area: "120 m²",
    bedrooms: 0,
    bathrooms: 1,
    image: "/images/property/propiedad-6.jpg",
    status: "Venta",
    featured: false,
  },
]

const whyChooseUs = [
  {
    title: "Experiencia y Profesionalismo",
    description: "Más de 15 años en el mercado inmobiliario con un equipo de profesionales altamente calificados.",
    icon: <Award className="h-7 w-7 text-[#00457B]" />,
  },
  {
    title: "Servicio Personalizado",
    description: "Atención individualizada adaptada a tus necesidades específicas y preferencias.",
    icon: <Star className="h-7 w-7 text-[#00457B]" />,
  },
  {
    title: "Amplia Cartera de Propiedades",
    description: "Acceso a cientos de propiedades exclusivas que se ajustan a todos los presupuestos y requisitos.",
    icon: <Building2 className="h-7 w-7 text-[#00457B]" />,
  },
]

const testimonials = [
  {
    name: "Carlos Rodríguez",
    role: "Comprador",
    avatar: "/avatar-1.jpg",
    text: "El equipo de Matriz Inmobiliaria hizo que el proceso de compra de mi primera casa fuera increíblemente sencillo. Su profesionalismo y dedicación son incomparables.",
    rating: 5,
  },
  {
    name: "María González",
    role: "Vendedora",
    avatar: "/avatar-2.jpg",
    text: "Vendí mi propiedad en tiempo récord gracias a la estrategia de marketing que implementaron. Superaron todas mis expectativas.",
    rating: 5,
  },
  {
    name: "Juan Pérez",
    role: "Inversionista",
    avatar: "/avatar-3.jpg",
    text: "He trabajado con muchas inmobiliarias, pero ninguna como Matriz. Su conocimiento del mercado y su capacidad para encontrar oportunidades de inversión es excepcional.",
    rating: 4,
  },
]
