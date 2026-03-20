import { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { ArrowUp } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/cn"

const landingPrefixes = ["/inmuebles", "/contáctanos", "/nosotros", "/servicios"]

export default function BackToTopButton() {
  const { pathname } = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  const [isOverFooter, setIsOverFooter] = useState(false)

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
      // Show button if scrolled down more than 300px
      const scrolled = window.scrollY > 300
      setIsVisible(scrolled)

      // Check collision with footer
      const footer = document.getElementById("main-footer")
      if (footer) {
        const footerRect = footer.getBoundingClientRect()
        const windowHeight = window.innerHeight
        // If footer is visible in viewport, button might be over it
        // We consider "over footer" if the button's bottom position would overlap with footer
        // Button is fixed bottom-6 (24px)
        const buttonBottom = windowHeight - 24
        if (footerRect.top <= buttonBottom) {
          setIsOverFooter(true)
        } else {
          setIsOverFooter(false)
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    // Initial check
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
        "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-2xl transition-all duration-300",
        // Base styles
        "flex items-center justify-center p-0",
        // Visibility animation
        isVisible
          ? "translate-y-0 opacity-100 scale-100"
          : "pointer-events-none translate-y-12 opacity-0 scale-75",
        // Contextual styles (normal vs over footer)
        isOverFooter
          ? "bg-[#00457B] border-2 border-white text-white hover:bg-white hover:text-[#00457B]"
          : "bg-[#00457B] text-white hover:bg-[#003b69] border-2 border-transparent"
      )}
    >
      <ArrowUp className="h-6 w-6" />
    </Button>
  )
}
