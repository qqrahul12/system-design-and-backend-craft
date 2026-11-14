'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Plus,
  DollarSign,
  CheckCircle2,
  Clock,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  RefreshCw,
  Film,
  UtensilsCrossed,
  Receipt,
  UserCheck,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { splitService } from '@/services/splitService'


interface SplitUser {
  id: string
  name?: string
  fullName?: string
  firstName?: string
  lastName?: string
  email: string
  phoneNumber?: string
  avatarUrl?: string
}

const DEFAULT_SQUAD_USERS: SplitUser[] = [
  {
    id: 'usr-marcus',
    name: 'Marcus Kane',
    fullName: 'Marcus Kane',
    firstName: 'Marcus',
    lastName: 'Kane',
    email: 'marcus.kane@cinemind.io',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
  {
    id: 'usr-alex',
    name: 'Alex Mercer',
    fullName: 'Alex Mercer',
    firstName: 'Alex',
    lastName: 'Mercer',
    email: 'alex.mercer@cinemind.io',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
  {
    id: 'usr-elena',
    name: 'Elena Rostova',
    fullName: 'Elena Rostova',
    firstName: 'Elena',
    lastName: 'Rostova',
    email: 'elena.rostova@cinemind.io',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  {
    id: 'usr-chloe',
    name: 'Chloe Bennett',
    fullName: 'Chloe Bennett',
    firstName: 'Chloe',
    lastName: 'Bennett',
    email: 'chloe.bennett@cinemind.io',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  },
]

const getUserDisplayName = (u: SplitUser) =>
  u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email

interface SplitGroup {
  id: string
  name: string
  description: string
  memberUserIds: string[]
}

interface SplitShare {
  userId: string
  userName: string
  shareAmount: number
  isPaid: boolean
  paidAt?: string
  paymentMethod?: string
}

interface SplitExpense {
  id: string
  name: string
  totalAmount: number
  paidByUserId: string
  paidByUserName: string
  referenceType?: string
  referenceId?: string
  createdAt: string
  status: 'PENDING' | 'SETTLED'
  shares: SplitShare[]
}

export default function SplitPage() {
  const [groups, setGroups] = useState<SplitGroup[]>([])
  const [users, setUsers] = useState<SplitUser[]>(DEFAULT_SQUAD_USERS)
  const [expenses, setExpenses] = useState<SplitExpense[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isSettling, setIsSettling] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // New expense form state
  const [expenseName, setExpenseName] = useState('')
  const [expenseTotal, setExpenseTotal] = useState('')
  const [selectedPayerId, setSelectedPayerId] = useState('usr-marcus')
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['usr-marcus', 'usr-alex', 'usr-elena', 'usr-chloe'])
  const [isCreatingExpense, setIsCreatingExpense] = useState(false)

  const showNotification = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 4000)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [fetchedUsers, fetchedGroups, fetchedExpenses, fetchedBalances] = await Promise.all([
        splitService.getUsers().catch(() => null),
        splitService.getGroups().catch(() => null),
        splitService.getExpenses().catch(() => null),
        splitService.getBalances().catch(() => null),
      ])

      if (fetchedUsers && fetchedUsers.length > 0) {
        setUsers(fetchedUsers)
      }
      if (fetchedGroups) setGroups(fetchedGroups as unknown as SplitGroup[])
      if (fetchedExpenses) setExpenses(fetchedExpenses as unknown as SplitExpense[])
      if (fetchedBalances) setBalances(fetchedBalances as unknown as Record<string, number>)
    } catch (err) {
      console.warn('Failed to load SplitMoney squad data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSettle = async (expenseId: string, debtorUserId: string, method: string) => {
    setIsSettling(`${expenseId}-${debtorUserId}`)
    try {
      await splitService.settleShare({
        expenseId,
        debtorUserId,
        paymentMethod: method,
      })
      showNotification(`🎉 Settled share via ${method === 'WALLET' ? 'CineCash Wallet' : 'Stripe Card'}!`)
      await loadData()
    } catch {
      showNotification('❌ Failed to settle share.')
    } finally {
      setIsSettling(null)
    }
  }

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(expenseTotal)
    if (!expenseName || isNaN(amt) || amt <= 0 || selectedMembers.length === 0) {
      showNotification('⚠️ Please enter an expense title, valid amount, and select at least one member.')
      return
    }

    setIsCreatingExpense(true)
    try {
      await splitService.createSplit({
        name: expenseName,
        totalAmount: amt,
        paidByUserId: selectedPayerId,
        memberUserIds: selectedMembers,
        referenceType: 'CINEMA_OUTING',
      })
      showNotification('🎉 Group split expense created successfully!')
      setIsCreateModalOpen(false)
      setExpenseName('')
      setExpenseTotal('')
      await loadData()
    } catch {
      showNotification('❌ Error creating group split expense.')
    } finally {
      setIsCreatingExpense(false)
    }
  }

  const toggleMemberSelection = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      if (selectedMembers.length > 1) {
        setSelectedMembers(selectedMembers.filter((id) => id !== userId))
      }
    } else {
      setSelectedMembers([...selectedMembers, userId])
    }
  }

  const currentUserBalance = balances['usr-marcus'] ?? balances['usr-alex'] ?? 24.50

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in pb-16">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-3 rounded-2xl border border-indigo-500/40 bg-zinc-950/95 px-5 py-3.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl animate-slide-in">
          <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              SplitMoney Squad Hub
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                Group Ledger
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Cooperative cinema outings, equal & itemized ticket bill splitting, and 1-click CineCash settlements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Ledger
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition active:scale-95 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="h-3.5 w-3.5" />
            Split a New Bill
          </button>
        </div>
      </div>

      {/* Net Balance & Squad Summary Banner */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
              Squad Balance Summary
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">
                +${Math.abs(currentUserBalance).toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-emerald-300">You are owed</span>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-zinc-400">
            Across active tickets, concessions, and shared IMAX 70mm outings.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Squads</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{groups.length || 2}</div>
          <p className="text-[11px] text-zinc-500">
            {groups.map((g) => g.name).join(' • ') || 'Cosmic Movie Night Squad'}
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Settlement Gateway</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5 pt-1">
            <Wallet className="h-4 w-4 text-purple-400" />
            CineCash Wallet + Stripe Card
          </div>
          <p className="text-[11px] text-zinc-500">
            Shares debit stored-value balances directly with zero gateway delay.
          </p>
        </div>
      </div>

      {/* Squad Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setSelectedGroup('ALL')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            selectedGroup === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          All Squad Outings
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroup(g.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedGroup === g.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Expenses Feed */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="h-4 w-4 text-indigo-400" />
            Group Bills & Settlements
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            {expenses.length} Total Expenses Logged
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 p-12 text-center text-xs text-zinc-500 space-y-3">
            <Users className="mx-auto h-8 w-8 text-zinc-600" />
            <p>No squad expenses recorded yet.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500"
            >
              Split Your First Cinema Bill
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((exp) => {
              const pendingCount = exp.shares.filter((s) => !s.isPaid && s.userId !== exp.paidByUserId).length
              const isSettled = pendingCount === 0

              return (
                <div
                  key={exp.id}
                  className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5 hover:border-zinc-700 transition"
                >
                  {/* Expense Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-400">
                        {exp.name.toLowerCase().includes('concession') || exp.name.toLowerCase().includes('f&b') ? (
                          <UtensilsCrossed className="h-5 w-5 text-amber-400" />
                        ) : (
                          <Film className="h-5 w-5 text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{exp.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span>Paid in full by <strong className="text-zinc-200">{exp.paidByUserName}</strong></span>
                          <span>•</span>
                          <span>{new Date(exp.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          isSettled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isSettled ? 'Fully Settled' : `${pendingCount} Shares Pending`}
                      </span>
                      <span className="text-base font-extrabold text-white">
                        ${exp.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Shares Breakdown */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {exp.shares.map((share) => {
                      const isPayer = share.userId === exp.paidByUserId
                      const settleKey = `${exp.id}-${share.userId}`
                      const isCurrentlySettling = isSettling === settleKey

                      return (
                        <div
                          key={share.userId}
                          className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-xs font-bold text-white">
                              {share.userName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">
                                {share.userName} {isPayer ? '(Payer)' : ''}
                              </p>
                              <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                                ${share.shareAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div>
                            {isPayer ? (
                              <span className="flex items-center gap-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Paid
                              </span>
                            ) : share.isPaid ? (
                              <span className="flex items-center gap-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Settled
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSettle(exp.id, share.userId, 'WALLET')}
                                  disabled={isCurrentlySettling}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-600/30 transition active:scale-95 disabled:opacity-50"
                                  title="Settle with CineCash Wallet"
                                >
                                  <Wallet className="h-3 w-3" /> Pay
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSettle(exp.id, share.userId, 'STRIPE_CARD')}
                                  disabled={isCurrentlySettling}
                                  className="flex items-center gap-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-2.5 py-1 text-[10px] font-bold text-indigo-300 hover:bg-indigo-600/30 transition active:scale-95 disabled:opacity-50"
                                  title="Settle with Stripe Card"
                                >
                                  <CreditCard className="h-3 w-3" /> Card
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Split Expense Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-indigo-500/30 bg-[#121214] p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Split a Cinema Bill</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                  Outing / Expense Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dune: Part Two 70mm IMAX + Truffle Popcorn"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                  Total Bill Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 58.50"
                  value={expenseTotal}
                  onChange={(e) => setExpenseTotal(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                  Paid In Full By
                </label>
                <select
                  value={selectedPayerId}
                  onChange={(e) => setSelectedPayerId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {getUserDisplayName(u)} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2">
                  Select Squad Members to Split With ({selectedMembers.length})
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isChecked = selectedMembers.includes(u.id)
                    const displayName = getUserDisplayName(u)
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => toggleMemberSelection(u.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
                          isChecked
                            ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-sm shadow-indigo-600/20'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={displayName}
                              className="h-6 w-6 rounded-full object-cover shrink-0 border border-zinc-700"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-300 font-bold shrink-0">
                              {displayName.charAt(0)}
                            </div>
                          )}
                          <div className="truncate">
                            <p className="truncate text-xs font-semibold text-zinc-200">{displayName}</p>
                            <p className="truncate text-[10px] text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                        {isChecked && <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 ml-1.5" />}
                      </button>
                    )
                  })}
                </div>
                {expenseTotal && parseFloat(expenseTotal) > 0 && selectedMembers.length > 0 && (
                  <p className="text-[11px] font-mono text-indigo-400 mt-2">
                    Estimated Share per Member: ${(parseFloat(expenseTotal) / selectedMembers.length).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExpense}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {isCreatingExpense ? 'Dividing...' : 'Create & Divide Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
