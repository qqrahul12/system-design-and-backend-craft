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
} from 'lucide-react'
import { walletService } from '@/services/walletService'
import { apiClient } from '@/services/apiClient'

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
  const [notice, setNotice] = useState<string | null>(null)
  const [copiedCard, setCopiedCard] = useState(false)

  const showNotification = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 4000)
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
      showNotification('⚠️ Please enter a valid top-up amount.')
      return
    }

    setIsTopUpLoading(true)
    try {
      await walletService.topUp(
        finalAmt,
        paymentMethod === 'STRIPE_CARD' ? 'Stripe Gateway' : paymentMethod
      )
      showNotification(`🎉 Successfully credited +$${finalAmt.toFixed(2)} CineCash via ${paymentMethod}!`)
      setCustomAmount('')
      await fetchWallet()
    } catch {
      showNotification('❌ Top-up failed. Circuit breaker may be open or gateway unreachable.')
    } finally {
      setIsTopUpLoading(false)
    }
  }

  const copyCardNumber = () => {
    navigator.clipboard.writeText('4829 9102 3844 8842')
    setCopiedCard(true)
    setTimeout(() => setCopiedCard(false), 2500)
    showNotification('📋 Virtual Card number copied to clipboard')
  }

  const filteredTransactions = (wallet?.recentTransactions ?? []).filter((tx) => {
    if (filterType === 'ALL') return true
    if (filterType === 'TOP_UP') return tx.type.includes('TOP_UP') || tx.type.includes('GRANT')
    if (filterType === 'TICKET') return tx.type.includes('TICKET')
    if (filterType === 'CONCESSIONS') return tx.type.includes('CONCESSIONS')
    if (filterType === 'SPLIT') return tx.description.toLowerCase().includes('split') || tx.type.includes('SPLIT')
    return true
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in pb-16">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-3 rounded-2xl border border-purple-500/40 bg-zinc-950/95 px-5 py-3.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl animate-slide-in">
          <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

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
                <span className="text-2xl text-purple-400 font-bold">$</span>
                {(wallet?.balance ?? 0.0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <span className="text-xs font-mono text-zinc-400 ml-1.5 font-normal">USD</span>
              </div>
            </div>

            {/* Bottom Card Row */}
            <div className="relative z-10 flex items-end justify-between pt-2 border-t border-zinc-800/80">
              <div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Card Number
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs tracking-wider text-zinc-200">
                    {showCardNumber ? '4829 9102 3844 8842' : '•••• •••• •••• 8842'}
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
