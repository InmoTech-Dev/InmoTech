import React, { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react"
import { apiClient } from "@/shared/services/api.config"
import { useToast } from "@/shared/hooks/use-toast"
import { getBusinessHoursLines } from "@/shared/constants/appointmentSchedule"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const { toast } = useToast()
  const businessHours = getBusinessHoursLines()

  const validateForm = () => {
    const newErrors = {}

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Por favor, ingresa un correo electrónico válido."
    }

    // Phone validation (Colombia: +57 followed by a space and 10 digits)
    const phoneRegex = /^\+57\s\d{10}$/
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = "El teléfono debe tener un formato válido (+57 seguido de un espacio y 10 números)."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "phone") {
      // Remove all non-numeric characters
      const numbersOnly = value.replace(/\D/g, "")

      let formattedPhone = ""
      if (numbersOnly.length > 0) {
        // If the user already typed 57 as the start, just add + and space
        if (numbersOnly.startsWith("57")) {
          formattedPhone = "+57 " + numbersOnly.slice(2, 12)
        } else {
          // Otherwise prepend +57 and space to the digits
          formattedPhone = "+57 " + numbersOnly.slice(0, 10)
        }
      }

      setFormData(prev => ({ ...prev, [name]: formattedPhone }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Clear error when user changes the field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const response = await apiClient.post('/contact', formData)

      if (response.success) {
        toast({
          title: "¡Mensaje enviado!",
          description: "Nos pondremos en contacto contigo pronto.",
        })
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: ""
        })
      } else {
        toast({
          title: "Error al enviar",
          description: response.message || "Hubo un error al enviar el mensaje.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al enviar el formulario:", error)
      toast({
        title: "Error de conexión",
        description: error.message || "Asegúrate de que el servidor esté corriendo.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative h-[550px]">
        <img src="/images/contactanos.jpg" alt="Contáctanos" className="w-full h-full object-cover brightness-[0.65]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <motion.h1
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Contáctanos
          </motion.h1>
          <motion.p
            className="text-lg max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            Estamos aquí para ayudarte con todas tus necesidades inmobiliarias.
          </motion.p>
        </div>
      </section>

      {/* Contact Info & Form */}
      <motion.section
        className="py-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-[#00457B] mb-6">Información de Contacto</h2>
              <p className="text-gray-600 mb-8">
                Nuestro equipo está disponible para atenderte y responder todas tus preguntas. No dudes en contactarnos
                por cualquiera de los siguientes medios.
              </p>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-none shadow-md">
                    <CardContent className="flex items-start p-6">
                      <div className="w-12 h-12 rounded-full bg-[#00457B]/10 flex items-center justify-center mr-4 flex-shrink-0">
                        <MapPin className="h-6 w-6 text-[#00457B]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Dirección</h3>
                        <p className="text-gray-600">Cl. 21 #50 - 12 local 105, Guayabal, Medellín, Antioquia</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-none shadow-md">
                    <CardContent className="flex items-start p-6">
                      <div className="w-12 h-12 rounded-full bg-[#00457B]/10 flex items-center justify-center mr-4 flex-shrink-0">
                        <Phone className="h-6 w-6 text-[#00457B]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Teléfono</h3>
                        <p className="text-gray-600">+57 300 6814 959</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-none shadow-md">
                    <CardContent className="flex items-start p-6">
                      <div className="w-12 h-12 rounded-full bg-[#00457B]/10 flex items-center justify-center mr-4 flex-shrink-0">
                        <Mail className="h-6 w-6 text-[#00457B]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Correo Electrónico</h3>
                        <p className="text-gray-600">matriz_inmobiliaria@gmail.com</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-none shadow-md">
                    <CardContent className="flex items-start p-6">
                      <div className="w-12 h-12 rounded-full bg-[#00457B]/10 flex items-center justify-center mr-4 flex-shrink-0">
                        <Clock className="h-6 w-6 text-[#00457B]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Horario de Atención</h3>
                        {businessHours.map((line) => (
                          <p key={line} className="text-gray-600">{line}</p>
                        ))}
                        <p className="text-gray-600">Sábados y domingos: Cerrado</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-[#00457B] mb-6">Envíanos un Mensaje</h2>
              <p className="text-gray-600 mb-8">
                Completa el siguiente formulario y nos pondremos en contacto contigo lo antes posible.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Nombre completo
                    </label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Tu nombre"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Correo electrónico
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? "border-red-500" : ""}
                      required
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>
                </motion.div>

                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Teléfono
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="+57 300 123 4567"
                      value={formData.phone}
                      onChange={handleChange}
                      className={errors.phone ? "border-red-500" : ""}
                    />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    <p className="text-xs text-gray-500">Ejemplo: 300 123 4567 (el +57 se agregará solo)</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-medium">
                      Asunto
                    </label>
                    <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                      <SelectTrigger id="subject" className="bg-white">
                        <SelectValue placeholder="Selecciona un asunto" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="compra">Compra de propiedad</SelectItem>
                        <SelectItem value="venta">Venta de propiedad</SelectItem>
                        <SelectItem value="Gestión de Alquileres">Gestión de Alquileres</SelectItem>
                        <SelectItem value="Avalúos Certificados">Avalúos Certificados</SelectItem>
                        <SelectItem value="Asesoría Legal">Asesoría Legal</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  viewport={{ once: true }}
                >
                  <label htmlFor="message" className="text-sm font-medium">
                    Mensaje
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Escribe tu mensaje aquí..."
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  <Button
                    type="submit"
                    className="w-full bg-[#00457B] hover:bg-[#003b69] text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" /> Enviar mensaje
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Map Section */}
      <motion.section
        className="py-16 bg-gray-50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-[#00457B] mb-4">Nuestra Ubicación</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Visítanos en nuestra oficina central. Estamos ubicados en una zona de fácil acceso.
            </p>
          </motion.div>

          <motion.div
            className="h-[400px] rounded-lg overflow-hidden shadow-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.2217213!2d-75.5822481!3d6.2217213!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4429e8d36e1cd7%3A0xc910202a9a7584f5!2sMatriz%20Inmobiliaria!5e0!3m2!1ses!2sco!4v1699999999999!5m2!1ses!2sco"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación de Matriz Inmobiliaria"
            ></iframe>
          </motion.div>
        </div>
      </motion.section>

      {/* Offices Section */}
      <motion.section
        className="py-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-[#00457B] mb-4">Nuestras Oficinas</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Contamos con varias oficinas para atenderte de manera personalizada.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {offices.map((office, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                viewport={{ once: true }}
              >
                <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="relative h-48">
                    <img src={office.image || "/placeholder.svg"} alt={office.name} className="w-full h-full object-cover" />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2">{office.name}</h3>
                    <div className="flex items-start mb-2">
                      <MapPin className="h-5 w-5 text-[#00457B] mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-600">{office.address}</p>
                    </div>
                    <div className="flex items-center mb-2">
                      <Phone className="h-5 w-5 text-[#00457B] mr-2 flex-shrink-0" />
                      <p className="text-gray-600">{office.phone}</p>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-[#00457B] mr-2 flex-shrink-0" />
                      <p className="text-gray-600">{office.email}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    </main>
  )
}

// Data
const offices = [
  {
    name: "Oficina Central",
    address: "Calle Principal #123, Ciudad, País",
    phone: "+123 456 7890",
    email: "central@matrizinmobiliaria.com",
    image: "/images/contact/oficina-1.jpg",
  },
  {
    name: "Oficina Norte",
    address: "Avenida Norte #456, Ciudad, País",
    phone: "+123 456 7892",
    email: "norte@matrizinmobiliaria.com",
    image: "/images/contact/oficina-2.jpg",
  },
  {
    name: "Oficina Sur",
    address: "Boulevard Sur #789, Ciudad, País",
    phone: "+123 456 7893",
    email: "sur@matrizinmobiliaria.com",
    image: "/images/contact/oficina-3.jpg",
  },
]
