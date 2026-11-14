'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Ticket,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Film,
  Sparkles,
  RefreshCw,
  Scan,
  Download,
  Share2,
  UtensilsCrossed,
  ArrowRight,
  Smartphone,
  Printer,
  Trash2,
  Check,
  X,
  CreditCard,
  Plus,
  Compass,
  Navigation,
  UserCheck,
} from 'lucide-react'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

interface DigitalTicket {
  ticketId: string
  movieTitle: string
  showTime: string
  format: string
  auditorium: string
  seats: string[]
  totalPaid: number
  qrPayload: string
  hmacSignature: string
  status: 'ISSUED' | 'CHECKED_IN' | 'EXPIRED'
  issuedAt: string
  checkedInAt?: string
}

function TicketsContent() {
  const searchParams = useSearchParams()
  const targetId = searchParams.get('id')

  const [tickets, setTickets] = useState<DigitalTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<DigitalTicket | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isScanningLaser, setIsScanningLaser] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    code: string
    message: string
  } | null>(null)

  // Interactive Modals & Real-Time Sync
  const [isAppleWalletOpen, setIsAppleWalletOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [liveStreamConnected, setLiveStreamConnected] = useState<boolean>(false)
  const [turnstileState, setTurnstileState] = useState<'LOCKED' | 'UNLOCKING' | 'OPEN' | 'DENIED'>('LOCKED')
  const [activeWayfinderStep, setActiveWayfinderStep] = useState<number>(1)
  const [newPassBanner, setNewPassBanner] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    fetchTickets()
    fetch(`${API_BASE}/api/v1/auth/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (u) setCurrentUser(u) })
      .catch(() => {})

    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource(`${API_BASE}/api/v1/tickets/seats/stream`)
      eventSource.onopen = () => setLiveStreamConnected(true)
      eventSource.addEventListener('seat-update', (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (payload && payload.event === 'TICKET_ISSUED') {
            fetchTickets()
            setNewPassBanner(`🎟️ New Gate Pass Issued: ${payload.ticketId || ''} (${payload.movieTitle || 'Movie'})`)
            playScannerBeep('arrival')
            setTimeout(() => setNewPassBanner(null), 6000)
          }
        } catch {}
      })
      eventSource.onerror = () => setLiveStreamConnected(false)
    } catch {
      setLiveStreamConnected(false)
    }

    return () => {
      if (eventSource) eventSource.close()
    }
  }, [])

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/tickets`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data)

        if (targetId) {
          const match = data.find((t: DigitalTicket) => t.ticketId.toUpperCase() === targetId.toUpperCase())
          if (match) {
            setSelectedTicket(match)
            return
          }
        }
        if (data.length > 0 && !selectedTicket) {
          setSelectedTicket(data[0])
        }
      }
    } catch (e) {
      console.warn('Failed to fetch tickets:', e)
    }
  }

  const playScannerBeep = (kind: 'success' | 'failure' | 'arrival') => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      if (kind === 'arrival') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(587.33, ctx.currentTime)
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      } else if (kind === 'success') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1100, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.12)
      } else {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(220, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.25)
      }
    } catch {}
  }

  const validateAtGate = async () => {
    if (!selectedTicket || isValidating) return
    setIsValidating(true)
    setIsScanningLaser(true)
    setValidationResult(null)
    setTurnstileState('UNLOCKING')

    // Optical laser animation delay
    await new Promise((r) => setTimeout(r, 700))

    try {
      const res = await fetch(`${API_BASE}/api/v1/tickets/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.ticketId,
          qrToken: selectedTicket.qrPayload,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        setValidationResult(result)
        const isGranted = result.valid || result.code === 'ALREADY_CHECKED_IN'
        playScannerBeep(isGranted ? 'success' : 'failure')
        setTurnstileState(isGranted ? 'OPEN' : 'DENIED')
        if (isGranted) {
          setTimeout(() => setTurnstileState('LOCKED'), 5000)
        }
        if (result.ticket) {
          setSelectedTicket(result.ticket)
          setTickets((prev) =>
            prev.map((t) => (t.ticketId === result.ticket.ticketId ? result.ticket : t))
          )
        }
      }
    } catch (err: any) {
      playScannerBeep('failure')
      setTurnstileState('DENIED')
      setValidationResult({
        valid: false,
        code: 'NETWORK_ERROR',
        message: err.message,
      })
    } finally {
      setIsScanningLaser(false)
      setIsValidating(false)
    }
  }

  const handleCancelTicket = async () => {
    if (!selectedTicket) return
    if (!confirm(`Are you sure you want to cancel and refund pass "${selectedTicket.ticketId}" for ${selectedTicket.movieTitle}?`)) {
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/tickets/${selectedTicket.ticketId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showNotice(`Refunded $${selectedTicket.totalPaid.toFixed(2)} to original payment method.`)
        const remaining = tickets.filter((t) => t.ticketId !== selectedTicket.ticketId)
        setTickets(remaining)
        setSelectedTicket(remaining.length > 0 ? remaining[0] : null)
      }
    } catch {
      showNotice('Reservation cancelled.')
      const remaining = tickets.filter((t) => t.ticketId !== selectedTicket.ticketId)
      setTickets(remaining)
      setSelectedTicket(remaining.length > 0 ? remaining[0] : null)
    }
  }

  const showNotice = (msg: string) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(null), 3500)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Toast */}
      {actionNotice && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-5 py-3 text-sm text-emerald-200 shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Staff Gate Attendant Mode Banner */}
      {currentUser?.role === 'AUDITORIUM_USHER' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl border border-indigo-500/40 bg-indigo-950/30 text-xs text-indigo-200">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>Staff Gate Attendant Mode: <strong>Sarah Jenkins</strong> (Lead Auditorium Usher)</span>
          </div>
          <span className="font-mono text-[11px] text-indigo-300 bg-indigo-900/50 px-2 py-0.5 rounded border border-indigo-700/50 self-start sm:self-auto">
            Optical Laser Turnstile Unit 01 Active
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/20">
              <Ticket className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              CineMind Digital Pass Wallet
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
              HMAC-SHA256 Signed
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${
                liveStreamConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  liveStreamConnected ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'
                }`}
              />
              {liveStreamConnected ? 'Live Pass Stream' : 'Synced'}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-[#888]">
            Your cryptographic mobile admissions, live gate check-in status, Apple Wallet integration, and in-theater F&B delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/booking"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/20 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Book Another Movie
          </Link>

          <button
            onClick={fetchTickets}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#161616] border border-[#2a2a2a] text-[#aaa] hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Real-time Pass Arrival Toast Banner */}
      {newPassBanner && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs font-mono animate-slide-up shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <span className="font-semibold">{newPassBanner}</span>
          </div>
          <span className="text-[10px] text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded">Just Now</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Digital Pass Card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedTicket ? (
            <div className="space-y-4">
              {/* The Physical Ticket Replica */}
              <div className="relative rounded-3xl border border-[#333] bg-gradient-to-b from-[#181818] via-[#121212] to-[#0d0d0d] p-7 shadow-2xl overflow-hidden space-y-6">
                {/* Laser Scanning Beam Animation */}
                {isScanningLaser && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444] animate-pulse z-30 transition-all top-1/2" />
                )}

                {/* Ambient glow */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

                {/* Status Header */}
                <div className="flex items-center justify-between border-b border-[#252525] pb-4">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-[#a78bfa]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      CineMind Theatrical Admission Pass
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 border ${
                      selectedTicket.status === 'CHECKED_IN'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-purple-500/15 border-purple-500/30 text-[#a78bfa]'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        selectedTicket.status === 'CHECKED_IN' ? 'bg-emerald-400 animate-ping' : 'bg-purple-400'
                      }`}
                    />
                    {selectedTicket.status === 'CHECKED_IN' ? 'Admitted at Gate' : 'Active Pass (Valid)'}
                  </span>
                </div>

                {/* Movie Title & Details */}
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {selectedTicket.movieTitle}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#888] pt-1">
                    <span className="rounded bg-[#202020] px-2 py-0.5 font-bold text-white border border-[#2a2a2a]">
                      {selectedTicket.format}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-300 font-semibold">{selectedTicket.auditorium}</span>
                  </div>
                </div>

                {/* Grid: Showtime, Seats, Price */}
                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[#141414] border border-[#242424] p-4 text-center">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[#666]">Showtime</p>
                    <p className="text-sm font-bold text-white mt-0.5">{selectedTicket.showTime}</p>
                  </div>
                  <div className="border-x border-[#222]">
                    <p className="text-[10px] uppercase font-semibold text-[#666]">Seats</p>
                    <p className="text-sm font-bold text-purple-400 mt-0.5">
                      {selectedTicket.seats.join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-[#666]">Paid</p>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">
                      ${selectedTicket.totalPaid.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Tear-off Dotted Divider */}
                <div className="relative flex items-center py-2">
                  <div className="absolute -left-10 h-6 w-6 rounded-full bg-[#0a0a0a] border border-[#333]" />
                  <div className="w-full border-t border-dashed border-[#333]" />
                  <div className="absolute -right-10 h-6 w-6 rounded-full bg-[#0a0a0a] border border-[#333]" />
                </div>

                {/* QR Verification Code & Signature */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-xs font-mono font-bold text-white tracking-wider">
                      {selectedTicket.ticketId}
                    </p>
                    <p className="text-[10px] text-[#666] font-mono max-w-xs break-all">
                      HMAC: {selectedTicket.hmacSignature.substring(0, 32)}...
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 pt-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Hardware Gate Cryptography Validated
                    </div>
                  </div>

                  {/* Scannable Optical QR */}
                  <div className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-xl">
                    <QrCode className="h-28 w-28 text-black" />
                    <span className="text-[9px] font-mono text-black font-bold mt-1 tracking-widest">
                      CINEMIND-GATE
                    </span>
                  </div>
                </div>
              </div>

              {/* Real User Utility Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  onClick={() => setIsAppleWalletOpen(true)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition active:scale-95 text-xs font-semibold gap-1.5"
                >
                  <Smartphone className="h-4 w-4 text-purple-400" />
                  <span>Apple Wallet</span>
                </button>

                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition active:scale-95 text-xs font-semibold gap-1.5"
                >
                  <Printer className="h-4 w-4 text-indigo-400" />
                  <span>Print Pass</span>
                </button>

                <Link
                  href={`/concessions?movie=${encodeURIComponent(selectedTicket.movieTitle)}&seats=${selectedTicket.seats.join(',')}&auditorium=${encodeURIComponent(selectedTicket.auditorium)}`}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/40 transition active:scale-95 text-xs font-semibold gap-1.5"
                >
                  <UtensilsCrossed className="h-4 w-4 text-amber-400" />
                  <span>Order Snacks</span>
                </Link>

                <button
                  onClick={handleCancelTicket}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/40 transition active:scale-95 text-xs font-semibold gap-1.5"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                  <span>Cancel Pass</span>
                </button>
              </div>

              {/* In-Theater Wayfinding Guide */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <Navigation className="h-3.5 w-3.5 text-indigo-400" />
                    <span>In-Theater Turnstile & Seat Wayfinder</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">Turnstile Gate 2B</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    onClick={() => setActiveWayfinderStep(1)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      activeWayfinderStep === 1
                        ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                        : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">1. Concourse</span>
                    <span className="font-bold text-zinc-200">Level 2 North</span>
                  </button>
                  <button
                    onClick={() => setActiveWayfinderStep(2)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      activeWayfinderStep === 2
                        ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                        : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">2. Auditorium</span>
                    <span className="font-bold text-purple-400">{selectedTicket.auditorium.split(' ')[0]} Entry</span>
                  </button>
                  <button
                    onClick={() => setActiveWayfinderStep(3)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      activeWayfinderStep === 3
                        ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                        : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">3. Aisle</span>
                    <span className="font-bold text-zinc-200">Center Walkway</span>
                  </button>
                  <button
                    onClick={() => setActiveWayfinderStep(4)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      activeWayfinderStep === 4
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">4. Your Seats</span>
                    <span className="font-bold text-emerald-400 font-mono">{selectedTicket.seats.join(', ')}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-[11px] text-zinc-300 leading-relaxed font-mono">
                  {activeWayfinderStep === 1 && (
                    <p>📍 <span className="text-white font-bold">Step 1:</span> Take Central Promenade Escalator to Level 2. Head toward North Wing past Gourmet F&B Concessions Lounge.</p>
                  )}
                  {activeWayfinderStep === 2 && (
                    <p>🚪 <span className="text-white font-bold">Step 2:</span> Approach {selectedTicket.auditorium}. Scan QR code at Optical Pod #2 to disengage acoustic sound-lock doors.</p>
                  )}
                  {activeWayfinderStep === 3 && (
                    <p>🚶 <span className="text-white font-bold">Step 3:</span> Walk down Center Aisle toward row {selectedTicket.seats[0]?.[0] || 'C'}. Low-intensity floor safety LEDs illuminate your pathway.</p>
                  )}
                  {activeWayfinderStep === 4 && (
                    <p>💺 <span className="text-white font-bold">Step 4:</span> Locate your motorized luxury recliners ({selectedTicket.seats.join(', ')}). In-seat swivel tray & heating controls are ready.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[#222] bg-[#121212] p-12 text-center text-[#666] space-y-3">
              <Ticket className="h-10 w-10 mx-auto text-[#444]" />
              <p className="text-sm text-zinc-400">No tickets currently selected</p>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500"
              >
                Go to Movie Booking
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Gate Validation Simulator & Wallet Drawer (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Gate Scanner Simulator Box */}
          <div className="rounded-2xl border border-[#262626] bg-[#121212] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scan className="h-4 w-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Auditorium Gate Turnstile Scanner
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Gate #2 Online
              </span>
            </div>

            <p className="text-xs text-[#888] leading-relaxed">
              Simulates the optical gate turnstile scanning the ticket&apos;s cryptographic token. Prevents gate fraud and duplicate admissions.
            </p>

            {/* Turnstile Visual Mechanism Status */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                turnstileState === 'OPEN'
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : turnstileState === 'DENIED'
                  ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-500/10'
                  : turnstileState === 'UNLOCKING'
                  ? 'bg-amber-950/40 border-amber-500/50'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                    turnstileState === 'OPEN'
                      ? 'bg-emerald-400 animate-ping'
                      : turnstileState === 'DENIED'
                      ? 'bg-rose-500 animate-pulse'
                      : turnstileState === 'UNLOCKING'
                      ? 'bg-amber-400 animate-spin'
                      : 'bg-zinc-600'
                  }`}
                />
                <div>
                  <p className="text-xs font-bold text-white tracking-wide">
                    {turnstileState === 'OPEN'
                      ? 'GATE UNLOCKED — PROCEED THROUGH'
                      : turnstileState === 'DENIED'
                      ? 'GATE LOCKED — ACCESS DENIED'
                      : turnstileState === 'UNLOCKING'
                      ? 'VERIFYING OPTICAL HMAC...'
                      : 'PHYSICAL TURNSTILE BARRIER ENGAGED'}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {turnstileState === 'OPEN'
                      ? 'Turnstile Barrier #2: Open (Green LED)'
                      : 'Turnstile Barrier #2: Locked (Red LED)'}
                  </p>
                </div>
              </div>
              <div
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase ${
                  turnstileState === 'OPEN'
                    ? 'bg-emerald-500 text-black'
                    : turnstileState === 'DENIED'
                    ? 'bg-rose-500 text-white'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {turnstileState === 'OPEN' ? 'OPEN' : 'LOCKED'}
              </div>
            </div>

            <button
              onClick={validateAtGate}
              disabled={isValidating || !selectedTicket}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-purple-600/20 active:scale-95"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Optical HMAC...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" /> Simulate Optical Gate Scan
                </>
              )}
            </button>

            {/* Validation Feedback Modal/Card */}
            {validationResult && (
              <div
                className={`rounded-xl border p-4 text-xs space-y-2 transition-all ${
                  validationResult.valid
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    {validationResult.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                    )}
                    <span>{validationResult.code}</span>
                  </div>
                  <span className="text-[10px] font-mono">Gate 2 Admitted</span>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-300">{validationResult.message}</p>
              </div>
            )}
          </div>

          {/* Wallet List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#777]">
                Your Stored Passes ({tickets.length})
              </h4>
              <span className="text-[10px] text-zinc-500">Click to switch pass</span>
            </div>

            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.ticketId}
                  onClick={() => {
                    setSelectedTicket(t)
                    setValidationResult(null)
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    selectedTicket?.ticketId === t.ticketId
                      ? 'border-purple-500 bg-purple-950/20 text-white shadow-lg shadow-purple-500/10'
                      : 'border-[#222] bg-[#141414] text-[#888] hover:border-[#333] hover:text-[#eee]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">{t.movieTitle}</p>
                    <span className="text-[10px] font-mono text-purple-400">{t.showTime}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[#666]">
                    <span>Seats: {t.seats.join(', ')} • {t.auditorium.split(' ')?.[0] || 'Auditorium'}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        t.status === 'CHECKED_IN'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-purple-500/10 text-purple-300'
                      }`}
                    >
                      {t.status === 'CHECKED_IN' ? 'Admitted' : 'Valid'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Apple / Google Wallet Modal Preview */}
      {isAppleWalletOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl space-y-6 text-white text-center">
            <button
              onClick={() => setIsAppleWalletOpen(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-zinc-400 hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-center gap-2 text-purple-400 font-bold text-sm">
              <Smartphone className="h-5 w-5" />
              <span>Apple Wallet Pass Ready</span>
            </div>

            {/* Wallet Pass Mock */}
            <div className="rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-5 border border-zinc-700 space-y-4 shadow-xl text-left">
              <div className="flex justify-between items-center text-xs text-zinc-400 border-b border-zinc-800 pb-2">
                <span>CINEMIND VIP PASS</span>
                <span className="font-mono text-purple-400">{selectedTicket.format}</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedTicket.movieTitle}</h3>
                <p className="text-xs text-zinc-400">{selectedTicket.auditorium}</p>
              </div>
              <div className="flex justify-between text-xs bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-500 block">TIME</span>
                  <span className="font-bold text-white">{selectedTicket.showTime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">SEATS</span>
                  <span className="font-bold text-purple-400">{selectedTicket.seats.join(', ')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">GATE</span>
                  <span className="font-bold text-emerald-400">Gate #2</span>
                </div>
              </div>
              <div className="flex justify-center pt-2">
                <QrCode className="h-20 w-20 text-white" />
              </div>
            </div>

            <button
              onClick={() => {
                setIsAppleWalletOpen(false)
                showNotice('Added pass to Apple Wallet successfully!')
              }}
              className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition shadow"
            >
              Add to Apple Wallet
            </button>
          </div>
        </div>
      )}

      {/* Printable Pass Modal */}
      {isPrintModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white text-black p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-zinc-600 hover:bg-zinc-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b-2 border-black pb-4 text-center space-y-1">
              <h2 className="text-2xl font-black tracking-tight">CINEMIND THEATERS</h2>
              <p className="text-xs uppercase font-mono tracking-widest text-zinc-600">Official Theatrical Admission Voucher</p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-600">Feature:</span>
                <span className="font-bold text-base">{selectedTicket.movieTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-600">Showtime & Format:</span>
                <span className="font-bold">{selectedTicket.showTime} • {selectedTicket.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-600">Auditorium & Seats:</span>
                <span className="font-bold text-purple-700">{selectedTicket.auditorium} (Seats: {selectedTicket.seats.join(', ')})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-600">Total Paid:</span>
                <span className="font-bold text-emerald-700">${selectedTicket.totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-mono text-xs border-t border-zinc-200 pt-2">
                <span>Pass ID: {selectedTicket.ticketId}</span>
                <span>Gate: #2</span>
              </div>
            </div>

            <div className="flex items-center justify-center p-4 border-2 border-dashed border-zinc-300 rounded-xl">
              <QrCode className="h-32 w-32 text-black" />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-black text-white font-bold text-xs hover:bg-zinc-800 transition"
              >
                Print Voucher
              </button>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-300 font-bold text-xs hover:bg-zinc-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-zinc-500">Loading Wallet...</div>}>
      <TicketsContent />
    </Suspense>
  )
}
