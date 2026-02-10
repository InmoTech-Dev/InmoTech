import React, { createContext, useContext, useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/shared/utils/cn"

const SelectContext = createContext()

const Select = ({ value, onValueChange, children, ...props }) => {
  const [internalValue, setInternalValue] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef(null)

  const currentValue = value !== undefined ? value : internalValue

  const handleValueChange = (newValue) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    if (onValueChange) {
      onValueChange(newValue)
    }
    setIsOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <SelectContext.Provider value={{
      value: currentValue,
      onValueChange: handleValueChange,
      isOpen,
      setIsOpen
    }}>
      <div ref={selectRef} className="relative" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen } = useContext(SelectContext)

  return (
    <button
      type="button"
      ref={ref}
      className={cn(
        "flex h-12 w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 ring-offset-background placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-out hover:border-slate-300 hover:shadow-lg",
        isOpen && "ring-2 ring-blue-500 ring-offset-2 border-blue-500 shadow-xl bg-blue-50/50",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      <span className="flex-1 text-left truncate">
        {children}
      </span>
      <ChevronDown className={cn(
        "h-5 w-5 text-slate-500 transition-all duration-300 ease-out flex-shrink-0 ml-2",
        isOpen && "rotate-180 text-blue-600"
      )} />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, ...props }) => {
  const { value } = useContext(SelectContext)

  return (
    <span className={cn(
      "block truncate",
      !value && "text-slate-500"
    )} {...props}>
      {value || placeholder}
    </span>
  )
}

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { isOpen } = useContext(SelectContext)
  const contentRef = useRef(null)

  // Auto-scroll functionality when dropdown opens
  useEffect(() => {
    if (isOpen && contentRef.current) {
      // Small delay to ensure the dropdown is rendered and positioned
      const timeoutId = setTimeout(() => {
        if (contentRef.current) {
          const dropdown = contentRef.current
          const rect = dropdown.getBoundingClientRect()

          // Find the modal content container (parent with overflow-y-auto)
          let scrollableContainer = dropdown.closest('[class*="overflow-y-auto"]') ||
                                   dropdown.closest('[class*="overflow-auto"]') ||
                                   dropdown.closest('.overflow-y-auto') ||
                                   dropdown.closest('.overflow-auto')

          if (scrollableContainer) {
            // Get the container's bounding rect and scroll position
            const containerRect = scrollableContainer.getBoundingClientRect()
            const containerScrollTop = scrollableContainer.scrollTop
            const containerHeight = scrollableContainer.clientHeight

            // Calculate dropdown position relative to container
            const dropdownTop = rect.top - containerRect.top + containerScrollTop
            const dropdownBottom = dropdownTop + rect.height

            // Check if dropdown extends beyond container
            if (dropdownBottom > containerScrollTop + containerHeight) {
              // Calculate how much to scroll within the container
              const scrollAmount = dropdownBottom - (containerScrollTop + containerHeight) + 20 // 20px padding

              // Smooth scroll the container to make dropdown fully visible
              scrollableContainer.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
              })
            }
          } else {
            // Fallback to window scroll if no container found
            const windowHeight = window.innerHeight
            if (rect.bottom > windowHeight) {
              const scrollAmount = rect.bottom - windowHeight + 20
              window.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
              })
            }
          }
        }
      }, 50) // Small delay to ensure DOM is updated

      return () => clearTimeout(timeoutId)
    }
  }, [isOpen])

  return (
    <div
      ref={(el) => {
        contentRef.current = el
        if (ref) ref.current = el
      }}
      className={cn(
        "absolute z-[9999] max-h-64 min-w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white text-slate-900 shadow-2xl w-full top-full mt-2 backdrop-blur-sm",
        isOpen
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto animate-in slide-in-from-top-3 fade-in-0 zoom-in-95 duration-300"
          : "opacity-0 scale-95 -translate-y-3 pointer-events-none animate-out slide-out-to-top-3 fade-out-0 zoom-out-95 duration-200",
        className
      )}
      style={{
        transformOrigin: 'top center',
        animationFillMode: 'forwards'
      }}
      {...props}
    >
      <div className="p-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        {children}
      </div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const { value: currentValue, onValueChange } = useContext(SelectContext)
  const isSelected = currentValue === value

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all duration-200 ease-out",
        "hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-900 hover:shadow-md hover:scale-[1.01] hover:translate-x-1",
        "focus:bg-gradient-to-r focus:from-gray-100 focus:to-gray-50 focus:text-gray-900 focus:shadow-sm",
        isSelected && "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 font-semibold shadow-md border-l-4 border-blue-500",
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      <span className="absolute left-3 flex h-4 w-4 items-center justify-center transition-all duration-200">
        {isSelected && (
          <Check className="h-4 w-4 text-blue-600 animate-in zoom-in-50 duration-300" />
        )}
      </span>
      <span className="truncate">{children}</span>
    </div>
  )
})

SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
