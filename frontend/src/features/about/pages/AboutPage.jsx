import React, { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Users, Award, Target, Clock, TrendingUp, Shield } from "lucide-react"
import { motion } from "framer-motion"

// Custom hook for paragraph reveal effect
const useParagraphReveal = (lines, delayBetweenLines = 600) => {
  const [currentLine, setCurrentLine] = useState(0)
  const [isRevealing, setIsRevealing] = useState(false)

  useEffect(() => {
    if (isRevealing && currentLine < lines.length) {
      const timer = setTimeout(() => {
        setCurrentLine(prev => prev + 1)
      }, delayBetweenLines)

      return () => clearTimeout(timer)
    }
  }, [isRevealing, currentLine, lines, delayBetweenLines])

  const startReveal = useCallback(() => setIsRevealing(true), [])

  return {
    currentLine,
    isRevealing,
    startReveal,
    isComplete: currentLine >= lines.length
  }
}

// Animation variants
const heroVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  },
  item: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  }
}

const storyVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.5,
        delayChildren: 0.3
      }
    }
  },
  item: {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  }
}

const missionVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  },
  title: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  },
  card: {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  }
}

const teamVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  },
  title: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  },
  member: {
    hidden: { opacity: 0, y: 60, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  }
}

const reasonsVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
        delayChildren: 0.1
      }
    }
  },
  title: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  },
  reason: {
    hidden: { opacity: 0, x: -50, rotate: -10 },
    visible: {
      opacity: 1,
      x: 0,
      rotate: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  }
}

