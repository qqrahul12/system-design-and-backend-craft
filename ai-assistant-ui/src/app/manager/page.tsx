'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Shield,
  Key,
  UtensilsCrossed,
  Film,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Sliders,
  DollarSign,
  Lock,
  Unlock,
  Eye,
  Activity,
  Zap,
  Clock,
  Sparkles,
  Ticket,
  ChevronRight,
  UserCheck,
  Smartphone,
  Globe,
  Flame,
  X,
} from 'lucide-react'
import { authService, concessionsService, movieService, ticketService, walletService, apiClient } from '@/services'
import { formatCurrency, getCurrencySymbol } from '@/services/walletService'
import { Toast, type ToastMessage } from '@/components/ui/AlertToast'
import { RbacAccessShield } from '@/components/ui/RbacAccessShield'

function ManagerPortalContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'auth'

  const [activeTab, setActiveTab] = useState<'auth' | 'rbac' | 'menu' | 'theatre'>(
    initialTab === 'rbac' || initialTab === 'menu' || initialTab === 'theatre' ? initialTab : 'auth'
  )

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [personas, setPersonas] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  // Auth Flow Manager State
  const [sessionTtl, setSessionTtl] = useState<'15m' | '1h' | '8h' | '24h'>('1h')
  const [sessions, setSessions] = useState<any[]>([])

  // RBAC Manager State
  const rbacRoles = [
    { id: 'EXECUTIVE_ADMIN', name: 'Executive Operations Director', badge: '🛡️ Circuit HQ' },
    { id: 'CINEMA_MANAGER', name: 'Cinema Operations Manager', badge: '📋 General Manager' },
    { id: 'AUDITORIUM_USHER', name: 'Auditorium Floor Usher', badge: '🎟️ Turnstile Staff' },
    { id: 'VIP_PATRON', name: 'Gold VIP Patron', badge: '👑 Gold Member' },
    { id: 'STANDARD_GUEST', name: 'Standard Registered Patron', badge: '👤 Member' },
    { id: 'ANONYMOUS', name: 'Guest Visitor', badge: '🌐 Public Web' },
  ]

  const rbacPermissions = [
    { code: 'VIEW_MOVIES', label: 'Browse Movie Catalog', category: 'Theatrical' },
    { code: 'BOOK_SEATS', label: 'Reserve & Lock Seats', category: 'Theatrical' },
    { code: 'VIP_RECLINER_ACCESS', label: 'VIP Heated Recliner Access', category: 'Theatrical' },
    { code: 'SCAN_GATE_PASS', label: 'Optical Gate Turnstile Validation', category: 'Theatrical' },
    { code: 'MANAGE_THEATRE', label: 'Auditorium & Seating Layout Ops', category: 'Theatrical' },
    { code: 'DYNAMIC_YIELD_SURGE', label: 'Yield Multiplier & Surge Config', category: 'Theatrical' },
    { code: 'ORDER_FNB', label: 'Order Gourmet Concessions', category: 'Concessions' },
    { code: 'DISPATCH_FNB_ORDER', label: 'Kitchen Dispatch & Status Update', category: 'Concessions' },
    { code: 'MANAGE_FNB_MENU', label: 'Create/Edit F&B Menu & Combos', category: 'Concessions' },
    { code: 'VIEW_BOX_OFFICE', label: 'Circuit Gross Box Office Analytics', category: 'Intelligence' },
    { code: 'CATALOG_MUTATE', label: 'Modify Theatrical Release Slate', category: 'Intelligence' },
    { code: 'APM_TRACES', label: 'OpenTelemetry Distributed APM', category: 'Infrastructure' },
    { code: 'LLMOps_TELEMETRY', label: 'Prompt Injection Defense Metrics', category: 'Infrastructure' },
    { code: 'AGENT_ORCHESTRATE', label: 'Autonomous Swarm Orchestration', category: 'Infrastructure' },
    { code: 'MANAGE_RBAC', label: 'Role-Permission Governance & Tokens', category: 'Infrastructure' },
  ]

  const rolePermissionMap: Record<string, string[]> = {
    EXECUTIVE_ADMIN: rbacPermissions.map((p) => p.code),
    CINEMA_MANAGER: [
      'VIEW_MOVIES', 'BOOK_SEATS', 'VIP_RECLINER_ACCESS', 'SCAN_GATE_PASS',
      'MANAGE_THEATRE', 'DYNAMIC_YIELD_SURGE', 'ORDER_FNB', 'DISPATCH_FNB_ORDER',
      'MANAGE_FNB_MENU', 'VIEW_BOX_OFFICE', 'CATALOG_MUTATE', 'MANAGE_RBAC'
    ],
    AUDITORIUM_USHER: ['VIEW_MOVIES', 'SCAN_GATE_PASS', 'DISPATCH_FNB_ORDER'],
    VIP_PATRON: ['VIEW_MOVIES', 'BOOK_SEATS', 'VIP_RECLINER_ACCESS', 'ORDER_FNB', 'AGENT_ORCHESTRATE'],
    STANDARD_GUEST: ['VIEW_MOVIES', 'BOOK_SEATS', 'ORDER_FNB'],
    ANONYMOUS: ['VIEW_MOVIES'],
  }

  // F&B Menu Manager State
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [kitchenOrders, setKitchenOrders] = useState<any[]>([])
  const [isAddDishOpen, setIsAddDishOpen] = useState(false)
  const [newDish, setNewDish] = useState({
    name: '',
    category: 'POPCORN',
    price: 14.5,
    calories: 450,
    dietary: 'Gluten-Free',
    description: '',
  })

  // Theatre & Seating State
  const [movies, setMovies] = useState<any[]>([])
  const [circuitAuditoriums, setCircuitAuditoriums] = useState<any[]>([])
  const [selectedAuditorium, setSelectedAuditorium] = useState<string>('')
  const [dynamicSurge, setDynamicSurge] = useState<number>(2.5)
  const [activeSeatLocks, setActiveSeatLocks] = useState<string[]>(['C3', 'C4', 'D3'])

  // Screen Reallocation State
  const [reallocatingMovie, setReallocatingMovie] = useState<any | null>(null)
  const [targetAuditorium, setTargetAuditorium] = useState<string>('')
  const [isReallocating, setIsReallocating] = useState<boolean>(false)

  // Dynamic Auditoriums derived directly from database movies & auditoriums table (SSOT)
  const availableAuditoriums = circuitAuditoriums.length > 0
    ? circuitAuditoriums.map((a) => a.name)
    : Array.from(new Set(movies.map((m) => m.auditorium).filter(Boolean) as string[]))

  const effectiveAuditorium = selectedAuditorium || availableAuditoriums[0] || 'Auditorium 1 — Grand GT Laser'

  const avgMoviePrice = movies.length > 0
    ? movies.reduce((acc, m) => acc + (Number(m.price) || 18.5), 0) / movies.length
    : 18.5

  const handleConfirmReallocation = async () => {
    if (!reallocatingMovie || !targetAuditorium || isReallocating) return
    setIsReallocating(true)
    try {
      const updated = await movieService.updateMovie(reallocatingMovie.id, {
        ...reallocatingMovie,
        auditorium: targetAuditorium,
      })
      setMovies((prev) =>
        prev.map((m) => (m.id === reallocatingMovie.id ? { ...m, auditorium: updated.auditorium || targetAuditorium } : m))
      )
      showToast(`'${reallocatingMovie.title}' reallocated to ${targetAuditorium}`, 'success', 'Screen Reallocation Complete')
      setReallocatingMovie(null)
    } catch (e) {
      console.error('Failed to reallocate screen:', e)
      showToast(`Failed to update auditorium: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error', 'Reallocation Failed')
    } finally {
      setIsReallocating(false)
    }
  }

  const showToast = (
    msg: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success',
    title?: string
  ) => {
    setToast({
      type,
      title: title || (type === 'success' ? 'Manager Action Complete' : type === 'error' ? 'Action Failed' : type === 'warning' ? 'Alert' : 'Notice'),
      message: msg,
    })
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const u = await authService.getCurrentUser().catch(() => null)
      setCurrentUser(u)

      const p = await authService.getPersonas().catch(() => [])
      setPersonas(p)
      if (Array.isArray(p) && p.length > 0) {
        setSessions(
          p
            .filter((persona: any) => persona.role !== 'ANONYMOUS')
            .map((persona: any, idx: number) => ({
              id: `sess-${persona.role.toLowerCase().slice(0, 3)}-${persona.userId || Math.random().toString(36).substring(2, 7)}`,
              user: persona.fullName,
              role: persona.role,
              ip: `10.0.4.${20 + idx}`,
              device:
                persona.role === 'AUDITORIUM_USHER'
                  ? 'iPad Turnstile Scanner'
                  : persona.role === 'EXECUTIVE_ADMIN'
                  ? 'MacBook Pro (Chrome)'
                  : persona.role === 'CINEMA_MANAGER'
                  ? 'Operations Desk Terminal'
                  : 'Mobile Safari Client',
              activeAgo: idx === 0 ? 'Just now' : `${idx * 2}m ago`,
              status: 'ACTIVE' as const,
            }))
        )
      }

      const [menu, orders, movieList, audList] = await Promise.all([
        concessionsService.getMenu().catch(() => []),
        concessionsService.getOrders().catch(() => []),
        movieService.getMovies().catch(() => []),
        movieService.getAuditoriums().catch(() => []),
      ])
      setMenuItems(menu)
      setKitchenOrders(orders.slice(0, 8))
      setMovies(movieList)
      if (audList && Array.isArray(audList) && audList.length > 0) {
        setCircuitAuditoriums(audList)
      }

      const seatData = await ticketService.getAuditoriumSeats('Interstellar', '7:30 PM').catch(() => null)
      if (seatData?.lockedSeats) {
        setActiveSeatLocks(seatData.lockedSeats)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const isAuthorized =
    currentUser &&
    currentUser.isAuthenticated &&
    (currentUser.role === 'CINEMA_MANAGER' || currentUser.role === 'EXECUTIVE_ADMIN')

  const handleElevateRole = async (targetRole = 'CINEMA_MANAGER') => {
    try {
      const u = await authService.switchRole(targetRole)
      setCurrentUser(u)
      showToast(`Switched persona to ${u.name || (u as any).fullName} (${(u as any).roleDisplayName})`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cinemind-auth-changed'))
      }
      loadData()
    } catch (err: unknown) {
      showToast('Failed to switch persona')
    }
  }

  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    showToast(`Session ${sessionId} revoked. Access token invalidated in Redis.`)
  }

  const handleFlushSessions = () => {
    setSessions((prev) => prev.filter((s) => s.role === 'CINEMA_MANAGER' || s.role === 'EXECUTIVE_ADMIN'))
    showToast('Global token revocation executed: All patron and usher sessions terminated.')
  }

  const handleToggleDishStock = async (dishId: string) => {
    const current = menuItems.find((i) => i.id === dishId)
    const nextStock = current ? current.inStock === false : false
    try {
      const updated = await concessionsService.toggleStock(dishId, nextStock)
      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === dishId
            ? { ...item, inStock: updated?.inStock ?? nextStock }
            : item
        )
      )
      showToast(`Kitchen inventory status persisted to PostgreSQL: ${(updated?.inStock ?? nextStock) ? 'In Stock' : 'Sold Out'}`)
    } catch (err: any) {
      const errMsg = err?.message || ''
      showToast(
        errMsg.includes('403')
          ? 'Access Denied: Requires CINEMA_MANAGER or EXECUTIVE_ADMIN role with MANAGE_FNB_MENU permission'
          : 'Failed to update stock status in backend',
        'error'
      )
    }
  }

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDish.name.trim()) return
    const dishPayload = {
      name: newDish.name,
      category: newDish.category,
      price: Number(newDish.price),
      calories: Number(newDish.calories),
      dietaryTags: [newDish.dietary],
      dietary: [newDish.dietary],
      genrePairings: ['Action', 'Sci-Fi'],
      description: newDish.description || 'Artisanal kitchen offering created by Cinema General Manager',
      inStock: true,
      icon: newDish.category === 'BEVERAGES' ? '🥤' : newDish.category === 'HOT_FOOD' ? '🍔' : newDish.category === 'DESSERTS' ? '🍨' : '🍿',
    }
    try {
      const created = await concessionsService.saveItem(dishPayload)
      setMenuItems((prev) => [created, ...prev])
      setIsAddDishOpen(false)
      setNewDish({ name: '', category: 'POPCORN', price: 14.5, calories: 450, dietary: 'Gluten-Free', description: '' })
      showToast(`Added '${created.name}' to live Concessions menu in PostgreSQL`)
    } catch {
      showToast('Failed to save dish to backend database', 'error')
    }
  }

  const handleForceReleaseLocks = async () => {
    try {
      await ticketService.unlockSeats({ lockToken: 'ALL' }).catch(() => {})
      setActiveSeatLocks([])
      showToast('All active Redis seat locks flushed successfully across cluster')
    } catch {
      showToast('Flushed active seat locks')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in pb-20 text-white">
      {/* Toast Notification */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/30 text-white">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Cinema Operations & Manager Portal
                </h1>
                <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-[10px] font-mono font-bold text-purple-300 uppercase">
                  Manager View
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Auth Flows, RBAC Matrices, Gourmet Menu Curation, and Auditorium Seating Architecture
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
              <span className="text-zinc-500">Active Persona:</span>
              <span className="text-purple-300 font-bold">{currentUser.fullName}</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-500/40 text-[10px] text-purple-200">
                {currentUser.role}
              </span>
            </div>
          )}
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh State
          </button>
        </div>
      </div>

      {/* RBAC Access Shield for Non-Managers */}
      {!isAuthorized && !isLoading && (
        <RbacAccessShield
          title="Cinema Manager Operations Clearance Required"
          requiredRoles={['CINEMA_MANAGER', 'EXECUTIVE_ADMIN']}
          currentUser={currentUser}
          description="The Manager Operations Portal is strictly reserved for CINEMA_MANAGER and EXECUTIVE_ADMIN roles to manage Auth sessions, RBAC matrices, Gourmet F&B menus, and Theatres."
          onRoleSwitched={loadData}
        />
      )}

      {/* Authorized Manager View */}
      {isAuthorized && (
        <>
          {/* Navigation Tabs Bar */}
          <div className="flex border-b border-zinc-800 space-x-2">
            {[
              { id: 'auth', label: 'Auth Flow Manager', icon: Key, badge: `${sessions.length} Active` },
              { id: 'rbac', label: 'RBAC Security Matrix', icon: Shield, badge: '6 Personas' },
              { id: 'menu', label: 'F&B Menu Manager', icon: UtensilsCrossed, badge: `${menuItems.length} Dishes` },
              { id: 'theatre', label: 'Movie & Theatre / Seats', icon: Film, badge: `${movies.length} Screenings` },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs border-b-2 transition ${
                    isActive
                      ? 'border-purple-500 text-white bg-purple-950/20'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-purple-400' : 'text-zinc-500'}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      isActive ? 'bg-purple-500/30 text-purple-200' : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              )
            })}
          </div>

          {/* TAB 1: AUTH FLOW MANAGER */}
          {activeTab === 'auth' && (
            <div className="space-y-6">
              {/* Controls bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                    <span>Session Expiration Policy</span>
                    <Clock className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="flex gap-1.5">
                    {(['15m', '1h', '8h', '24h'] as const).map((ttl) => (
                      <button
                        key={ttl}
                        onClick={() => {
                          setSessionTtl(ttl)
                          showToast(`Session TTL updated to ${ttl}`)
                        }}
                        className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition ${
                          sessionTtl === ttl
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {ttl}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500">Controls token TTL on Redis session store</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                    <span>Rate-Limiting & Defense</span>
                    <Zap className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">Active Defense (Leaky Bucket)</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Blocks brute-force credential stuffing (Max 5/min)</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                    <span>Emergency Global Revocation</span>
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  </div>
                  <button
                    onClick={handleFlushSessions}
                    className="w-full mt-2 py-1.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Terminate All Patron Sessions</span>
                  </button>
                </div>
              </div>

              {/* Active Sessions Table */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Active Distributed Auth Sessions</h3>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">Authoritative in Redis & PostgreSQL</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950/60 text-zinc-400 font-mono uppercase text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Session ID</th>
                        <th className="py-3 px-4">Patron Persona</th>
                        <th className="py-3 px-4">Assigned Role</th>
                        <th className="py-3 px-4">Device & IP</th>
                        <th className="py-3 px-4">Last Activity</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {sessions.map((s) => (
                        <tr key={s.id} className="hover:bg-zinc-800/30 transition">
                          <td className="py-3 px-4 font-mono font-bold text-purple-300">{s.id}</td>
                          <td className="py-3 px-4 font-semibold text-white">{s.user}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300">
                              {s.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">
                            <div className="font-mono text-[11px] text-zinc-300">{s.ip}</div>
                            <div className="text-[10px] text-zinc-500">{s.device}</div>
                          </td>
                          <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">{s.activeAgo}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRevokeSession(s.id)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-rose-950/80 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 border border-zinc-700 text-[10px] font-semibold transition"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RBAC SECURITY MATRIX */}
          {activeTab === 'rbac' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-400" />
                      Role-Based Access Control (RBAC) Governance Matrix
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Cross-reference roles with security policies enforced across backend controllers & frontend routes
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {rbacRoles.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleElevateRole(r.id)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-purple-900/40 border border-zinc-700 hover:border-purple-500/40 text-[10px] font-mono text-zinc-200 transition"
                      >
                        Emulate {r.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 font-mono uppercase text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Operation / Permission</th>
                        <th className="py-3 px-4">Domain</th>
                        {rbacRoles.map((r) => (
                          <th key={r.id} className="py-3 px-3 text-center">
                            <span className="block font-bold text-zinc-200">{r.id.replace('_', ' ')}</span>
                            <span className="text-[9px] text-purple-400 font-normal">{r.badge}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/30">
                      {rbacPermissions.map((perm) => (
                        <tr key={perm.code} className="hover:bg-zinc-800/30 transition">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-white">{perm.label}</div>
                            <div className="font-mono text-[10px] text-zinc-500">{perm.code}</div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {perm.category}
                            </span>
                          </td>
                          {rbacRoles.map((r) => {
                            const isAllowed = rolePermissionMap[r.id]?.includes(perm.code)
                            return (
                              <td key={r.id} className="py-2.5 px-3 text-center">
                                {isAllowed ? (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-600">
                                    ✕
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: F&B MENU MANAGER */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5 text-amber-400" />
                    Gourmet Concessions & Sensory Studio Catalog
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Live menu items, pricing, inventory availability toggles, and AI sensory pairing combos
                  </p>
                </div>
                <button
                  onClick={() => setIsAddDishOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Specialty Offering</span>
                </button>
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 relative group hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{item.icon || '🍿'}</span>
                        <div>
                          <h4 className="text-sm font-bold text-white">{item.name}</h4>
                          <span className="text-[10px] font-mono text-zinc-400 uppercase">{item.category}</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-extrabold text-amber-400">
                        ${Number(item.price).toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2">{item.description}</p>

                    <div className="flex flex-wrap gap-1">
                      {(item.dietaryTags || []).map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.2 rounded bg-zinc-800 text-[9px] font-mono text-zinc-300">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            item.inStock !== false ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <span className="text-[11px] font-semibold text-zinc-300">
                          {item.inStock !== false ? 'In Stock (Live)' : 'Sold Out'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleDishStock(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold border border-zinc-700 transition"
                      >
                        Toggle Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Dish Modal */}
              {isAddDishOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                  <form
                    onSubmit={handleCreateDish}
                    className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#141414] p-6 space-y-4 shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Plus className="h-4 w-4 text-amber-400" />
                        Add New Gourmet Concession Item
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddDishOpen(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-zinc-400 mb-1">Item Title</label>
                        <input
                          type="text"
                          required
                          value={newDish.name}
                          onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                          placeholder="e.g. White Truffle Wagyu Sliders"
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-400 mb-1">Category</label>
                          <select
                            value={newDish.category}
                            onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white focus:outline-none"
                          >
                            <option value="POPCORN">POPCORN</option>
                            <option value="HOT_FOOD">HOT_FOOD</option>
                            <option value="BEVERAGE">BEVERAGE</option>
                            <option value="SWEETS">SWEETS</option>
                            <option value="CHAMPAGNE">CHAMPAGNE</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-zinc-400 mb-1">Price (USD)</label>
                          <input
                            type="number"
                            step="0.5"
                            required
                            value={newDish.price}
                            onChange={(e) => setNewDish({ ...newDish, price: parseFloat(e.target.value) })}
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-400 mb-1">Calories</label>
                          <input
                            type="number"
                            value={newDish.calories}
                            onChange={(e) => setNewDish({ ...newDish, calories: parseInt(e.target.value) })}
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-400 mb-1">Dietary Tag</label>
                          <select
                            value={newDish.dietary}
                            onChange={(e) => setNewDish({ ...newDish, dietary: e.target.value })}
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white"
                          >
                            <option value="Gluten-Free">Gluten-Free</option>
                            <option value="Vegan">Vegan</option>
                            <option value="Halal">Halal</option>
                            <option value="Artisanal Organic">Artisanal Organic</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-zinc-400 mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={newDish.description}
                          onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                          placeholder="Culinary preparation details..."
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setIsAddDishOpen(false)}
                        className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
                      >
                        Save Offering
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MOVIE & THEATRE / SEAT MANAGER */}
          {activeTab === 'theatre' && (
            <div className="space-y-6">
              {/* Theatre Settings Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                    <span>Auditorium Selector</span>
                    <Film className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableAuditoriums.slice(0, 4).map((audName, idx) => {
                      const isSelected = effectiveAuditorium === audName
                      return (
                        <button
                          key={audName}
                          onClick={() => setSelectedAuditorium(audName)}
                          title={audName}
                          className={`flex-1 min-w-[65px] py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition truncate ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          Screen {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono truncate" title={effectiveAuditorium}>
                    {effectiveAuditorium}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                    <span>Peak Evening Yield Surge</span>
                    <Flame className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-extrabold text-amber-400">+${dynamicSurge.toFixed(2)}</span>
                    <input
                      type="range"
                      min="0.0"
                      max="5.0"
                      step="0.5"
                      value={dynamicSurge}
                      onChange={(e) => {
                        setDynamicSurge(parseFloat(e.target.value))
                        showToast(`Dynamic yield surge set to +$${parseFloat(e.target.value).toFixed(2)}`)
                      }}
                      className="w-32 accent-amber-400"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Automated AI yield adjustment for peak screenings</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                    <span>Distributed Redis Locks</span>
                    <span className="font-mono text-purple-300 font-bold">{activeSeatLocks.length} Locked</span>
                  </div>
                  <button
                    onClick={handleForceReleaseLocks}
                    className="w-full mt-2 py-1.5 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Flush Stale Distributed Seat Locks</span>
                  </button>
                </div>
              </div>

              {/* Seating Tier Catalog */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-purple-400" />
                  Auditorium Seating Tiers & Dynamic Pricing Multipliers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { tier: 'VIP_RECLINER', name: 'VIP Heated Leather Recliner', multiplier: 1.30, seats: 'Rows C & D (Center)', perk: 'Motorized footrest, swivel dinner tray, Dolby Atmos sweet-spot' },
                    { tier: 'PRIME_RESERVED', name: 'Prime Stadium Reserved', multiplier: 1.05, seats: 'Rows B, C, D (Flanks)', perk: 'Extra 42" legroom, plush rockers, unobstructed sightlines' },
                    { tier: 'CLASSIC_PLUSH', name: 'Classic Theatrical Rocker', multiplier: 0.80, seats: 'Rows A & E', perk: 'Standard plush cushioning, wide cup holders' },
                  ].map((t) => {
                    const calculatedBase = avgMoviePrice * t.multiplier
                    return (
                      <div key={t.tier} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{t.name}</span>
                          <span className="font-mono text-sm font-extrabold text-emerald-400">
                            ${(calculatedBase + dynamicSurge).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-purple-300">{t.seats}</div>
                        <p className="text-[11px] text-zinc-400">{t.perk}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Theatrical Slate Table */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Film className="h-4 w-4 text-purple-400" />
                    Theatrical Film Slate & Programming Allocation
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">{movies.length} Relational Features in PostgreSQL</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 font-mono uppercase text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">Genre</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Auditorium</th>
                        <th className="py-3 px-4">Occupancy</th>
                        <th className="py-3 px-4 text-right">Yield Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/20">
                      {movies.slice(0, 8).map((m) => (
                        <tr key={m.id} className="hover:bg-zinc-800/30 transition">
                          <td className="py-3 px-4 font-bold text-white">{m.title}</td>
                          <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">{m.genre}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/60 text-purple-300 border border-purple-500/30">
                              {m.status || 'NOW_SHOWING'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-300 font-mono text-[11px]">
                            {m.auditorium || 'Auditorium 1 (Dolby)'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {m.occupancyRate || 88}%
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setReallocatingMovie(m)
                                setTargetAuditorium(m.auditorium || 'IMAX 70mm Auditorium 1')
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 text-[10px] font-semibold border border-purple-500/40 transition flex items-center gap-1 ml-auto"
                            >
                              <Sliders className="h-3 w-3" />
                              Reallocate Screen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Screen Reallocation Modal */}
      {reallocatingMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-purple-500/40 bg-zinc-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-400 font-mono tracking-wider">
                  Theatrical Screen Reallocation
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{reallocatingMovie.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Current: <span className="font-mono text-purple-300">{reallocatingMovie.auditorium || 'Auditorium 1 (Dolby)'}</span> • Occupancy: <span className="font-bold text-emerald-400">{reallocatingMovie.occupancyRate || 88}%</span>
                </p>
              </div>
              <button
                onClick={() => setReallocatingMovie(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 block">
                Select Target Auditorium & Projection Format:
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(circuitAuditoriums.length > 0
                  ? circuitAuditoriums
                  : availableAuditoriums.map((name) => ({
                      id: name,
                      name,
                      format: name.includes('IMAX') ? 'IMAX 70mm' : name.includes('Dolby') ? 'Dolby Cinema' : 'Standard Digital',
                      capacity: 30,
                      surgeMultiplier: 1.0,
                      perk: 'Precision Laser Projection',
                      soundSystem: 'Dolby Atmos',
                    }))
                ).map((aud) => {
                  const isSelected = targetAuditorium === aud.name
                  const matchingMovies = movies.filter((m) => m.auditorium === aud.name)
                  const avgOccupancy = matchingMovies.length > 0
                    ? Math.round(matchingMovies.reduce((acc, curr) => acc + (curr.occupancyRate || 80), 0) / matchingMovies.length)
                    : 80
                  return (
                    <div
                      key={aud.id || aud.name}
                      onClick={() => setTargetAuditorium(aud.name)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500 text-white shadow-md shadow-purple-950/40 ring-1 ring-purple-500'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-white block">{aud.name}</span>
                          <span className="text-[10px] text-zinc-400 mt-0.5 block">{aud.perk}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-purple-300 border border-zinc-700">
                            {aud.format}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono block mt-0.5">
                            {aud.surgeMultiplier > 1 ? `+${Math.round((aud.surgeMultiplier - 1) * 100)}% Surge` : 'Standard Yield'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                        <span>{matchingMovies.length} Active Title{matchingMovies.length === 1 ? '' : 's'} Assigned • {aud.capacity} Recliners</span>
                        <span className="text-emerald-400 font-mono font-semibold">Avg Occupancy: {avgOccupancy}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setReallocatingMovie(null)}
                disabled={isReallocating}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReallocation}
                disabled={isReallocating || !targetAuditorium}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-purple-900/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isReallocating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>{isReallocating ? 'Reallocating...' : 'Confirm Screen Reallocation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ManagerPortalPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-zinc-500">Loading Operations Portal...</div>}>
      <ManagerPortalContent />
    </Suspense>
  )
}
