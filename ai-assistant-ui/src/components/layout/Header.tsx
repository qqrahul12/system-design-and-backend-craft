'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Wifi,
  Sparkles,
  CheckCircle2,
  User,
  Wallet,
  Users,
  Ticket,
  LogOut,
  ChevronDown,
  Key,
} from 'lucide-react'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

const PAGE_TITLES: Record<string, { title: string; subtitle: string; icon: string }> = {
  '/booking': {
    title: 'Smart Movie Booking',
    subtitle: 'High-Concurrency Reservation & AI Seat Optimization',
    icon: '🎬',
  },
  '/concessions': {
    title: 'Gourmet F&B Studio',
    subtitle: 'AI Flavor Pairings, Real-Time Prep Queue & In-Seat Delivery',
    icon: '🍿',
  },
  '/tickets': {
    title: 'Pass Wallet & Gate Scan',
    subtitle: 'HMAC-SHA256 Encrypted Offline QR Turnstile Verification',
    icon: '🎟️',
  },
  '/wallet': {
    title: 'CineCash Digital Wallet',
    subtitle: 'Prepaid VIP Balance, Instant Top-Ups & Circuit Breaker',
    icon: '💳',
  },
  '/split': {
    title: 'SplitMoney Squad Bills',
    subtitle: 'Group Concessions & Ticket Expense Splitting with Fair Share',
    icon: '👥',
  },
  '/profile': {
    title: 'Member Profile & RBAC Security',
    subtitle: 'Session Credentials, Loyalty Tier & Role-Based Access Control',
    icon: '👤',
  },
  '/auth': {
    title: 'Single Sign-On & Identity Portal',
    subtitle: 'Multi-Persona Authentication & Token Verification Gateway',
    icon: '🔐',
  },
  '/login': {
    title: 'Sign In & Access Portal',
    subtitle: 'Member Credentials & 1-Click Persona Simulator',
    icon: '🔑',
  },
  '/logout': {
    title: 'Session Terminated',
    subtitle: 'Safe Sign-Out & Identity Guard',
    icon: '🚪',
  },
  '/account': {
    title: 'Account Settings & Profile',
    subtitle: 'Manage Credentials, Security & Preferences',
    icon: '⚙️',
  },
  '/admin': {
    title: 'Executive Studio & Intel',
    subtitle: 'Real-Time Box Office, Dynamic Yield Surge & Auditorium Load',
    icon: '💼',
  },
  '/agent': {
    title: 'Autonomous Agent Swarm (MCP)',
    subtitle: 'Standardized JSON-RPC 2.0 Autonomous Tool Orchestrator',
    icon: '🤖',
  },
  '/tracing': {
    title: 'APM Waterfall Distributed Traces',
    subtitle: 'OpenTelemetry Trace Spans, DB Queries & MCP Latency Budgets',
    icon: '⚡',
  },
  '/analytics': {
    title: 'LLMOps & Telemetry Dashboard',
    subtitle: 'SHA-256 Memoized Response Cache & Prompt Injection Guard',
    icon: '📊',
  },
  '/documents': {
    title: 'Document Intelligence & RAG',
    subtitle: '768-Dim Gemini Embeddings & Semantic Search',
    icon: '📄',
  },
  '/chat': {
    title: 'Multi-Model AI Chat',
    subtitle: 'Dual-Provider Engine: Gemini 3.8 Flash vs Groq LPU',
    icon: '💬',
  },
}

