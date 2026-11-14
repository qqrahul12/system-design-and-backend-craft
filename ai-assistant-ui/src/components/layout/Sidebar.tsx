'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Film,
  FileText,
  Bot,
  BarChart3,
  MessageSquare,
  Sparkles,
  Zap,
  UtensilsCrossed,
  Ticket,
  Activity,
  Sliders,
} from 'lucide-react'
import { clsx } from 'clsx'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Guest Experience',
    items: [
      {
        href: '/booking',
        label: 'Smart Movie Booking',
        icon: Film,
        description: 'Live seating & reservations',
      },
      {
        href: '/concessions',
        label: 'Gourmet F&B Studio',
        icon: UtensilsCrossed,
        description: 'AI pairings & seat delivery',
        badge: 'NEW',
      },
      {
        href: '/tickets',
        label: 'Pass Wallet & Gate Scan',
        icon: Ticket,
        description: 'HMAC QR gate check-in',
        badge: 'NEW',
      },
      {
        href: '/chat',
        label: 'AI Cinema Concierge',
        icon: MessageSquare,
        description: 'Dual Gemini 3.8 + Groq LPU',
      },
    ],
  },
  {
    title: 'Enterprise Operations',
    items: [
      {
        href: '/admin',
        label: 'Executive Studio & Intel',
        icon: Sliders,
        description: 'Box office, yield & catalog',
        badge: 'PRO',
      },
      {
        href: '/agent',
        label: 'Autonomous Agent Swarm',
        icon: Bot,
        description: '7-Agent booking DAG & logs',
      },
      {
        href: '/tracing',
        label: 'APM Waterfall Traces',
        icon: Activity,
        description: 'OpenTelemetry spans & latency',
        badge: 'NEW',
      },
      {
        href: '/analytics',
        label: 'LLMOps & Telemetry',
        icon: BarChart3,
        description: 'Semantic cache & firewall',
      },
      {
        href: '/documents',
        label: 'Script & Catalog Knowledge',
        icon: FileText,
        description: 'Vector embeddings & RAG',
      },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [ticketCount, setTicketCount] = useState<number>(0)
  const [hasActiveOrder, setHasActiveOrder] = useState<boolean>(false)

  useEffect(() => {
    // 1. Initial fetch
    fetch(`${API_BASE}/api/v1/tickets`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setTicketCount(data.length)
      })
      .catch(() => {})

    fetch(`${API_BASE}/api/v1/concessions/orders`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const active = data.some((o: any) => o.status === 'PREPARING' || o.status === 'READY')
          setHasActiveOrder(active)
        }
      })
      .catch(() => {})

    // 2. SSE Listeners for real-time badge updates
    let seatSource: EventSource | null = null
    let orderSource: EventSource | null = null

    try {
      seatSource = new EventSource(`${API_BASE}/api/v1/tickets/seats/stream`)
      seatSource.addEventListener('seat-update', (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (payload?.event === 'TICKET_ISSUED') {
            setTicketCount((prev) => prev + 1)
          }
        } catch {}
      })
    } catch {}

    try {
      orderSource = new EventSource(`${API_BASE}/api/v1/concessions/orders/stream`)
      orderSource.addEventListener('order-update', (e) => {
        try {
          const order = JSON.parse(e.data)
          if (order) {
            setHasActiveOrder(order.status === 'PREPARING' || order.status === 'READY')
          }
        } catch {}
      })
    } catch {}

    return () => {
      if (seatSource) seatSource.close()
      if (orderSource) orderSource.close()
    }
  }, [])

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col"
      style={{
        backgroundColor: '#111111',
        borderRight: '1px solid #1f1f1f',
      }}
    >
      {/* Brand Logo */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ borderBottom: '1px solid #1f1f1f' }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl shadow-lg"
          style={{ backgroundColor: '#7c3aed', boxShadow: '0 0 16px #7c3aed66' }}
        >
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white">
              CineMind
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: '#7c3aed' }}
            >
              AI
            </span>
          </div>
          <p className="text-[10px] text-[#555] font-mono mt-0.5">Enterprise Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#666]">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all duration-150',
                        isActive
                          ? 'text-white'
                          : 'text-[#888] hover:bg-[#181818] hover:text-white',
                      )}
                      style={
                        isActive
                          ? {
                              backgroundColor: '#7c3aed20',
                              border: '1px solid #7c3aed55',
                            }
                          : undefined
                      }
                    >
                      <div
                        className={clsx(
                          'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                          isActive
                            ? 'bg-[#7c3aed] text-white shadow'
                            : 'bg-[#1a1a1a] text-[#666] group-hover:text-white',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={clsx(
                              'truncate font-semibold',
                              isActive ? 'text-white' : '',
                            )}
                          >
                            {item.label}
                          </p>
                          {item.href === '/tickets' && ticketCount > 0 ? (
                            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                              {ticketCount} PASS{ticketCount > 1 ? 'ES' : ''}
                            </span>
                          ) : item.href === '/concessions' && hasActiveOrder ? (
                            <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> KITCHEN
                            </span>
                          ) : item.badge ? (
                            <span className="rounded bg-gradient-to-r from-purple-500 to-indigo-500 px-1.5 py-0.2 text-[9px] font-bold text-white shadow-sm">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-[#555] group-hover:text-[#777]">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1f1f1f] space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-[#0a0a0a] p-3 border border-[#1a1a1a]">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7c3aed22]">
            <Zap className="h-3.5 w-3.5 text-[#a78bfa]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-200 truncate">Circuit Mesh Active</p>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-[#666] truncate font-mono">88.4% Occupancy • SSE</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
