'use client'

import { usePathname } from 'next/navigation'
import { Wifi, Sparkles, CheckCircle2 } from 'lucide-react'

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

      {/* Badges */}
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
          <span className="text-[11px] font-medium">System Online (8080)</span>
        </div>
      </div>
    </header>
  )
}
