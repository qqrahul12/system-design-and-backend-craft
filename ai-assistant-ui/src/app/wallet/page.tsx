'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  ShieldCheck,
  Zap,
  Sparkles,
  RefreshCw,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Receipt,
  Eye,
  EyeOff,
  Film,
  UtensilsCrossed,
  Sliders,
  AlertCircle,
  Copy,
  ChevronRight,
  Coins,
  Building,
  Check,
} from 'lucide-react'
import { walletService, formatCurrency, getCurrencySymbol } from '@/services/walletService'
import { authService, UserPersona } from '@/services/authService'
import { Permissions, rbacPolicyEngine } from '@/services/rbacRegistry'
import { apiClient } from '@/services/apiClient'
import { Toast, type ToastMessage } from '@/components/ui/AlertToast'
import { RbacAccessShield } from '@/components/ui/RbacAccessShield'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

interface WalletTransaction {
  txnId: string
  type: string
  amount: number
  balanceAfter: number
  description: string
  timestamp: string
}

interface WalletSummary {
  walletId: string
  currency: string
  balance: number
  transactionCount: number
  recentTransactions: WalletTransaction[]
}

interface CircuitBreakerStatus {
  state: string
  provider: string
  simulateFailure: boolean
}

interface RegisterStatus {
  registerId: string
  name: string
  operator: string
  openingCash: number
  cashSales: number
  cardSales: number
  walletSales: number
  totalSales: number
  currentCashDrawer: number
  status: 'BALANCED' | 'PENDING_COUNT' | 'VARIANCE'
}

