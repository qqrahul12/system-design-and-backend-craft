'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, CheckCircle2, ArrowRight, Film, Key, Loader2, PauseCircle } from 'lucide-react'
import { authService } from '@/services'

export default function LogoutPage() {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    authService.logout()
      .then(() => setDone(true))
      .catch(() => setDone(true))
  }, [])

  useEffect(() => {
    if (!done || isPaused) return

    if (countdown <= 0) {
      router.push('/booking')
      return
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [done, countdown, isPaused, router])

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full rounded-2xl bg-[#141414] border border-[#242424] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-400">
          <LogOut className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Session Closed</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            You Have Been Signed Out
          </h1>
          <p className="text-xs text-[#888] leading-relaxed">
            Your CineMind session has been safely terminated. Your booked passes, loyalty tier cashback, and digital wallet balance remain securely stored.
          </p>
        </div>

        {/* Option 1: Auto-Redirect Countdown Pill */}
        <div className="transition-all">
          {!isPaused ? (
            <div className="flex items-center justify-between rounded-xl bg-purple-950/25 border border-purple-500/30 px-3.5 py-2.5 text-xs text-purple-300">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                <span>
                  Redirecting to catalog in <strong className="text-white font-mono font-bold">{countdown}s</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaused(true)}
                className="text-[11px] text-purple-400 hover:text-white underline font-medium transition cursor-pointer"
              >
                Stay Here
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-[#1c1c1c] border border-[#2b2b2b] px-3.5 py-2.5 text-xs text-[#888]">
              <div className="flex items-center gap-2">
                <PauseCircle className="h-3.5 w-3.5 text-[#666]" />
                <span>Auto-redirect paused</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPaused(false)
                  setCountdown(3)
                }}
                className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium transition cursor-pointer"
              >
                Resume Countdown
              </button>
            </div>
          )}
        </div>

        <div className="pt-2 space-y-3">
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white shadow-lg shadow-purple-600/30 transition"
          >
            <Key className="h-4 w-4" />
            <span>Sign Back In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            href="/booking"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] border border-[#333] font-semibold text-xs text-[#ccc] hover:text-white transition"
          >
            <Film className="h-4 w-4" />
            <span>Browse Theatrical Releases Now</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
