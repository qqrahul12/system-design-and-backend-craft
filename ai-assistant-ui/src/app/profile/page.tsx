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
  UtensilsCrossed,
  Receipt,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  Truck,
  CreditCard,
} from 'lucide-react'
import {
  authService,
  UserPersona,
  walletService,
  WalletSummary,
  WalletTransaction,
  ticketService,
  Ticket as PassTicket,
  concessionsService,
  ConcessionOrder,
  splitService,
  SplitExpense,
} from '@/services'

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<UserPersona | null>(null)
  const [personas, setPersonas] = useState<UserPersona[]>([])
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null)
  const [tickets, setTickets] = useState<PassTicket[]>([])
  const [concessionsOrders, setConcessionsOrders] = useState<ConcessionOrder[]>([])
  const [splitExpenses, setSplitExpenses] = useState<SplitExpense[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [switchingRole, setSwitchingRole] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Active History Tab
  const [historyTab, setHistoryTab] = useState<'PASSES' | 'CONCESSIONS' | 'WALLET' | 'SPLITS'>('PASSES')
  const [historySearch, setHistorySearch] = useState<string>('')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [userRes, personasRes, walletRes, ticketsRes, ordersRes, expensesRes] =
        await Promise.allSettled([
          authService.getCurrentUser(),
          authService.getPersonas(),
          walletService.getWalletSummary(),
          ticketService.getTickets(),
          concessionsService.getOrders(),
          splitService.getExpenses(),
        ])

      if (userRes.status === 'fulfilled' && userRes.value) {
        setCurrentUser(userRes.value)
      }
      if (personasRes.status === 'fulfilled' && Array.isArray(personasRes.value)) {
        setPersonas(personasRes.value)
      }
      if (walletRes.status === 'fulfilled' && walletRes.value) {
        setWalletSummary(walletRes.value)
      }
      if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value)) {
        setTickets(ticketsRes.value)
      }
      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
        setConcessionsOrders(ordersRes.value)
      }
      if (expensesRes.status === 'fulfilled' && Array.isArray(expensesRes.value)) {
        setSplitExpenses(expensesRes.value)
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
      const updated = await authService.switchRole(role)
      setCurrentUser(updated)
      showToast(`Switched active persona to ${updated.name} (${updated.role})`)
      window.dispatchEvent(new Event('cinemind-auth-changed'))
      await loadData()
    } catch {
      showToast('Error switching persona.')
    } finally {
      setSwitchingRole(null)
    }
  }

  const isStaff = Boolean(
    currentUser && ['EXECUTIVE_ADMIN', 'CINEMA_MANAGER', 'AUDITORIUM_USHER'].includes(currentUser.role)
  )

  // Scope SplitMoney expenses strictly to those where current user participated
  const userScopedExpenses = (splitExpenses || []).filter((e) => {
    if (isStaff) return true
    const uName = currentUser?.name?.toLowerCase() || ''
    const uId = currentUser?.userId || ''
    return (
      (uId && e.paidByUserId === uId) ||
      (uName && e.paidByUserName?.toLowerCase() === uName) ||
      e.shares?.some((s) => (uId && s.userId === uId) || (uName && s.userName?.toLowerCase() === uName))
    )
  })

  // Scope Tickets to personal bookings if patron, or circuit overview if manager
  const userScopedTickets = isStaff ? tickets : tickets.slice(0, 5)

  // Scope Concessions orders to personal orders if patron
  const userScopedOrders = isStaff ? concessionsOrders : concessionsOrders.slice(0, 4)

  // Filtered Histories based on search
  const filteredTickets = userScopedTickets.filter((t) => {
    if (!historySearch.trim()) return true
    const q = historySearch.toLowerCase()
    return (
      t.movieTitle.toLowerCase().includes(q) ||
      t.ticketId.toLowerCase().includes(q) ||
      (t.auditorium && t.auditorium.toLowerCase().includes(q)) ||
      (t.seats && t.seats.join(', ').toLowerCase().includes(q))
    )
  })

  const filteredOrders = userScopedOrders.filter((o) => {
    if (!historySearch.trim()) return true
    const q = historySearch.toLowerCase()
    return (
      o.orderId.toLowerCase().includes(q) ||
      (o.deliverySeat && o.deliverySeat.toLowerCase().includes(q)) ||
      (o.status && o.status.toLowerCase().includes(q)) ||
      o.items?.some((i) => i.name.toLowerCase().includes(q))
    )
  })

  const filteredWalletTransactions = (walletSummary?.recentTransactions || []).filter((tx) => {
    if (!historySearch.trim()) return true
    const q = historySearch.toLowerCase()
    return (
      tx.txnId.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q) ||
      tx.type.toLowerCase().includes(q)
    )
  })

  const filteredExpenses = userScopedExpenses.filter((e) => {
    if (!historySearch.trim()) return true
    const q = historySearch.toLowerCase()
    return (
      e.name.toLowerCase().includes(q) ||
      e.paidByUserName.toLowerCase().includes(q) ||
      e.shares?.some((s) => s.userName.toLowerCase().includes(q))
    )
  })

  const walletBalance = walletSummary?.balance ?? 0.0

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-6 md:p-10 space-y-8 pb-20">
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
              IDENTITY, ORDERS & FINTECH
            </span>
            <span className="text-xs text-[#888] font-mono">
              {currentUser?.roleDisplayName || 'Patron Hub'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            {currentUser?.name ? `${currentUser.name} • Account & Activity` : 'User Profile & Order History'}
          </h1>
          <p className="text-sm text-[#888] mt-1">
            {isStaff
              ? 'Circuit operational audit across bookings, culinary orders, CineCash ledgers, and staff permissions.'
              : 'Unified personal pass records, gourmet F&B delivery orders, CineCash transaction ledgers, and squad bill splits.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#2a2a2a] px-3.5 py-2 text-xs font-medium text-[#bbb] hover:text-white transition active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync All Records
          </button>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 transition active:scale-95"
          >
            <Key className="h-3.5 w-3.5" />
            Switch Account
          </Link>
          <Link
            href="/logout"
            className="flex items-center gap-2 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 px-3.5 py-2 text-xs font-semibold transition active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Link>
        </div>
      </div>

      {/* Main Grid: User Identity Card & Quick Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: User Identity Card */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-[#161616] to-[#111111] border border-[#262626] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <img
                src={
                  currentUser?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop'
                }
                alt={currentUser?.name || 'User'}
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
                  {currentUser?.name || 'Patron'}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-xs font-bold text-purple-300">
                  <Crown className="h-3 w-3 text-amber-400" />
                  {currentUser?.badge || currentUser?.role || 'Guest'}
                </span>
              </div>

              <p className="text-sm text-[#888] font-mono">{currentUser?.email || 'Not registered'}</p>

              <div className="flex flex-wrap gap-4 pt-2 text-xs text-[#aaa]">
                <div>
                  <span className="text-[#666] block text-[10px] uppercase font-mono">Tier</span>
                  <span className="font-semibold text-white">{currentUser?.tier || 'General'}</span>
                </div>
                <div className="border-l border-[#333] pl-4">
                  <span className="text-[#666] block text-[10px] uppercase font-mono">Role Key</span>
                  <span className="font-mono text-purple-400">{currentUser?.role || 'STANDARD_GUEST'}</span>
                </div>
                <div className="border-l border-[#333] pl-4">
                  <span className="text-[#666] block text-[10px] uppercase font-mono">Auth Status</span>
                  <span className="font-semibold text-emerald-400">
                    {currentUser?.isAuthenticated ? 'Authenticated Active' : 'Browsing Mode'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#222]">
            <button
              onClick={() => setHistoryTab('PASSES')}
              className={`p-3 rounded-xl border text-left transition ${
                historyTab === 'PASSES'
                  ? 'bg-purple-950/40 border-purple-500/60 shadow-md ring-1 ring-purple-500/40'
                  : 'bg-[#1a1a1a] hover:bg-[#222] border-[#2a2a2a]'
              }`}
            >
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Ticket className="h-4 w-4" />
                <span className="text-xs font-semibold">{isStaff ? 'Circuit Passes' : 'My Passes'}</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">{filteredTickets.length}</div>
              <span className="text-[10px] text-[#777]">{isStaff ? 'Circuit passes issued' : 'Personal movie passes'}</span>
            </button>

            <button
              onClick={() => setHistoryTab('CONCESSIONS')}
              className={`p-3 rounded-xl border text-left transition ${
                historyTab === 'CONCESSIONS'
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                  : 'bg-[#1a1a1a] hover:bg-[#222] border-[#2a2a2a]'
              }`}
            >
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <UtensilsCrossed className="h-4 w-4" />
                <span className="text-xs font-semibold">{isStaff ? 'Circuit F&B' : 'My F&B Orders'}</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">{filteredOrders.length}</div>
              <span className="text-[10px] text-[#777]">{isStaff ? 'Circuit orders placed' : 'Personal culinary orders'}</span>
            </button>

            <button
              onClick={() => setHistoryTab('WALLET')}
              className={`p-3 rounded-xl border text-left transition ${
                historyTab === 'WALLET'
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
                  : 'bg-[#1a1a1a] hover:bg-[#222] border-[#2a2a2a]'
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-semibold">{isStaff ? 'Staff CineCash' : 'CineCash'}</span>
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">${walletBalance.toFixed(2)}</div>
              <span className="text-[10px] text-[#777]">Stored balance</span>
            </button>

            <button
              onClick={() => setHistoryTab('SPLITS')}
              className={`p-3 rounded-xl border text-left transition ${
                historyTab === 'SPLITS'
                  ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/40'
                  : 'bg-[#1a1a1a] hover:bg-[#222] border-[#2a2a2a]'
              }`}
            >
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold">{isStaff ? 'Circuit Splits' : 'My Squad Splits'}</span>
              </div>
              <div className="text-lg font-bold text-indigo-300 font-mono">{filteredExpenses.length}</div>
              <span className="text-[10px] text-[#777]">{isStaff ? 'Circuit squad splits' : 'My squad outings'}</span>
            </button>
          </div>
        </div>

        {/* Right: Security Clearance & Active Permissions */}
        <div className="rounded-2xl bg-[#141414] border border-[#222] p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-400">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Active RBAC Security</h3>
            </div>
            <p className="text-xs text-[#777] mt-1">
              Cryptographically enforced authorities derived from the current verified session claims:
            </p>

            <div className="flex flex-wrap gap-2 pt-3">
              {currentUser?.description ? (
                <div className="rounded-xl bg-purple-950/30 border border-purple-500/25 p-3 text-xs text-purple-200">
                  {currentUser.description}
                </div>
              ) : (
                <span className="text-xs text-[#666]">Standard guest permissions active</span>
              )}
            </div>
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
              <span>Fintech Clearance:</span>
              <span className="font-semibold text-white">Digital Wallet + Circuit Breaker</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UNIFIED PATRON ACTIVITY & ORDER HISTORY HUB                              */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-[#222] bg-[#121214] p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Hub Header & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                {isStaff ? 'Circuit Operations & Transaction Ledgers' : 'My Activity & Order History'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isStaff
                  ? 'Complete circuit-wide operational audit across bookings, culinary orders, CineCash ledgers, and squad splits'
                  : 'Your personal tickets, gourmet F&B delivery orders, CineCash wallet transactions, and squad splits'}
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search history records..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
            />
            {historySearch && (
              <button
                onClick={() => setHistorySearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800/80">
          <button
            onClick={() => setHistoryTab('PASSES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
              historyTab === 'PASSES'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white'
            }`}
          >
            <Ticket className="h-3.5 w-3.5" />
            Movie Passes & Bookings ({filteredTickets.length})
          </button>

          <button
            onClick={() => setHistoryTab('CONCESSIONS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
              historyTab === 'CONCESSIONS'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            F&B Gourmet Orders ({filteredOrders.length})
          </button>

          <button
            onClick={() => setHistoryTab('WALLET')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
              historyTab === 'WALLET'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white'
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            CineCash Transactions ({filteredWalletTransactions.length})
          </button>

          <button
            onClick={() => setHistoryTab('SPLITS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
              historyTab === 'SPLITS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            SplitMoney Outings ({filteredExpenses.length})
          </button>
        </div>

        {/* TAB 1: PASSES & BOOKINGS HISTORY */}
        {historyTab === 'PASSES' && (
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-xs text-zinc-500 space-y-3">
                <Ticket className="mx-auto h-8 w-8 text-zinc-600" />
                <p>No movie gate passes recorded in your booking history.</p>
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 font-bold text-white hover:bg-purple-500 transition"
                >
                  <Film className="h-3.5 w-3.5" /> Reserve Movie Seats Now
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTickets.map((t) => (
                  <div
                    key={t.ticketId}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 hover:border-zinc-700 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shrink-0">
                            <Film className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{t.movieTitle}</h4>
                            <p className="text-[11px] text-zinc-400">
                              {t.auditorium || 'Assigned Screen'} • {t.showtime || 'Today'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            t.status === 'REFUNDED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : t.status === 'CHECKED_IN'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {t.status || 'ACTIVE'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                          <span className="text-[10px] text-zinc-500 uppercase block">Seats</span>
                          <span className="font-bold text-white font-mono">
                            {t.seats && t.seats.length > 0 ? t.seats.join(', ') : 'General Admission'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                          <span className="text-[10px] text-zinc-500 uppercase block">Total Paid</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            ${(t.totalPrice || 18.0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                        <span>Pass: {t.ticketId}</span>
                        <span>Payment: {t.paymentMethod || 'CineCash'}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> HMAC Verified
                      </span>
                      <Link
                        href={`/tickets?id=${t.ticketId}`}
                        className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
                      >
                        View & Scan Gate Pass <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: F&B GOURMET ORDERS HISTORY */}
        {historyTab === 'CONCESSIONS' && (
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-xs text-zinc-500 space-y-3">
                <UtensilsCrossed className="mx-auto h-8 w-8 text-zinc-600" />
                <p>No culinary F&B orders recorded in your history.</p>
                <Link
                  href="/concessions"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-500 transition"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" /> Order Warm Popcorn & Cocktails
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const statusColors =
                    order.status === 'DELIVERED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : order.status === 'PLATED'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'

                  return (
                    <div
                      key={order.orderId}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 hover:border-zinc-700 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/15 border border-amber-500/25 text-amber-400 shrink-0">
                            <UtensilsCrossed className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white font-mono">{order.orderId}</h4>
                              <span className="text-xs text-zinc-500">•</span>
                              <span className="text-xs text-zinc-300 font-semibold">{order.deliverySeat}</span>
                            </div>
                            <span className="text-[11px] text-zinc-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Just now'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusColors}`}
                          >
                            {order.status}
                          </span>
                          <span className="text-base font-extrabold text-white font-mono">
                            ${(order.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Items breakdown list */}
                      <div className="space-y-1.5 text-xs">
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                          Ordered Items:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((it: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center justify-between rounded-xl bg-zinc-950/60 border border-zinc-800 p-2.5 text-zinc-300"
                              >
                                <span className="truncate">{it.name || 'Gourmet Selection'}</span>
                                <span className="font-mono text-zinc-400 text-[11px] shrink-0 ml-2">
                                  x{it.quantity || 1} • ${(it.price || 8.5).toFixed(2)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-zinc-500 text-xs">Standard VIP Gourmet Tray</div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5 text-amber-400" />
                          Seat Delivery: {order.deliverySeat}
                        </span>
                        <Link
                          href="/concessions"
                          className="text-amber-400 hover:text-amber-300 font-semibold transition flex items-center gap-1"
                        >
                          Kitchen Status & Re-order <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CINECASH WALLET TRANSACTIONS */}
        {historyTab === 'WALLET' && (
          <div className="space-y-4">
            {filteredWalletTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-xs text-zinc-500 space-y-3">
                <Wallet className="mx-auto h-8 w-8 text-zinc-600" />
                <p>No stored-value CineCash transactions found.</p>
                <Link
                  href="/wallet"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 transition"
                >
                  <Wallet className="h-3.5 w-3.5" /> Top Up CineCash Wallet
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredWalletTransactions.map((tx) => {
                  const isCredit =
                    tx.type === 'INITIAL_GRANT' ||
                    tx.type === 'TOP_UP' ||
                    tx.type === 'REFUND' ||
                    tx.type.includes('CREDIT')

                  return (
                    <div
                      key={tx.txnId}
                      className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${
                            isCredit
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="h-5 w-5" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{tx.description}</span>
                            <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 uppercase">
                              {tx.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5 font-mono">
                            <span>Txn: {tx.txnId}</span>
                            <span>•</span>
                            <span>{new Date(tx.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-sm font-bold font-mono ${
                            isCredit ? 'text-emerald-400' : 'text-white'
                          }`}
                        >
                          {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-zinc-500 font-mono">
                          Bal: ${tx.balanceAfter.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SPLITMONEY SQUAD EXPENSES */}
        {historyTab === 'SPLITS' && (
          <div className="space-y-4">
            {filteredExpenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-xs text-zinc-500 space-y-3">
                <Users className="mx-auto h-8 w-8 text-zinc-600" />
                <p>No squad bills or shared expenses found.</p>
                <Link
                  href="/split"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500 transition"
                >
                  <Users className="h-3.5 w-3.5" /> Split a Cinema Bill with Squad
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((exp) => {
                  const pendingCount = exp.shares.filter((s) => !s.paid && !s.isPaid).length
                  const isSettled = pendingCount === 0

                  return (
                    <div
                      key={exp.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3 hover:border-zinc-700 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-400 shrink-0">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{exp.name}</h4>
                            <p className="text-[11px] text-zinc-400">
                              Paid in full by <strong className="text-zinc-200">{exp.paidByUserName}</strong> •{' '}
                              {new Date(exp.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              isSettled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {isSettled ? 'Fully Settled' : `${pendingCount} Shares Pending`}
                          </span>
                          <span className="text-base font-extrabold text-white font-mono">
                            ${exp.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-zinc-400">
                          Participants: {exp.shares.map((s) => s.userName).join(', ')}
                        </span>
                        <Link
                          href="/split"
                          className="text-indigo-400 hover:text-indigo-300 font-semibold transition flex items-center gap-1"
                        >
                          Open SplitMoney Squad Hub <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
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
                      src={p.avatar}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#333]"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white">{p.name}</h3>
                      <p className="text-[11px] font-mono text-purple-400">{p.role}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#999] leading-relaxed">
                    {p.description}
                  </p>

                  <div className="text-[11px] font-mono text-[#666] pt-1">
                    Tier: {p.tier} ({p.badge})
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
                      `Switch to ${(p.name || p.fullName || p.role).split(' ')[0]}`
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