export default function AboutPage() {
  const storyLines = [
    "Matriz Inmobiliaria nació en 2008 con la visión de transformar la experiencia de comprar, vender y alquilar propiedades en el mercado inmobiliario.",
    "Fundada por un grupo de profesionales con amplia experiencia en el sector, nuestra empresa ha crecido hasta convertirse en un referente en el mercado.",
    "A lo largo de estos años, hemos ayudado a cientos de familias a encontrar el hogar de sus sueños y a inversionistas a maximizar el rendimiento de sus activos inmobiliarios.",
    "Nuestro compromiso con la excelencia y la satisfacción del cliente nos ha permitido crecer de manera sostenida.",
    "Hoy, con un equipo de más de 50 profesionales y una cartera diversificada de propiedades, seguimos comprometidos con nuestra misión original:",
    "ofrecer un servicio inmobiliario integral, transparente y de calidad."
  ]

  const { currentLine, isRevealing, startReveal, isComplete } = useParagraphReveal(storyLines)

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative h-[400px] overflow-hidden">
        <motion.img
          src="/images/nosotros.jpg"
          alt="Sobre Matriz Inmobiliaria"
          className="w-full h-full object-cover brightness-[0.65]"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4"
          variants={heroVariants.container}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            variants={heroVariants.item}
          >
            Sobre Nosotros
          </motion.h1>
          <motion.p
            className="text-lg max-w-2xl"
            variants={heroVariants.item}
          >
            Conoce nuestra historia, misión y el equipo detrás de Matriz Inmobiliaria.
          </motion.p>
        </motion.div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center"
            variants={storyVariants.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            onViewportEnter={startReveal}
          >
            <div>
              <motion.h2
                className="text-3xl font-bold text-[#00457B] mb-6"
                variants={storyVariants.item}
              >
                Nuestra Historia
              </motion.h2>

              <motion.div variants={storyVariants.item}>
                <div className="space-y-4">
                  {storyLines.slice(0, currentLine + 1).map((line, index) => (
                    <motion.p
                      key={index}
                      className="text-gray-600"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div
              className="relative h-[400px] rounded-lg overflow-hidden shadow-xl"
              variants={storyVariants.item}
            >
              <motion.img
                src="/images/porque-elegirnos.jpg"
                alt="Historia de Matriz Inmobiliaria"
                className="w-full h-full object-cover"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            variants={missionVariants.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h2
              className="text-3xl font-bold text-[#00457B] mb-4"
              variants={missionVariants.title}
            >
              Misión, Visión y Valores
            </motion.h2>
            <motion.p
              className="text-gray-600 max-w-2xl mx-auto"
              variants={missionVariants.title}
            >
              Los pilares que guían nuestro trabajo diario y nos ayudan a ofrecer un servicio excepcional.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={missionVariants.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div variants={missionVariants.card}>
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                <CardContent className="pt-6">
                  <motion.div
                    className="w-12 h-12 rounded-full bg-[#00457B]/10 flex items-center justify-center mb-4 mx-auto"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Target className="h-6 w-6 text-[#00457B]" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-center mb-4">Misión</h3>
                  <p className="text-gray-600">
                    Brindar soluciones inmobiliarias integrales que satisfagan las necesidades de nuestros clientes,
                    ofreciendo un servicio personalizado, transparente y de calidad que genere confianza y tranquilidad en
                    cada transacción.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={missionVariants.card}>
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                <CardContent className="pt-6">
                  <motion.div
                    className="w-12 h-12 rounded-full bg-[#00457B]/10 flex items-center justify-center mb-4 mx-auto"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TrendingUp className="h-6 w-6 text-[#00457B]" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-center mb-4">Visión</h3>
                  <p className="text-gray-600">
                    Ser la inmobiliaria líder y referente en el mercado, reconocida por su excelencia en el servicio,
                    innovación constante y compromiso con la satisfacción de nuestros clientes, colaboradores y la
                    comunidad.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={missionVariants.card}>
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                <CardContent className="pt-6">
                  <motion.div
                    className="w-12 h-12 rounded-full bg-[#00457B]/10 flex items-center justify-center mb-4 mx-auto"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Shield className="h-6 w-6 text-[#00457B]" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-center mb-4">Valores</h3>
                  <ul className="text-gray-600 space-y-2">
                    <li>• Integridad y transparencia en cada operación</li>
                    <li>• Excelencia en el servicio al cliente</li>
                    <li>• Compromiso con los resultados</li>
                    <li>• Trabajo en equipo y colaboración</li>
                    <li>• Innovación y mejora continua</li>
                    <li>• Responsabilidad social y ambiental</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            variants={teamVariants.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h2
              className="text-3xl font-bold text-[#00457B] mb-4"
              variants={teamVariants.title}
            >
              Nuestro Equipo
            </motion.h2>
            <motion.p
              className="text-gray-600 max-w-2xl mx-auto"
              variants={teamVariants.title}
            >
              Contamos con un equipo de profesionales altamente calificados y comprometidos con brindar el mejor
              servicio.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={teamVariants.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {team.map((member, index) => (
              <motion.div
                key={index}
                className="text-center"
                variants={teamVariants.member}
              >
                <motion.div
                  className="relative h-64 w-64 mx-auto rounded-full overflow-hidden mb-4 shadow-lg"
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.img
                    src={member.image || "/placeholder.svg"}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                </motion.div>
                <motion.h3
                  className="text-xl font-bold"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  {member.name}
                </motion.h3>
                <motion.p
                  className="text-[#00457B] font-medium mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  {member.position}
                </motion.p>
                <motion.p
                  className="text-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  {member.description}
                </motion.p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            variants={reasonsVariants.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.h2
              className="text-3xl font-bold text-[#00457B] mb-4"
              variants={reasonsVariants.title}
            >
              ¿Por qué elegirnos?
            </motion.h2>
            <motion.p
              className="text-gray-600 max-w-2xl mx-auto"
              variants={reasonsVariants.title}
            >
              Descubre las razones por las que somos la mejor opción para tus necesidades inmobiliarias.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={reasonsVariants.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {reasons.map((reason, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center"
                variants={reasonsVariants.reason}
              >
                <motion.div
                  className="w-16 h-16 rounded-full bg-[#00457B]/10 flex items-center justify-center mb-4 shadow-lg"
                  whileHover={{
                    scale: 1.15,
                    rotate: 360,
                    backgroundColor: "#00457B"
                  }}
                  transition={{ duration: 0.6 }}
                >
                  <motion.div
                    whileHover={{ color: "white" }}
                    transition={{ duration: 0.3 }}
                  >
                    {reason.icon}
                  </motion.div>
                </motion.div>
                <motion.h3
                  className="text-xl font-bold mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  {reason.title}
                </motion.h3>
                <motion.p
                  className="text-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  {reason.description}
                </motion.p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </main>
  )
}

// Data
const team = [
  {
    name: "Carlos Martínez",
    position: "Director General",
    description:
      "Con más de 20 años de experiencia en el sector inmobiliario, lidera nuestra empresa con visión y compromiso.",
    image: "/images/gruoup/equipo1.jpg",
  },
  {
    name: "Ana Rodríguez",
    position: "Directora Comercial",
    description:
      "Especialista en marketing inmobiliario y estrategias de venta que maximizan el valor de cada propiedad.",
    image: "/images/gruoup/equipo2.jpg",
  },
  {
    name: "Luis Gómez",
    position: "Asesor Inmobiliario Senior",
    description:
      "Experto en el mercado local con un historial comprobado de transacciones exitosas y clientes satisfechos.",
    image: "/images/gruoup/equipo3.jpg",
  },
  {
    name: "María Sánchez",
    position: "Asesora Legal",
    description: "Abogada especializada en derecho inmobiliario que garantiza la seguridad jurídica en cada operación.",
    image: "/images/gruoup/equipo4.jpg",
  },
]

const reasons = [
  {
    title: "Experiencia Comprobada",
    description:
      "Más de 15 años en el mercado inmobiliario nos respaldan, con cientos de transacciones exitosas y clientes satisfechos.",
    icon: <Clock className="h-8 w-8 text-[#00457B]" />,
  },
  {
    title: "Equipo Profesional",
    description:
      "Contamos con un equipo de expertos en diferentes áreas del sector inmobiliario, listos para asesorarte en todo momento.",
    icon: <Users className="h-8 w-8 text-[#00457B]" />,
  },
  {
    title: "Servicio Personalizado",
    description:
      "Entendemos que cada cliente es único, por eso ofrecemos soluciones adaptadas a tus necesidades específicas.",
    icon: <Award className="h-8 w-8 text-[#00457B]" />,
  },
]