export default function Header() {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<any>({
    fullName: 'Alex Vance',
    role: 'VIP_PATRON',
    roleDisplayName: 'Gold Lounge VIP Member',
    membershipTier: 'CineMind Founder Gold',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
  })
  const [walletBalance, setWalletBalance] = useState<number>(175.0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/auth/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (u) setCurrentUser(u) })
      .catch(() => {})

    fetch(`${API_BASE}/api/v1/wallet`)
      .then((r) => (r.ok ? r.json() : null))
      .then((w) => { if (w) setWalletBalance(w.balance) })
      .catch(() => {})

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pathname])

  const pageInfo =
    Object.entries(PAGE_TITLES).find(([key]) =>
      pathname === key || pathname.startsWith(key + '/'),
    )?.[1] ?? {
      title: 'CineMind Platform',
      subtitle: 'Production-Grade AI Microservices',
      icon: '✨',
    }

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between px-8 border-b border-[#1f1f1f]"
      style={{
        backgroundColor: '#0a0a0add',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Dynamic Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141414] border border-[#222] text-xl shadow-inner">
          {pageInfo.icon}
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
            {pageInfo.title}
          </h1>
          <p className="text-[11px] text-[#666] font-normal">{pageInfo.subtitle}</p>
        </div>
      </div>

      {/* Right: Badges & Account Pod */}
      <div className="flex items-center gap-3">
        {/* Production Stage Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#7c3aed15] border border-[#7c3aed40] text-[#a78bfa]">
          <Sparkles className="h-3 w-3" />
          <span className="text-[11px] font-medium tracking-wide">
            Java 21 · Spring AI 1.0 · Next.js 14
          </span>
        </div>

        {/* Live System Indicator */}
        <div className="flex items-center gap-2 rounded-full px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium">Online</span>
        </div>

        {/* User Account Menu Pod */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-full bg-[#161616] hover:bg-[#202020] border border-[#282828] hover:border-purple-500/50 transition group shadow-sm"
          >
            <div className="flex flex-col items-end mr-0.5 hidden md:flex">
              <span className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate max-w-[120px]">
                {currentUser?.fullName || 'Alex Vance'}
              </span>
              <span className="text-[9px] font-mono text-purple-400">
                {currentUser?.role === 'VIP_PATRON' ? '👑 VIP Founder'
                  : currentUser?.role === 'EXECUTIVE_ADMIN' ? '🛡️ Director'
                  : currentUser?.role === 'AUDITORIUM_USHER' ? '🎟️ Usher'
                  : 'Patron'}
              </span>
            </div>

            <div className="relative">
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop'}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover border border-purple-500/40"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
            </div>

            <ChevronDown className={`h-3.5 w-3.5 text-[#777] transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-white' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141414] border border-[#282828] shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 p-2.5 border-b border-[#222]">
                <img
                  src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop'}
                  alt="Avatar"
                  className="w-10 h-10 rounded-xl object-cover border border-[#333]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{currentUser?.fullName}</p>
                  <p className="text-[10px] text-[#888] font-mono truncate">{currentUser?.email}</p>
                  <span className="inline-block mt-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {currentUser?.membershipTier || 'Founder Gold'}
                  </span>
                </div>
              </div>

              {/* Live Wallet Pill */}
              <div className="mt-2.5 mb-2 p-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-[#aaa]">CineCash</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ${walletBalance.toFixed(2)}
                  </span>
                  <Link
                    href="/wallet"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 underline"
                  >
                    Top Up
                  </Link>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1 text-xs">
                <Link
                  href="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#ccc] hover:bg-[#1e1e1e] hover:text-white transition"
                >
                  <User className="h-4 w-4 text-purple-400" />
                  <span>Account & Profile</span>
                </Link>
                <Link
                  href="/wallet"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#ccc] hover:bg-[#1e1e1e] hover:text-white transition"
                >
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  <span>CineCash Digital Wallet</span>
                </Link>
                <Link
                  href="/split"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#ccc] hover:bg-[#1e1e1e] hover:text-white transition"
                >
                  <Users className="h-4 w-4 text-sky-400" />
                  <span>SplitMoney Squads</span>
                </Link>
                <Link
                  href="/tickets"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#ccc] hover:bg-[#1e1e1e] hover:text-white transition"
                >
                  <Ticket className="h-4 w-4 text-amber-400" />
                  <span>My Passes & QR Gate</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#ccc] hover:bg-[#1e1e1e] hover:text-white transition"
                >
                  <Key className="h-4 w-4 text-indigo-400" />
                  <span>Switch Account / Persona</span>
                </Link>
              </div>

              {/* Sign Out Action */}
              <div className="pt-2 mt-2 border-t border-[#222]">
                <Link
                  href="/logout"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition text-xs font-semibold"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
