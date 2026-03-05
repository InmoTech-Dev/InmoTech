import React, { useState, useEffect } from "react"
import { useToast } from "../../hooks/use-toast"
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastItem({ toast }) {
  const [progress, setProgress] = useState(100)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const duration = 5000 // 5 seconds
    const interval = 50 // Update every 50ms
    const steps = duration / interval
    const decrement = 100 / steps

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - decrement
        if (newProgress <= 0) {
          setIsVisible(false)
          setTimeout(() => {
            if (toast.dismiss) toast.dismiss()
          }, 300) // Small delay for fade out animation
          clearInterval(timer)
          return 0
        }
        return newProgress
      })
    }, interval)

    return () => clearInterval(timer)
  }, [toast])

  if (!isVisible) return null

  // Define styles and icons based on variant
  const getToastConfig = (variant) => {
    switch (variant) {
      case 'destructive':
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          progressColor: 'bg-red-500',
          textColor: 'text-red-800',
          titleColor: 'text-red-900',
          iconColor: 'text-red-600',
          shadowColor: 'shadow-red-100'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          progressColor: 'bg-amber-500',
          textColor: 'text-amber-800',
          titleColor: 'text-amber-900',
          iconColor: 'text-amber-600',
          shadowColor: 'shadow-amber-100'
        }
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          progressColor: 'bg-blue-500',
          textColor: 'text-blue-800',
          titleColor: 'text-blue-900',
          iconColor: 'text-blue-600',
          shadowColor: 'shadow-blue-100'
        }
      case 'success':
      case 'default':
      default:
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          progressColor: 'bg-green-500',
          textColor: 'text-green-800',
          titleColor: 'text-green-900',
          iconColor: 'text-green-600',
          shadowColor: 'shadow-green-100'
        }
    }
  }

  const config = getToastConfig(toast.variant)
  const IconComponent = config.icon

  return (
    <div
      className={`group pointer-events-auto relative flex w-full items-start space-x-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all transform translate-y-0 opacity-100 ${config.bgColor} ${config.borderColor} ${config.shadowColor}`}
      style={{
        animation: 'slideInFromRight 0.4s ease-out'
      }}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-gray-200/50 w-full rounded-b-lg">
        <div
          className={`h-full ${config.progressColor} transition-all duration-50 ease-linear rounded-b-lg`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start space-x-3 flex-1">
        {/* Icon */}
        <div className={`flex-shrink-0 p-1 rounded-full ${config.bgColor} border ${config.borderColor}`}>
          <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="grid gap-1 flex-1 min-w-0">
          {toast.title && (
            <div className={`text-sm font-semibold ${config.titleColor} leading-tight`}>
              {toast.title}
            </div>
          )}
          {toast.description && (
            <div className={`text-sm ${config.textColor} leading-relaxed`}>
              {toast.description}
            </div>
          )}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => {
            if (toast.dismiss) toast.dismiss()
          }, 300)
        }}
        className={`flex-shrink-0 p-1 rounded-md ${config.textColor} opacity-0 transition-all hover:opacity-100 focus:opacity-100 focus:outline-none group-hover:opacity-100 hover:bg-black/5`}
      >
        <X className="h-4 w-4" />
      </button>

      <style>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
