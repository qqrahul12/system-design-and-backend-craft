'use client'

import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id?: string
  type: AlertType
  title?: string
  message: string
  duration?: number
}

export function Toast({
  type = 'info',
  title,
  message,
  onClose,
  duration = 5000,
}: {
  type: AlertType
  title?: string
  message: string
  onClose?: () => void
  duration?: number
}) {
  useEffect(() => {
    if (!onClose || duration <= 0) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const styles = {
    success: {
      border: 'border-emerald-500/40',
      bg: 'bg-zinc-950/95',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
      accent: 'text-emerald-400',
    },
    error: {
      border: 'border-rose-500/50',
      bg: 'bg-zinc-950/95 shadow-rose-950/30',
      icon: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />,
      accent: 'text-rose-400',
    },
    warning: {
      border: 'border-amber-500/40',
      bg: 'bg-zinc-950/95',
      icon: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
      accent: 'text-amber-400',
    },
    info: {
      border: 'border-purple-500/40',
      bg: 'bg-zinc-950/95',
      icon: <Info className="h-5 w-5 text-purple-400 shrink-0" />,
      accent: 'text-purple-400',
    },
  }[type]

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-start gap-3 rounded-2xl border ${styles.border} ${styles.bg} p-4 shadow-2xl backdrop-blur-xl animate-slide-in max-w-md w-full`}
      role="alert"
    >
      {styles.icon}
      <div className="flex-1 min-w-0">
        {title && <p className={`text-xs font-bold ${styles.accent} mb-0.5`}>{title}</p>}
        <p className="text-xs text-zinc-200 leading-relaxed break-words">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition p-0.5 rounded-lg hover:bg-zinc-800"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function AlertBanner({
  type = 'info',
  title,
  message,
  action,
}: {
  type: AlertType
  title?: string
  message: string
  action?: React.ReactNode
}) {
  const styles = {
    success: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-950/20 text-emerald-300',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
      accent: 'text-emerald-400',
    },
    error: {
      border: 'border-rose-500/30',
      bg: 'bg-rose-950/20 text-rose-300',
      icon: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />,
      accent: 'text-rose-400',
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/20 text-amber-300',
      icon: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
      accent: 'text-amber-400',
    },
    info: {
      border: 'border-purple-500/30',
      bg: 'bg-purple-950/20 text-purple-300',
      icon: <Info className="h-5 w-5 text-purple-400 shrink-0" />,
      accent: 'text-purple-400',
    },
  }[type]

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border ${styles.border} ${styles.bg} p-4 text-xs`}>
      <div className="flex items-center gap-3">
        {styles.icon}
        <div>
          {title && <span className={`font-bold ${styles.accent} mr-1.5`}>{title}:</span>}
          <span className="text-zinc-200">{message}</span>
        </div>
      </div>
      {action && <div className="self-start sm:self-auto shrink-0">{action}</div>}
    </div>
  )
}
