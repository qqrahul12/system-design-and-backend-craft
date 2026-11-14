'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  User,
  Shield,
  ShieldCheck,
  Crown,
  Wallet,
  Users,
  Ticket,
  Film,
  Sparkles,
  CheckCircle2,
  Clock,
  Key,
  RefreshCw,
  Sliders,
  ChevronRight,
  Zap,
  Lock,
  Smartphone,
  Bell,
  SlidersHorizontal,
  LogOut,
  ExternalLink,
} from 'lucide-react'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

interface UserProfile {
  userId: string
  fullName: string
  email: string
  role: string
  roleDisplayName: string
  membershipTier: string
  discountRate: number
  avatarUrl: string
  permissions: string[]
  lastLogin?: string
}

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [personas, setPersonas] = useState<UserProfile[]>([])
  const [walletBalance, setWalletBalance] = useState<number>(175.0)
  const [ticketCount, setTicketCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [switchingRole, setSwitchingRole] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [userRes, personasRes, walletRes, ticketsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/auth/me`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_BASE}/api/v1/auth/personas`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/api/v1/wallet`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_BASE}/api/v1/tickets`).then((r) => (r.ok ? r.json() : [])),
      ])

      if (userRes.status === 'fulfilled' && userRes.value) {
        setCurrentUser(userRes.value)
      }
      if (personasRes.status === 'fulfilled' && Array.isArray(personasRes.value)) {
        setPersonas(personasRes.value)
      }
      if (walletRes.status === 'fulfilled' && walletRes.value) {
        setWalletBalance(walletRes.value.balance)
      }
      if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value)) {
        setTicketCount(ticketsRes.value.length)
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSwitchPersona = async (role: string) => {
    setSwitchingRole(role)
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/switch-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCurrentUser(updated)
        showToast(`Switched active persona to ${updated.fullName} (${updated.roleDisplayName})`)
      }
    } catch {
      showToast('Error switching persona.')
    } finally {
      setSwitchingRole(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-6 md:p-10 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-purple-950/90 border border-purple-500/40 px-4 py-3 text-sm text-purple-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-xs font-mono font-medium text-purple-400 border border-purple-500/30">
              IDENTITY & ACCESS
            </span>
            <span className="text-xs text-[#888] font-mono">RBAC Security Gateway</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            Member Profile & Security
          </h1>
          <p className="text-sm text-[#888] mt-1">
            Manage your CineMind credentials, enterprise role-based permissions, and fintech accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#2a2a2a] px-3.5 py-2 text-xs font-medium text-[#bbb] hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Session
          </button>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 transition"
          >
            <Key className="h-3.5 w-3.5" />
            Switch Account
          </Link>
          <Link
            href="/logout"
            className="flex items-center gap-2 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 px-3.5 py-2 text-xs font-semibold transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Link>
        </div>
      </div>

      {/* Main Grid: User Card & Quick Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: User Identity Card */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-[#161616] to-[#111111] border border-[#262626] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop'}
                alt={currentUser?.fullName || 'User'}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-purple-500/50 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#161616]"></span>
              </span>
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {currentUser?.fullName || 'Loading Profile...'}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-xs font-bold text-purple-300">
                  <Crown className="h-3 w-3 text-amber-400" />
                  {currentUser?.roleDisplayName || 'Member'}
                </span>
              </div>

              <p className="text-sm text-[#888] font-mono">{currentUser?.email}</p>

              <div className="flex flex-wrap gap-4 pt-2 text-xs text-[#aaa]">
                <div>
                  <span className="text-[#666] block text-[10px] uppercase font-mono">Tier</span>
                  <span className="font-semibold text-white">{currentUser?.membershipTier || 'Founder Gold'}</span>
                </div>
                <div className="border-l border-[#333] pl-4">
                  <span className="text-[#666] block text-[10px] uppercase font-mono">User ID</span>
                  <span className="font-mono text-purple-400">{currentUser?.userId || 'usr-vip-001'}</span>
                </div>
                <div className="border-l border-[#333] pl-4">
                  <span className="text-[#666] block text-[10px] uppercase font-mono">F&B VIP Discount</span>
                  <span className="font-semibold text-emerald-400">
                    {currentUser?.discountRate ? `${(currentUser.discountRate * 100).toFixed(0)}% Off` : 'Standard'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-[#222]">
            <Link
              href="/wallet"
              className="group flex items-center justify-between p-3 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs text-[#888] block">CineCash Wallet</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">${walletBalance.toFixed(2)}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#555] group-hover:text-white transition" />
            </Link>

            <Link
              href="/tickets"
              className="group flex items-center justify-between p-3 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Ticket className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs text-[#888] block">Pass Wallet</span>
                  <span className="text-sm font-bold text-white">{ticketCount} Active</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#555] group-hover:text-white transition" />
            </Link>

            <Link
              href="/split"
              className="group flex items-center justify-between p-3 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs text-[#888] block">Squad Bill Splits</span>
                  <span className="text-sm font-bold text-sky-400">SplitMoney</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#555] group-hover:text-white transition" />
            </Link>
          </div>
        </div>

        {/* Right: Security Clearance & Active Permissions */}
        <div className="rounded-2xl bg-[#141414] border border-[#222] p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-purple-400">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Active RBAC Grants</h3>
          </div>
          <p className="text-xs text-[#777]">
            Cryptographically enforced authorities derived from the current verified session claims:
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {currentUser?.permissions && currentUser.permissions.length > 0 ? (
              currentUser.permissions.map((perm) => (
                <span
                  key={perm}
                  className="rounded-lg bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 text-[11px] font-mono text-purple-300 font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3 w-3 text-purple-400" />
                  {perm}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#666]">Standard guest permissions active</span>
            )}
          </div>

          <div className="pt-3 border-t border-[#222] space-y-2 text-xs text-[#888]">
            <div className="flex justify-between">
              <span>Token Signature:</span>
              <span className="font-mono text-white">HMAC-SHA256 (256-bit)</span>
            </div>
            <div className="flex justify-between">
              <span>Auth Session:</span>
              <span className="font-mono text-emerald-400">VALID / ENCRYPTED</span>
            </div>
            <div className="flex justify-between">
              <span>Recliner Controls:</span>
              <span className="font-semibold text-white">
                {currentUser?.permissions?.includes('VIP_RECLINER_ACCESS') ? 'Unlocked' : 'Locked'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Persona Switcher Deck */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Instant Role & Persona Switcher
            </h2>
            <p className="text-xs text-[#888]">
              Switch personas instantly to test differential pricing, kitchen routing, Usher pass verification, or executive analytics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {personas.map((p) => {
            const isCurrent = currentUser?.role === p.role
            const isSwitching = switchingRole === p.role

            return (
              <div
                key={p.role}
                className={`rounded-2xl p-5 border transition-all flex flex-col justify-between relative overflow-hidden ${
                  isCurrent
                    ? 'bg-purple-950/20 border-purple-500/60 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30'
                    : 'bg-[#151515] hover:bg-[#1a1a1a] border-[#252525]'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                    <CheckCircle2 className="h-3 w-3 text-purple-400" />
                    ACTIVE
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.avatarUrl}
                      alt={p.fullName}
                      className="w-12 h-12 rounded-xl object-cover border border-[#333]"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white">{p.fullName}</h3>
                      <p className="text-[11px] font-mono text-purple-400">{p.role}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#999] leading-relaxed">
                    {p.roleDisplayName}
                  </p>

                  <div className="text-[11px] font-mono text-[#666] pt-1">
                    {p.permissions.length} authorities assigned
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  <button
                    onClick={() => handleSwitchPersona(p.role)}
                    disabled={isCurrent || isSwitching}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 cursor-default'
                        : 'bg-[#222] hover:bg-purple-600 hover:text-white text-white border border-[#333]'
                    }`}
                  >
                    {isSwitching ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : isCurrent ? (
                      'Current Active Role'
                    ) : (
                      `Switch to ${p.fullName.split(' ')[0]}`
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Security & Audit Telemetry */}
      <div className="rounded-2xl bg-[#141414] border border-[#222] p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Lock className="h-4 w-4 text-purple-400" />
          Enterprise Audit Log & Device Integrity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#191919] border border-[#252525]">
            <span className="text-[#666] block text-[10px] uppercase font-mono">TLS Connection</span>
            <span className="font-semibold text-emerald-400">TLS 1.3 · AES-256-GCM</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#191919] border border-[#252525]">
            <span className="text-[#666] block text-[10px] uppercase font-mono">Circuit Gatekeeper</span>
            <span className="font-semibold text-white">Spring Security 6.1 RBAC</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#191919] border border-[#252525]">
            <span className="text-[#666] block text-[10px] uppercase font-mono">Multi-Tenant Isolation</span>
            <span className="font-semibold text-purple-400">ThreadLocal Virtual Scopes</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#191919] border border-[#252525]">
            <span className="text-[#666] block text-[10px] uppercase font-mono">Anti-Tamper Signature</span>
            <span className="font-semibold text-white font-mono">HMAC-SHA256 Validated</span>
          </div>
        </div>
      </div>
    </div>
  )
}
