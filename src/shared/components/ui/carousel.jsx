import React, { createContext, useContext, useState, useEffect } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import { Button } from "./button"

const CarouselContext = createContext()

const Carousel = ({ className, children, visibleCount = 1, ...props }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [itemsCount, setItemsCount] = useState(0)

  const canScroll = itemsCount > visibleCount

  const scrollPrev = () => {
    if (!canScroll) return
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : itemsCount - visibleCount))
  }

  const scrollNext = () => {
    if (!canScroll) return
    setCurrentIndex(prev => (prev < itemsCount - visibleCount ? prev + 1 : 0))
  }

  const canScrollPrev = canScroll && currentIndex > 0
  const canScrollNext = canScroll && currentIndex < itemsCount - visibleCount

  return (
    <CarouselContext.Provider
      value={{
        currentIndex,
        setCurrentIndex,
        itemsCount,
        setItemsCount,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        canScroll,
        visibleCount,
      }}
    >
      <div className={cn("relative", className)} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

const CarouselContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { currentIndex, setItemsCount, canScroll, visibleCount } = useContext(CarouselContext)

  useEffect(() => {
    setItemsCount(React.Children.count(children))
  }, [children, setItemsCount])

  // Calculate translateX only if canScroll, else 0
  const translateX = canScroll ? currentIndex * (100 / visibleCount) : 0

  return (
    <div className="overflow-hidden">
      <div
        ref={ref}
        className={cn("flex transition-transform duration-300", className)}
        style={{ transform: `translateX(-${translateX}%)` }}
        {...props}
      >
        {children}
      </div>
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("min-w-0 shrink-0 grow-0 basis-full", className)}
    {...props}
  />
))
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef(({ className, ...props }, ref) => {
  const { scrollPrev, canScrollPrev } = useContext(CarouselContext)

  return (
    <Button
      ref={ref}
      variant="outline"
      size="icon"
      className={cn("absolute h-8 w-8 rounded-full -left-12 top-1/2 -translate-y-1/2", className)}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef(({ className, ...props }, ref) => {
  const { scrollNext, canScrollNext } = useContext(CarouselContext)

  return (
    <Button
      ref={ref}
      variant="outline"
      size="icon"
      className={cn("absolute h-8 w-8 rounded-full -right-12 top-1/2 -translate-y-1/2", className)}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
