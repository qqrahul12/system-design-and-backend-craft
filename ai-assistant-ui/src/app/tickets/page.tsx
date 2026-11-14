'use client'

import { useState, useEffect } from 'react'
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

export default function TicketsPage() {
  const [tickets, setTickets] = useState<DigitalTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<DigitalTicket | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    code: string
    message: string
  } | null>(null)

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/tickets`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data)
        if (data.length > 0 && !selectedTicket) {
          setSelectedTicket(data[0])
        }
      }
    } catch (e) {
      console.warn('Failed to fetch tickets:', e)
    }
  }

  const validateAtGate = async () => {
    if (!selectedTicket || isValidating) return
    setIsValidating(true)
    setValidationResult(null)

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
        if (result.ticket) {
          setSelectedTicket(result.ticket)
          // update in list
          setTickets((prev) =>
            prev.map((t) => (t.ticketId === result.ticket.ticketId ? result.ticket : t))
          )
        }
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        code: 'NETWORK_ERROR',
        message: err.message,
      })
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/20">
              <Ticket className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              CineMind Digital Pass Wallet
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
              HMAC-SHA256 Signed
            </span>
          </div>
          <p className="mt-1.5 text-sm text-[#888]">
            Cryptographically-verified digital cinema passes with live simulated gate scanner.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#161616] border border-[#2a2a2a] text-[#aaa] hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Wallet
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Digital Pass Card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedTicket ? (
            <div className="relative rounded-3xl border border-[#333] bg-gradient-to-b from-[#181818] via-[#121212] to-[#0d0d0d] p-7 shadow-2xl overflow-hidden space-y-6">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-[#252525] pb-4">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-[#a78bfa]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    CineMind Admission Pass
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
                      selectedTicket.status === 'CHECKED_IN' ? 'bg-emerald-400' : 'bg-purple-400'
                    }`}
                  />
                  {selectedTicket.status === 'CHECKED_IN' ? 'Checked In' : 'Active Pass'}
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
                  <span>{selectedTicket.auditorium}</span>
                </div>
              </div>

              {/* Grid: Showtime, Seats, Price */}
              <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[#141414] border border-[#242424] p-4 text-center">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-[#666]">Showtime</p>
                  <p className="text-sm font-bold text-white mt-0.5">{selectedTicket.showTime}</p>
                </div>
                <div className="border-x border-[#222]">
                  <p className="text-[10px] uppercase font-semibold text-[#666]">Reserved Seats</p>
                  <p className="text-sm font-bold text-purple-400 mt-0.5">
                    {selectedTicket.seats.join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-[#666]">Amount Paid</p>
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
                    <ShieldCheck className="h-3.5 w-3.5" /> Tamper-Proof Cryptographic Signature
                  </div>
                </div>

                {/* Simulated High-Res QR SVG */}
                <div className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-xl">
                  <QrCode className="h-28 w-28 text-black" />
                  <span className="text-[9px] font-mono text-black font-bold mt-1 tracking-widest">
                    CINEMIND-GATE
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[#222] bg-[#121212] p-12 text-center text-[#666]">
              <Ticket className="h-8 w-8 mx-auto mb-2 text-[#444]" />
              <p className="text-sm">No ticket selected</p>
            </div>
          )}
        </div>

        {/* Right Column: Gate Validation Simulator & Ticket History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Gate Scanner Simulator Box */}
          <div className="rounded-2xl border border-[#262626] bg-[#121212] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scan className="h-4 w-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Auditorium Gate Scanner
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#666]">Gate #4 Check-In</span>
            </div>

            <p className="text-xs text-[#888] leading-relaxed">
              Simulate an usher or turnstile optical scanner reading the ticket&apos;s HMAC-SHA256 signature token.
            </p>

            <button
              onClick={validateAtGate}
              disabled={isValidating || !selectedTicket}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-purple-600/20"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Signature...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" /> Simulate Gate Scan
                </>
              )}
            </button>

            {/* Validation Feedback Modal/Card */}
            {validationResult && (
              <div
                className={`rounded-xl border p-3.5 text-xs space-y-1.5 transition-all ${
                  validationResult.valid
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {validationResult.valid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  )}
                  <span>{validationResult.code}</span>
                </div>
                <p className="text-[11px] leading-relaxed">{validationResult.message}</p>
              </div>
            )}
          </div>

          {/* Wallet List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Stored Digital Passes ({tickets.length})
            </h4>

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
                      ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-white'
                      : 'border-[#222] bg-[#141414] text-[#888] hover:border-[#333] hover:text-[#eee]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">{t.movieTitle}</p>
                    <span className="text-[10px] font-mono text-purple-400">{t.showTime}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-[#666]">
                    <span>Seats: {t.seats.join(', ')}</span>
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        t.status === 'CHECKED_IN' ? 'text-emerald-400' : 'text-[#888]'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
