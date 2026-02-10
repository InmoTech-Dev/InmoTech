import React, { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion"
import {
  Home,
  Key,
  Building2,
  TrendingUp,
  CheckCircle,
  Star,
  Users,
  Calculator,
  Shield,
  Handshake,
  Clock,
  Award,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"

export default function ServicesPage() {
  const [isWorkVisible, setIsWorkVisible] = useState(false)
  const [isFAQVisible, setIsFAQVisible] = useState(false)
  const workRef = useRef(null)
  const faqRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        console.log('Entry:', entry.isIntersecting, entry.intersectionRatio)
        if (entry.isIntersecting) {
          console.log('Setting work visible to true')
          setIsWorkVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
      }
    )
    if (workRef.current) {
      observer.observe(workRef.current)
    }
    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        console.log('FAQ Entry:', entry.isIntersecting, entry.intersectionRatio)
        if (entry.isIntersecting) {
          console.log('Setting FAQ visible to true')
          setIsFAQVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
      }
    )
    if (faqRef.current) {
      observer.observe(faqRef.current)
    }
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative h-[500px] overflow-hidden flex items-center justify-center">
        <img src="/images/hero-servicios.jpg" alt="Servicios" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-w-4xl text-center px-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-white animate-bounce-in" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
            Nuestros Servicios
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white animate-slide-in-left animation-delay-400" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
            Soluciones inmobiliarias integrales para todas tus necesidades
          </p>
        </div>
      </section>

      {/* Services Cards Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#00457B] mb-6 animate-slide-up-fade">Servicios Inmobiliarios Especializados</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-slide-in-right animation-delay-600">
              Ofrecemos una amplia gama de servicios diseñados para satisfacer todas tus necesidades en el mercado
              inmobiliario con la más alta calidad y profesionalismo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {mainServices.map((service, index) => (
              <Card
                key={index}
                className={`group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50 animate-fade-in-scale ${index === 0 ? '' : index === 1 ? 'animation-delay-800' : 'animation-delay-1200'}`}
              >
                <CardHeader className="pb-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00457B] to-[#1e40af] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      {service.icon}
                    </div>
                    <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-400 to-red-500 text-white">
                      {service.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl text-[#00457B] mb-3 group-hover:text-[#1e40af] transition-colors">
                    {service.title}
                  </CardTitle>
                  <p className="text-gray-600 text-lg leading-relaxed">{service.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-6">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {service.duration}
                    </div>
                    <Button
                      asChild
                      className="bg-gradient-to-r from-[#00457B] to-[#1e40af] hover:from-[#0a3d68] hover:to-[#1e3a8a] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Link to="/contacto">Solicitar</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section ref={workRef} className="py-20 bg-gradient-to-r from-[#00457B] to-[#1e40af] text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 ${isWorkVisible ? "animate-slide-up-fade" : ""}`}>¿Cómo Trabajamos?</h2>
            <p className={`text-xl text-blue-100 max-w-3xl mx-auto ${isWorkVisible ? "animate-slide-up-fade animation-delay-400" : ""}`}>
              Nuestro proceso está diseñado para brindarte una experiencia inmobiliaria sin complicaciones, con
              resultados garantizados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {workProcess.map((step, index) => (
              <div
                key={index}
                className={`text-center relative ${isWorkVisible ? "animate-fade-in-scale" : ""}`}
                style={isWorkVisible ? { animationDelay: `${200 + index * 400}ms` } : {}}
              >
                {index < workProcess.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-blue-300/30 transform translate-x-4 animate-fade-in-slide-left" style={{ animationDelay: `${(index + 1) * 0.4}s` }} />
                )}
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full bg-white text-[#00457B] flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg ${isWorkVisible ? "animate-pulse-glow" : ""}`}>
                    {index + 1}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-blue-100 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section ref={faqRef} className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold text-[#00457B] mb-6 ${isFAQVisible ? "animate-slide-up-fade" : ""}`}>Preguntas Frecuentes</h2>
            <p className={`text-xl text-gray-600 max-w-3xl mx-auto ${isFAQVisible ? "animate-slide-in-right animation-delay-400" : ""}`}>
              Respuestas a las preguntas más comunes sobre nuestros servicios inmobiliarios.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className={`border border-gray-200 rounded-2xl px-6 bg-white shadow-sm hover:shadow-md transition-all duration-300 ${isFAQVisible ? "animate-fade-in-scale" : ""}`}
                  style={isFAQVisible ? { animationDelay: `${200 + index * 200}ms` } : {}}
                >
                  <AccordionTrigger className="text-left font-semibold text-[#00457B] hover:text-[#1e40af] py-6 transition-colors duration-300">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pb-6 leading-relaxed transition-all duration-300 ease-in-out">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </main>
  )
}

// Data
const mainServices = [
  {
    title: "Avalúos Certificados ",
    description:
      "Valoraciones precisas de propiedades con rigor técnico y validez legal para diversas finalidades ",
    icon: <Home className="h-8 w-8 text-white" />,
    badge: "Popular",
    duration: "2-3 meses",
    features: [
      "Tasaciones para alquiler y arrendamiento",
      "Valuaciónes para seguros y garantías",
      "Certificación de valor para trámites legales",
      "Informes con respaldo institucional",
      "Análisis de plusvalía y proyecciones",
    ],
  },
  {
    title: "Gestión de Alquileres",
    description:
      "Administración integral de propiedades en alquiler, desde la búsqueda de inquilinos hasta el mantenimiento completo.",
    icon: <Key className="h-8 w-8 text-white" />,
    badge: "Rentable",
    duration: "Servicio continuo",
    features: [
      "Selección rigurosa de inquilinos",
      "Contratos legalmente blindados",
      "Cobro garantizado de rentas",
      "Mantenimiento 24/7",
      "Reportes mensuales detallados",
    ],
  },
  {
    title: "Asesoría Legal",
    description:
      "Acompañamiento jurídico especializado en derecho inmobiliario para transacciones seguras y sin riesgos.",
    icon: <Shield className="h-8 w-8 text-white" />,
    badge: "Seguro",
    duration: "Todo el proceso",
    features: [
      "Revisión exhaustiva de documentos",
      "Redacción de contratos",
      "Gestión notarial completa",
      "Asesoría fiscal especializada",
      "Resolución de conflictos",
    ],
  },
]

const additionalServices = [
  {
    title: "Fotografía Profesional",
    description: "Sesiones fotográficas especializadas para inmuebles",
    icon: <Award className="h-6 w-6 text-white" />,
  },
  {
    title: "Tours Virtuales",
    description: "Recorridos 360° interactivos de alta calidad",
    icon: <Users className="h-6 w-6 text-white" />,
  },
  {
    title: "Home Staging",
    description: "Decoración y ambientación para venta rápida",
    icon: <Star className="h-6 w-6 text-white" />,
  },
  {
    title: "Seguros Inmobiliarios",
    description: "Protección integral para tu propiedad",
    icon: <Shield className="h-6 w-6 text-white" />,
  },
]

const workProcess = [
  {
    title: "Consulta Inicial",
    description:
      "Analizamos tus necesidades específicas y diseñamos una estrategia personalizada para alcanzar tus objetivos inmobiliarios.",
  },
  {
    title: "Planificación Estratégica",
    description:
      "Desarrollamos un plan de acción detallado con cronogramas, presupuestos y métricas de éxito claramente definidas.",
  },
  {
    title: "Ejecución Profesional",
    description:
      "Implementamos el plan con nuestro equipo especializado, manteniéndote informado en tiempo real de cada avance.",
  },
  {
    title: "Entrega y Seguimiento",
    description:
      "Garantizamos resultados exitosos y brindamos soporte continuo para asegurar tu completa satisfacción.",
  },
]

const faqs = [
  {
    question: "¿Cuánto tiempo toma vender una propiedad?",
    answer:
      "El tiempo de venta varía según factores como ubicación, precio y condiciones del mercado. En promedio, una propiedad bien valorada se vende en 2-3 meses. Nuestro equipo utiliza estrategias de marketing digital avanzadas para acelerar el proceso y garantizar la mejor oferta posible.",
  },
  {
    question: "¿Qué documentos necesito para vender mi propiedad?",
    answer:
      "Necesitarás: título de propiedad, certificado de libertad y tradición, paz y salvo de impuestos y servicios, certificado de no afectación, planos actualizados y licencias de construcción si aplica. Nuestro equipo legal te ayudará a recopilar y verificar toda la documentación necesaria.",
  },
  {
    question: "¿Cómo determinan el precio de alquiler de mi propiedad?",
    answer:
      "Realizamos un análisis comparativo de mercado considerando ubicación, tamaño, estado, amenidades y demanda local. Utilizamos herramientas de análisis avanzadas y nuestra experiencia para establecer un precio competitivo que maximice tu rentabilidad y asegure ocupación rápida.",
  },
  {
    question: "¿Qué incluye el servicio de administración de propiedades?",
    answer:
      "Incluye: selección rigurosa de inquilinos, gestión de contratos, cobro de rentas, mantenimiento preventivo y correctivo, inspecciones periódicas, atención de emergencias 24/7, gestión de pagos de servicios e impuestos, y reportes financieros mensuales detallados.",
  },
]