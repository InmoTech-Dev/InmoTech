import React, { createContext, useContext, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/shared/utils/cn"

const AccordionContext = createContext()

const Accordion = ({ type = "single", collapsible = false, children, ...props }) => {
  const [openItems, setOpenItems] = useState(new Set())
  
  const toggleItem = (value) => {
    if (type === "single") {
      if (openItems.has(value)) {
        setOpenItems(collapsible ? new Set() : openItems)
      } else {
        setOpenItems(new Set([value]))
      }
    } else {
      const newOpenItems = new Set(openItems)
      if (newOpenItems.has(value)) {
        newOpenItems.delete(value)
      } else {
        newOpenItems.add(value)
      }
      setOpenItems(newOpenItems)
    }
  }

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

const AccordionItem = React.forwardRef(({ className, value, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("border-b", className)}
    data-value={value}
    {...props}
  >
    {React.Children.map(children, child => 
      React.cloneElement(child, { value })
    )}
  </div>
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const { openItems, toggleItem } = useContext(AccordionContext)
  const isOpen = openItems.has(value)

  return (
    <div className="flex">
      <button
        ref={ref}
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
          className
        )}
        onClick={() => toggleItem(value)}
        {...props}
      >
        {children}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
    </div>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const { openItems } = useContext(AccordionContext)
  const isOpen = openItems.has(value)

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </div>
  )
})
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }