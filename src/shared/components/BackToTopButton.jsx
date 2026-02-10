import { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { ArrowUp } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/cn"

const landingPrefixes = ["/inmuebles", "/contactanos", "/nosotros", "/servicios"]

export default function BackToTopButton() {
  const { pathname } = useLocation()
  const [isVisible, setIsVisible] = useState(false)

  const isLandingPage = useMemo(() => {
    if (pathname === "/") return true
    return landingPrefixes.some((prefix) => pathname.startsWith(prefix))
  }, [pathname])

  useEffect(() => {
    if (!isLandingPage) {
      setIsVisible(false)
      return
    }

    const handleScroll = () => {
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [isLandingPage])

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (!isLandingPage) return null

  return (
    <Button
      type="button"
      aria-label="Volver arriba"
      onClick={handleClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-[#00457B] text-white shadow-2xl transition-all duration-300 hover:bg-[#003b69]",
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  )
}
