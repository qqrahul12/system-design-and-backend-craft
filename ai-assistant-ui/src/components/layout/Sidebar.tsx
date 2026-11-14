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
  Wallet,
  CreditCard,
  UserCheck,
  ChevronDown,
  CheckCircle2,
  X,
  Plus,
  Users,
  User,
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
    title: 'Fintech & Social Hub',
    items: [
      {
        href: '/wallet',
        label: 'CineCash Digital Wallet',
        icon: Wallet,
        description: 'Instant top-up & cashback',
        badge: 'VIP',
      },
      {
        href: '/split',
        label: 'SplitMoney Squads',
        icon: Users,
        description: 'Group bill splitting & settle',
        badge: 'NEW',
      },
      {
        href: '/profile',
        label: 'Profile & RBAC Security',
        icon: User,
        description: 'Persona switch & permissions',
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
  const [currentUser, setCurrentUser] = useState<any>({
    fullName: 'Alex Vance',
    role: 'VIP_PATRON',
    roleDisplayName: 'Gold Lounge VIP Member',
    membershipTier: 'CineMind Founder Gold',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
  })
  const [walletBalance, setWalletBalance] = useState<number>(175.00)
  const [personas, setPersonas] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isTopUpLoading, setIsTopUpLoading] = useState<boolean>(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [circuitOccupancy, setCircuitOccupancy] = useState<number | null>(null)

  const fetchAuthAndWallet = async () => {
    try {
      const authRes = await fetch(`${API_BASE}/api/v1/auth/me`)
      if (authRes.ok) {
        const u = await authRes.json()
        setCurrentUser(u)
      }
      const personasRes = await fetch(`${API_BASE}/api/v1/auth/personas`)
      if (personasRes.ok) {
        const p = await personasRes.json()
        setPersonas(p)
      }
      const walletRes = await fetch(`${API_BASE}/api/v1/wallet`)
      if (walletRes.ok) {
        const w = await walletRes.json()
        setWalletBalance(w.balance)
      }
      const analyticsRes = await fetch(`${API_BASE}/api/v1/admin/analytics/dashboard`)
      if (analyticsRes.ok) {
        const a = await analyticsRes.json()
        if (a?.kpis?.circuitOccupancyRate) {
          setCircuitOccupancy(a.kpis.circuitOccupancyRate)
        }
      }
    } catch {}
  }

  useEffect(() => {
    fetchAuthAndWallet()

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
            fetch(`${API_BASE}/api/v1/wallet`)
              .then((r) => (r.ok ? r.json() : null))
              .then((w) => { if (w) setWalletBalance(w.balance) })
              .catch(() => {})
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

  const handleRoleSwitch = async (roleName: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/switch-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleName }),
      })
      if (res.ok) {
        const u = await res.json()
        setCurrentUser(u)
        setNotice(`Switched persona to ${u.fullName} (${u.roleDisplayName})`)
        setTimeout(() => setNotice(null), 3000)
      }
    } catch {}
  }

  const handleWalletTopUp = async (amount: number) => {
    setIsTopUpLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/wallet/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, paymentMethod: 'Stripe Instant ACH / Card' }),
      })
      if (res.ok) {
        const txn = await res.json()
        setWalletBalance(txn.balanceAfter)
        setNotice(`Added $${amount.toFixed(2)} to CineMind Wallet!`)
        setTimeout(() => setNotice(null), 3000)
      }
    } catch {} finally {
      setIsTopUpLoading(false)
    }
  }

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

      {/* User Persona & Fintech Wallet Pod */}
      <div className="px-3 py-2.5 border-b border-[#1f1f1f]">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#242424] transition text-left group shadow-sm"
          title="Click to switch active role or top up wallet"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop'}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover border border-purple-500/40"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {currentUser?.fullName}
              </p>
              <p className="text-[10px] text-purple-400 font-mono truncate">
                {currentUser?.role === 'VIP_PATRON' ? '👑 VIP Member'
                  : currentUser?.role === 'EXECUTIVE_ADMIN' ? '🛡️ Director'
                  : currentUser?.role === 'AUDITORIUM_USHER' ? '🎟️ Floor Usher'
                  : '👤 Guest'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-mono font-bold text-emerald-400 block">
              ${walletBalance.toFixed(2)}
            </span>
            <span className="text-[9px] text-[#666] font-mono">Wallet</span>
          </div>
        </button>
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
            <p className="text-[10px] text-[#666] truncate font-mono">
              {circuitOccupancy !== null ? `${circuitOccupancy.toFixed(1)}% Occupancy • SSE` : 'Circuit Live • SSE'}
            </p>
          </div>
        </div>
      </div>
      {/* Toast Notification */}
      {notice && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/95 px-4 py-2.5 text-xs text-purple-200 shadow-2xl backdrop-blur-md animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-purple-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Role Switcher & Fintech Wallet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#141414] p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Auth Role & Fintech Wallet Hub</h3>
                  <p className="text-xs text-zinc-400">Switch personas or reload stored-value CineCash</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Fintech Digital Wallet Card */}
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-zinc-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">CineMind Fintech Digital Wallet</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Active Stored Value
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-mono font-extrabold text-white">
                    ${walletBalance.toFixed(2)}
                  </span>
                  <span className="text-xs text-zinc-400 ml-1.5 font-mono">USD</span>
                </div>
                <span className="text-xs text-zinc-400 font-mono">1-Click Booking Ready</span>
              </div>

              {/* Instant Top-Up Options */}
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 font-semibold">Quick Reload:</span>
                {[25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleWalletTopUp(amt)}
                    disabled={isTopUpLoading}
                    className="flex-1 py-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition disabled:opacity-50"
                  >
                    +${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Persona Switcher */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Select Active Authenticated Persona
                </h4>
                <span className="text-[10px] text-purple-400 font-mono">Instant RBAC Switch</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    role: 'VIP_PATRON',
                    title: 'Alex Vance',
                    badge: '👑 VIP Patron',
                    desc: '20% F&B discount, heated recliners, stored wallet',
                  },
                  {
                    role: 'EXECUTIVE_ADMIN',
                    title: 'Marcus Kane',
                    badge: '🛡️ Circuit Director',
                    desc: 'Executive Studio, Dynamic Yield surge, APM traces',
                  },
                  {
                    role: 'AUDITORIUM_USHER',
                    title: 'Sarah Jenkins',
                    badge: '🎟️ Floor Usher',
                    desc: 'Optical Turnstile Gate scan, Wayfinder, expediter',
                  },
                  {
                    role: 'STANDARD_GUEST',
                    title: 'Jordan Lee',
                    badge: '👤 Guest Patron',
                    desc: 'Standard catalog, mobile ticketing, concessions',
                  },
                ].map((p) => {
                  const isCurrent = currentUser?.role === p.role
                  return (
                    <button
                      key={p.role}
                      onClick={() => handleRoleSwitch(p.role)}
                      className={`p-3 rounded-xl border text-left transition ${
                        isCurrent
                          ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{p.title}</span>
                        <span className="text-[10px] font-mono text-purple-300 font-semibold">{p.badge}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{p.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