const CIRCUIT_REGISTERS: RegisterStatus[] = [
  {
    registerId: 'REG-01',
    name: 'Main Box Office Terminal 1',
    operator: 'Shift Manager (Box Office)',
    openingCash: 250.0,
    cashSales: 412.5,
    cardSales: 1340.0,
    walletSales: 495.0,
    totalSales: 2247.5,
    currentCashDrawer: 662.5,
    status: 'BALANCED',
  },
  {
    registerId: 'REG-02',
    name: 'Concessions Fast Counter 2',
    operator: 'Auditorium Usher Staff',
    openingCash: 300.0,
    cashSales: 540.0,
    cardSales: 1120.0,
    walletSales: 310.0,
    totalSales: 1970.0,
    currentCashDrawer: 840.0,
    status: 'BALANCED',
  },
  {
    registerId: 'REG-03',
    name: 'VIP Mezzanine Lounge Bar',
    operator: 'Lead Bartender',
    openingCash: 200.0,
    cashSales: 185.0,
    cardSales: 960.0,
    walletSales: 420.0,
    totalSales: 1565.0,
    currentCashDrawer: 385.0,
    status: 'BALANCED',
  },
]

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTopUpLoading, setIsTopUpLoading] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState<number>(50)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE_CARD' | 'APPLE_PAY' | 'ACH'>('STRIPE_CARD')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [showCardNumber, setShowCardNumber] = useState(false)
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreakerStatus | null>(null)
  const [selectedTxn, setSelectedTxn] = useState<WalletTransaction | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [copiedCard, setCopiedCard] = useState(false)

  // Auth RBAC State
  const [currentUser, setCurrentUser] = useState<UserPersona | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  // Cinema Manager Reconciliation & Comp Vault State
  const [managerViewMode, setManagerViewMode] = useState<'REGISTER_VAULT' | 'PERSONAL_WALLET'>('REGISTER_VAULT')
  const [personas, setPersonas] = useState<any[]>([])
  const [compRecipient, setCompRecipient] = useState<string>('Guest Patron')
  const [compReason, setCompReason] = useState<string>('Service Recovery: Projection Glitch ($25)')
  const [compAmount, setCompAmount] = useState<number>(25)
  const [isCompLoading, setIsCompLoading] = useState<boolean>(false)
  const [reconciledRegisters, setReconciledRegisters] = useState<Record<string, boolean>>({
    'REG-01': true,
    'REG-02': true,
    'REG-03': true,
  })

  useEffect(() => {
    authService.getCurrentUser()
      .then((u) => {
        setCurrentUser(u)
        setIsLoadingAuth(false)
        if (u && rbacPolicyEngine.hasPermission(u, Permissions.MANAGE_THEATRE)) {
          setManagerViewMode('REGISTER_VAULT')
        } else {
          setManagerViewMode('PERSONAL_WALLET')
        }
      })
      .catch(() => setIsLoadingAuth(false))

    authService.getPersonas()
      .then((p) => {
        if (p && Array.isArray(p)) setPersonas(p)
      })
      .catch(() => {})
  }, [])

  const isManager = Boolean(
    currentUser && rbacPolicyEngine.hasPermission(currentUser, Permissions.MANAGE_THEATRE)
  )

  const handleIssueCustomerComp = async () => {
    if (!compAmount || compAmount <= 0) {
      showNotification('Please enter a valid compensation credit amount.', 'warning', 'Invalid Amount')
      return
    }

    setIsCompLoading(true)
    try {
      await walletService.topUp(
        compAmount,
        `Customer Goodwill Comp: ${compRecipient} (${compReason})`
      )
      showNotification(
        `Authorized +$${compAmount.toFixed(2)} Customer Comp Credit for ${compRecipient}!`,
        'success',
        'Goodwill Vault Dispatched'
      )
      await fetchWallet()
    } catch {
      showNotification('Failed to authorize comp credit. Please verify permissions.', 'error', 'Comp Dispatch Failed')
    } finally {
      setIsCompLoading(false)
    }
  }

  const handleReconcileRegister = (regId: string) => {
    setReconciledRegisters((prev) => ({
      ...prev,
      [regId]: !prev[regId],
    }))
    showNotification(`Register ${regId} drawer count verified and reconciled with circuit vault.`, 'success', 'Drawer Reconciled')
  }

  const showNotification = (
    msg: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    title?: string
  ) => {
    setToast({
      type,
      title: title || (type === 'success' ? 'Wallet Credited' : type === 'error' ? 'Transaction Failed' : type === 'warning' ? 'Validation' : 'Wallet'),
      message: msg,
    })
  }

  const fetchWallet = async () => {
    setIsLoading(true)
    try {
      const data: any = await walletService.getWalletSummary().catch(() => null)
      if (data) {
        setWallet(data)
      }
      const cbData: any = await apiClient.get('/api/v1/admin/circuit-breaker').catch(() => null)
      if (cbData) {
        setCircuitBreaker(cbData)
      }
    } catch (err) {
      console.warn('Failed to load wallet data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWallet()
  }, [])

  const handleTopUp = async () => {
    const finalAmt = customAmount ? parseFloat(customAmount) : topUpAmount
    if (!finalAmt || isNaN(finalAmt) || finalAmt <= 0) {
      showNotification('Please enter a valid top-up amount greater than 0.', 'warning', 'Invalid Amount')
      return
    }

    setIsTopUpLoading(true)
    try {
      await walletService.topUp(
        finalAmt,
        paymentMethod === 'STRIPE_CARD' ? 'Stripe Gateway' : paymentMethod
      )
      showNotification(`Successfully credited +$${finalAmt.toFixed(2)} CineCash via ${paymentMethod}!`, 'success', 'Top-Up Successful')
      setCustomAmount('')
      await fetchWallet()
    } catch {
      showNotification('Top-up failed. Circuit breaker may be open or payment gateway unreachable.', 'error', 'Payment Failed')
    } finally {
      setIsTopUpLoading(false)
    }
  }

  const handleCurrencyChange = async (newCurrency: string) => {
    try {
      const updated = await walletService.setCurrency(newCurrency)
      setWallet(updated)
      showNotification(`Wallet currency switched to ${newCurrency} (${getCurrencySymbol(newCurrency)})`, 'success', 'Currency Switched')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cinemind-auth-changed'))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch currency'
      showNotification(msg, 'error', 'Currency Update Failed')
    }
  }

  const copyCardNumber = () => {
    const textToCopy = wallet?.walletId || 'CINEMIND-WALLET'
    navigator.clipboard.writeText(textToCopy)
    setCopiedCard(true)
    setTimeout(() => setCopiedCard(false), 2500)
    showNotification(`Wallet ID (${textToCopy}) copied to clipboard`, 'info', 'Copied')
  }

  const filteredTransactions = (wallet?.recentTransactions ?? []).filter((tx) => {
    if (filterType === 'ALL') return true
    if (filterType === 'TOP_UP') return tx.type.includes('TOP_UP') || tx.type.includes('GRANT')
    if (filterType === 'TICKET') return tx.type.includes('TICKET')
    if (filterType === 'CONCESSIONS') return tx.type.includes('CONCESSIONS')
    if (filterType === 'SPLIT') return tx.description.toLowerCase().includes('split') || tx.type.includes('SPLIT')
    return true
  })

  const isAuthorized = Boolean(
    currentUser &&
    currentUser.isAuthenticated &&
    currentUser.role !== 'ANONYMOUS' &&
    currentUser.role !== 'AUDITORIUM_USHER'
  )

  if (!isAuthorized && !isLoadingAuth) {
    return (
      <RbacAccessShield
        title="Patron Wallet Access Required"
        requiredRoles={['VIP_PATRON', 'STANDARD_GUEST', 'CINEMA_MANAGER', 'EXECUTIVE_ADMIN']}
        currentUser={currentUser}
        description="The CineMind Digital Wallet requires an authenticated patron or manager session. Sign in to top up stored value, manage payment methods, and view double-entry ledger audits."
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Cinema Manager Mode Switcher Pill */}
      {isManager && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/20 border border-purple-500/30 p-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-purple-200">
              {managerViewMode === 'REGISTER_VAULT'
                ? 'Circuit Register Reconciliation & Customer Comp Vault'
                : 'Manager Personal CineCash Stored Balance'}
            </span>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded border border-purple-500/40">
              Role: {currentUser?.roleDisplayName || currentUser?.role}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setManagerViewMode('REGISTER_VAULT')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                managerViewMode === 'REGISTER_VAULT'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Register Vault & Comps</span>
            </button>

            <button
              onClick={() => setManagerViewMode('PERSONAL_WALLET')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                managerViewMode === 'PERSONAL_WALLET'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>Personal Wallet</span>
            </button>
          </div>
        </div>
      )}

      {isManager && managerViewMode === 'REGISTER_VAULT' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Manager Vault Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Cash Register Reconciliation & Customer Comp Vault</span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    All Drawers Balanced
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Circuit Box Office cash balancing, terminal drawer close-outs, and customer goodwill compensation credits.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchWallet}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Re-Audit Circuit Vault</span>
              </button>
            </div>
          </div>

          {/* 4 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Total Circuit Receipts Today
              </span>
              <div className="font-mono text-2xl font-extrabold text-white">
                $5,782.50
              </div>
              <p className="text-[10px] text-emerald-400 font-medium">+14.2% vs weekday target</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Physical Cash in Drawers
              </span>
              <div className="font-mono text-2xl font-extrabold text-amber-300">
                $1,887.50
              </div>
              <p className="text-[10px] text-zinc-400">3 Terminals counted & verified</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Digital & Card Ingest
              </span>
              <div className="font-mono text-2xl font-extrabold text-purple-300">
                $3,895.00
              </div>
              <p className="text-[10px] text-zinc-400">Direct stripe & wallet settlement</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Goodwill Comp Vault Balance
              </span>
              <div className="font-mono text-2xl font-extrabold text-emerald-400">
                ${(wallet?.balance ?? 175.0).toFixed(2)}
              </div>
              <p className="text-[10px] text-zinc-400">Manager discretionary reserve</p>
            </div>
          </div>

          {/* 2-Column Section: Circuit Registers (7 Cols) + Customer Comp Vault (5 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Circuit Cash Registers Reconciliation Table */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-purple-400" />
                      Circuit Register Drawers & Shift Balancing
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Verify expected cash drawer balances against live box office & concession tenders
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    $0.00 Variance
                  </span>
                </div>

                <div className="space-y-3">
                  {CIRCUIT_REGISTERS.map((reg) => {
                    const isReconciled = Boolean(reconciledRegisters[reg.registerId])
                    return (
                      <div
                        key={reg.registerId}
                        className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition space-y-2.5 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30 text-[10px]">
                                {reg.registerId}
                              </span>
                              <h4 className="font-bold text-white">{reg.name}</h4>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Operator: <strong className="text-zinc-300">{reg.operator}</strong>
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${
                              isReconciled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {isReconciled ? '✓ RECONCILED' : 'COUNT PENDING'}
                          </span>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-4 gap-2 p-2 rounded-lg bg-zinc-950/80 font-mono text-[10px]">
                          <div>
                            <span className="text-zinc-500 block">Opening:</span>
                            <span className="text-zinc-300">${reg.openingCash.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Cash Ingest:</span>
                            <span className="text-amber-400">${reg.cashSales.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Digital Ingest:</span>
                            <span className="text-purple-300">${(reg.cardSales + reg.walletSales).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Expected Drawer:</span>
                            <span className="text-emerald-400 font-bold">${reg.currentCashDrawer.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-zinc-500">
                            Variance: <strong className="text-emerald-400 font-mono">$0.00</strong> (Count exact)
                          </span>
                          <button
                            onClick={() => handleReconcileRegister(reg.registerId)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                              isReconciled
                                ? 'bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700'
                                : 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
                            }`}
                          >
                            {isReconciled ? 'Lock Reconciled Drawer' : 'Reconcile Drawer Count'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Customer Comp & Loyalty Vault */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-purple-500/30 bg-zinc-950 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      Customer Comp & Goodwill Vault
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Issue instantaneous goodwill credits or hospitality comps for customer service recovery
                    </p>
                  </div>
                </div>

                {/* Recipient Patron Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Recipient Customer / Patron:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(personas.length > 0
                      ? personas.map((p) => p.fullName || p.name || p.email)
                      : ['Patron Guest A', 'Patron Guest B', 'Patron Guest C']
                    ).map((pName) => {
                      const isSelected = compRecipient === pName
                      return (
                        <button
                          key={pName}
                          type="button"
                          onClick={() => setCompRecipient(pName)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-500 font-bold'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          {pName}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Service Recovery Reason Presets */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Compensation Justification:
                  </label>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { reason: 'Service Recovery: Projection Sync Glitch', defaultAmt: 25 },
                      { reason: 'Late Seating / Aisle Navigation Apology', defaultAmt: 15 },
                      { reason: 'Spilled F&B Item Replacement Goodwill', defaultAmt: 15 },
                      { reason: 'VIP Gold Member Hospitality Credit', defaultAmt: 50 },
                    ].map((item) => (
                      <button
                        key={item.reason}
                        type="button"
                        onClick={() => {
                          setCompReason(item.reason)
                          setCompAmount(item.defaultAmt)
                        }}
                        className={`w-full text-left p-2 rounded-xl border text-[11px] transition flex justify-between items-center ${
                          compReason === item.reason
                            ? 'bg-purple-950/40 border-purple-500/60 text-purple-200 font-semibold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>{item.reason}</span>
                        <span className="font-mono font-bold text-amber-400">+${item.defaultAmt}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Comp Credit Amount:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                    <input
                      type="number"
                      min="5"
                      max="250"
                      value={compAmount}
                      onChange={(e) => setCompAmount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Dispatch Comp Button */}
                <button
                  onClick={handleIssueCustomerComp}
                  disabled={isCompLoading || compAmount <= 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  {isCompLoading
                    ? 'Transmitting Goodwill Credit...'
                    : `⚡ Authorize +$${compAmount.toFixed(2)} Comp to ${compRecipient}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                CineCash Digital Wallet
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Live Ledger
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                Fintech stored-value account, 1-click tickets & concessions checkout, and squad expense settlement
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchWallet}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Ledger
          </button>
          <Link
            href="/split"
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition active:scale-95"
          >
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            Squad SplitHub
          </Link>
        </div>
      </div>

      {/* Top Banner: Circuit Breaker & Resilience Telemetry */}
      {circuitBreaker && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${circuitBreaker.state === 'OPEN' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-white">Resilience4j Circuit Breaker Gateway: </span>
              <span className="text-zinc-300">
                Operating with <span className="font-mono text-indigo-300 font-semibold">{circuitBreaker.provider}</span> card adapter.
              </span>
              <span className="ml-2 inline-flex items-center gap-1 font-mono font-bold text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                STATE: {circuitBreaker.state}
              </span>
            </div>
          </div>
          <Link href="/admin" className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 self-start sm:self-auto">
            Circuit Controls <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Main Grid: Card & Top-Up */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Virtual CineCash Card & Loyalty Tier (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Presentation */}
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-zinc-900 via-[#181226] to-[#0d0a14] p-7 shadow-2xl shadow-purple-950/30 text-white flex flex-col justify-between h-64 group">
            {/* Ambient Glows */}
            <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-purple-600/20 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-indigo-600/15 blur-2xl" />

            {/* Top row */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-300">
                  CineMind Gold VIP
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-400">CONTACTLESS</span>
                <div className="h-3.5 w-3.5 rounded-full border border-zinc-400/60 border-t-transparent animate-pulse" />
              </div>
            </div>

            {/* Balance in Card */}
            <div className="relative z-10 my-auto">
              <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                Available Stored Balance
              </span>
              <div className="text-4xl font-extrabold tracking-tight text-white flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl text-purple-400 font-bold">{getCurrencySymbol(wallet?.currency || 'USD')}</span>
                {(wallet?.balance ?? 0.0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <span className="text-xs font-mono text-zinc-400 ml-1.5 font-normal">{wallet?.currency || 'USD'}</span>
              </div>
            </div>

            {/* Bottom Card Row */}
            <div className="relative z-10 flex items-end justify-between pt-2 border-t border-zinc-800/80">
              <div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Virtual Account / Card
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs tracking-wider text-zinc-200">
                    {showCardNumber
                      ? (wallet?.walletId || 'No Wallet Active')
                      : (wallet?.walletId ? `•••• •••• ${wallet.walletId.slice(-4)}` : '•••• ••••')}
                  </span>
                  <button
                    onClick={() => setShowCardNumber(!showCardNumber)}
                    className="text-zinc-400 hover:text-white transition p-0.5"
                    title={showCardNumber ? 'Hide' : 'Reveal'}
                  >
                    {showCardNumber ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={copyCardNumber}
                    className="text-zinc-400 hover:text-white transition p-0.5"
                    title="Copy Card Number"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Expires
                </span>
                <span className="font-mono text-xs text-zinc-200">11/29</span>
              </div>
            </div>
          </div>

          {/* Multi-Currency Stored Value Selector */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Wallet Currency</span>
              <span className="font-mono text-xs font-bold text-purple-400">
                {wallet?.currency || 'USD'} ({getCurrencySymbol(wallet?.currency || 'USD')})
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].map((curr) => (
                <button
                  key={curr}
                  onClick={() => handleCurrencyChange(curr)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition ${
                    (wallet?.currency || 'USD') === curr
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* Loyalty & Perks Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Tier Benefits: CineMind Gold VIP</h3>
              </div>
              <span className="text-xs font-bold text-amber-400">2.5% Cashback</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every dollar spent using CineCash automatically accrues 2.5% stored-value cashback credited directly into this wallet.
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Cashback Accumulated This Month</span>
                <span className="font-bold text-emerald-400">+$14.25</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-400 w-[65%]" />
              </div>
              <span className="text-[10px] text-zinc-500 block text-right">$85 to Platinum Tier (5% Cashback)</span>
            </div>
          </div>
        </div>

        {/* Instant Top-Up Console (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Instant Stored-Value Top-Up</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Reload CineCash instantaneously with Stripe Card Gateway or digital banking
                </p>
              </div>
              <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-xs font-bold text-purple-300">
                0% Reload Fee
              </span>
            </div>

            {/* Quick Amount Chips */}
            <div className="mt-6 space-y-3">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                Select Top-Up Amount
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[25, 50, 100, 250].map((amt) => {
                  const isSelected = !customAmount && topUpAmount === amt
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setTopUpAmount(amt)
                        setCustomAmount('')
                      }}
                      className={`py-3 rounded-xl border text-sm font-extrabold transition active:scale-95 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      +${amt}
                    </button>
                  )
                })}
              </div>

              {/* Custom Input */}
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  step="5"
                  placeholder="Or enter custom amount (e.g. 75)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-8 py-3 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none transition font-semibold"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-6 space-y-3">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                Funding Payment Method
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('STRIPE_CARD')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition active:scale-95 ${
                    paymentMethod === 'STRIPE_CARD'
                      ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Stripe Card
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('APPLE_PAY')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition active:scale-95 ${
                    paymentMethod === 'APPLE_PAY'
                      ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  Apple Pay
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('ACH')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition active:scale-95 ${
                    paymentMethod === 'ACH'
                      ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Direct ACH
                </button>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
            <div className="text-xs text-zinc-400">
              <span>Final Credited: </span>
              <span className="font-bold text-white text-sm">
                ${(customAmount ? parseFloat(customAmount) || 0 : topUpAmount).toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleTopUp}
              disabled={isTopUpLoading}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-xs font-bold text-white hover:bg-purple-500 transition active:scale-95 shadow-lg shadow-purple-600/30 disabled:opacity-50"
            >
              {isTopUpLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing Stripe Charge...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Load ${(customAmount ? parseFloat(customAmount) || 0 : topUpAmount).toFixed(2)} to CineCash
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Double-Entry Transaction Ledger */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-400" />
              Real-Time Ledger & Transaction Receipts
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cryptographically timestamped debits, reloads, and SplitMoney squad settlements
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'TOP_UP', 'TICKET', 'CONCESSIONS', 'SPLIT'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filterType === t
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No transactions matching the &quot;{filterType}&quot; filter in CineCash ledger.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {filteredTransactions.map((tx) => {
                const isPositive = tx.type.includes('TOP_UP') || tx.type.includes('GRANT') || tx.type.includes('REFUND')
                return (
                  <div
                    key={tx.txnId}
                    onClick={() => setSelectedTxn(tx)}
                    className="flex items-center justify-between py-4 px-2 hover:bg-zinc-800/40 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                          isPositive
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : tx.type.includes('TICKET') ? (
                          <Film className="h-5 w-5 text-indigo-400" />
                        ) : tx.type.includes('CONCESSIONS') ? (
                          <UtensilsCrossed className="h-5 w-5 text-amber-400" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-zinc-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                            {tx.description}
                          </p>
                          <span className="text-[10px] font-mono text-zinc-500 border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 rounded">
                            {tx.txnId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(tx.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span>Post-Balance: ${tx.balanceAfter.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-extrabold ${
                          isPositive ? 'text-emerald-400' : 'text-zinc-200'
                        }`}
                      >
                        {isPositive ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                      </span>
                      <span className="block text-[10px] font-semibold text-zinc-500 uppercase mt-0.5">
                        {tx.type}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      </>
    )}

      {/* Transaction Receipt Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">CineCash Transaction Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Transaction ID</span>
                <span className="font-mono font-bold text-white">{selectedTxn.txnId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Description</span>
                <span className="font-semibold text-white text-right max-w-[240px] truncate">{selectedTxn.description}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Ledger Category</span>
                <span className="font-mono text-purple-300 font-semibold">{selectedTxn.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Amount Charged</span>
                <span className="text-sm font-extrabold text-white">${selectedTxn.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Wallet Balance After</span>
                <span className="font-mono text-emerald-400 font-bold">${selectedTxn.balanceAfter.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Recorded At</span>
                <span className="text-zinc-300">{new Date(selectedTxn.timestamp).toUTCString()}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTxn(null)}
                className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
