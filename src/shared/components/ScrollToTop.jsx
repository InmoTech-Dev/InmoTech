import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // Smooth scroll for better UX
    })
  }, [pathname])

  // Also scroll to top on initial page load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return null
}
