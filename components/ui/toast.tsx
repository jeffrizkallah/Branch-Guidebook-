'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[type]

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg',
        bgColor
      )}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        className="hover:opacity-80"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </>
  )
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>>([])

  const addToast = React.useCallback((message: string, type?: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return {
    toasts,
    addToast,
    removeToast,
    success: (message: string) => addToast(message, 'success'),
    error: (message: string) => addToast(message, 'error'),
    info: (message: string) => addToast(message, 'info'),
  }
}
