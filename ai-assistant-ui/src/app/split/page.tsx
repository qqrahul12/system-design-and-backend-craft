'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Search,
  Share2,
  Copy,
  Check,
  Filter,
  UserPlus,
  X,
  AlertCircle,
  Car,
} from 'lucide-react'
import {
  splitService,
  SplitUser,
  SplitGroup,
  SplitExpense,
  SplitBalanceSummary,
} from '@/services/splitService'

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

const QUICK_PRESETS = [
  { label: '🎟️ 4x IMAX 70mm Passes', name: 'Dune: Part Two IMAX 70mm (4 Passes)', amount: '78.00', icon: Film },
  { label: '🍿 Popcorn & Cold Brew Combo', name: 'Gourmet Truffle Popcorn & Nitro Cold Brew', amount: '36.50', icon: UtensilsCrossed },
  { label: '🍕 Concessions & Cocktails', name: 'Artisan Flatbread & Craft Botanical Cocktails', amount: '54.00', icon: UtensilsCrossed },
  { label: '🚗 Late Night Cinema Ride', name: 'Cinema Uber XL to Downtown Lounge', amount: '28.00', icon: Car },
]

const getUserDisplayName = (u: SplitUser) =>
  u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email

const isSharePaid = (s: { paid?: boolean; isPaid?: boolean }) => Boolean(s.paid || s.isPaid)

export default function SplitPage() {
  const [groups, setGroups] = useState<SplitGroup[]>([])
  const [users, setUsers] = useState<SplitUser[]>(DEFAULT_SQUAD_USERS)
  const [expenses, setExpenses] = useState<SplitExpense[]>([])
  const [balanceSummary, setBalanceSummary] = useState<SplitBalanceSummary | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SETTLED'>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isSettling, setIsSettling] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // New expense form state
  const [expenseName, setExpenseName] = useState('')
  const [expenseTotal, setExpenseTotal] = useState('')
  const [selectedPayerId, setSelectedPayerId] = useState('usr-marcus')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([
    'usr-marcus',
    'usr-alex',
    'usr-elena',
    'usr-chloe',
  ])
  const [isCreatingExpense, setIsCreatingExpense] = useState(false)

  // New squad group form state
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupMembers, setGroupMembers] = useState<string[]>([
    'usr-marcus',
    'usr-alex',
    'usr-elena',
    'usr-chloe',
  ])
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)

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
        splitService.getBalances('usr-marcus').catch(() => null),
      ])

      if (fetchedUsers && fetchedUsers.length > 0) {
        setUsers(fetchedUsers)
      }
      if (fetchedGroups) setGroups(fetchedGroups)
      if (fetchedExpenses) setExpenses(fetchedExpenses)
      if (fetchedBalances) setBalanceSummary(fetchedBalances)
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
      showNotification(
        `🎉 Settled share via ${method === 'WALLET' ? 'CineCash Digital Wallet' : 'Stripe Card Gateway'}!`
      )
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
      showNotification('🎉 Group split expense created and divided successfully!')
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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || groupMembers.length === 0) {
      showNotification('⚠️ Please enter a squad name and pick at least one member.')
      return
    }

    setIsCreatingGroup(true)
    try {
      await splitService.createGroup({
        name: groupName.trim(),
        description: groupDesc.trim() || 'CineMind movie screening squad',
        memberIds: groupMembers,
      })
      showNotification(`🎉 Created new squad "${groupName}"!`)
      setIsCreateGroupModalOpen(false)
      setGroupName('')
      setGroupDesc('')
      await loadData()
    } catch {
      showNotification('❌ Failed to create squad group.')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const handleCopyExpenseSummary = (exp: SplitExpense) => {
    const lines = [
      `🎬 CineMind Squad Bill: ${exp.name}`,
      `💰 Total: $${exp.totalAmount.toFixed(2)} | Paid by ${exp.paidByUserName}`,
      `📅 ${new Date(exp.createdAt).toLocaleDateString()}`,
      `👥 Shares (${exp.shares.length} members):`,
      ...exp.shares.map(
        (s) =>
          `  • ${s.userName}: $${s.shareAmount.toFixed(2)} [${isSharePaid(s) ? 'PAID ✅' : 'PENDING ⏳'}]`
      ),
      `🎟️ Settle 1-click in CineMind via CineCash!`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedId(exp.id)
    showNotification('📋 Formatted bill summary copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2500)
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

  const toggleGroupMemberSelection = (userId: string) => {
    if (groupMembers.includes(userId)) {
      if (groupMembers.length > 1) {
        setGroupMembers(groupMembers.filter((id) => id !== userId))
      }
    } else {
      setGroupMembers([...groupMembers, userId])
    }
  }

  const applyPreset = (preset: (typeof QUICK_PRESETS)[0]) => {
    setExpenseName(preset.name)
    setExpenseTotal(preset.amount)
  }

  // Filtered expenses based on squad group, search query, and settlement status
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Squad group filter
      if (selectedGroup !== 'ALL' && exp.groupId !== selectedGroup) {
        return false
      }
      // Status filter
      const pendingCount = exp.shares.filter((s) => !isSharePaid(s) && s.userId !== exp.paidByUserId).length
      if (statusFilter === 'PENDING' && pendingCount === 0) return false
      if (statusFilter === 'SETTLED' && pendingCount > 0) return false

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = exp.name.toLowerCase().includes(q)
        const matchesPayer = exp.paidByUserName.toLowerCase().includes(q)
        const matchesMembers = exp.shares.some((s) => s.userName.toLowerCase().includes(q))
        if (!matchesName && !matchesPayer && !matchesMembers) return false
      }

      return true
    })
  }, [expenses, selectedGroup, statusFilter, searchQuery])

  const netBalance = balanceSummary?.netBalance ?? 24.5
  const totalPaidForOthers = balanceSummary?.totalPaidForOthers ?? 58.5
  const totalOwedToOthers = balanceSummary?.totalOwedToOthers ?? 34.0
  const balancesWithFriends = balanceSummary?.balancesWithFriends ?? {
    'Alex Mercer': 19.5,
    'Elena Rostova': 19.5,
    'Chloe Bennett': -14.5,
  }

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
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                SplitMoney Squad Hub
              </h1>
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                Group Ledger
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cooperative cinema outings, equal & itemized ticket bill splitting, and 1-click CineCash settlements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Ledger
          </button>
          <button
            onClick={() => setIsCreateGroupModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/40 transition active:scale-95"
          >
            <UserPlus className="h-3.5 w-3.5" />
            New Squad
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
        {/* Total Net Balance Card */}
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
                Net Squad Position
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                {netBalance >= 0 ? 'In Credit' : 'In Debt'}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-3xl font-extrabold ${
                  netBalance >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {netBalance >= 0 ? `+$${netBalance.toFixed(2)}` : `-$${Math.abs(netBalance).toFixed(2)}`}
              </span>
              <span className="text-xs font-semibold text-zinc-400">
                {netBalance >= 0 ? 'You are owed in total' : 'You owe friends in total'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ArrowDownLeft className="h-3 w-3" /> Paid: ${totalPaidForOthers.toFixed(2)}
            </span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> Owed: ${totalOwedToOthers.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Squad Groups Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Active Squads
              </span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{groups.length || 1}</div>
          </div>
          <div className="mt-4 text-[11px] text-zinc-400 flex items-center justify-between">
            <span className="truncate">
              {groups.map((g) => g.name).join(' • ') || 'CineMind IMAX VIP Squad'}
            </span>
            <button
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 font-semibold shrink-0 ml-2"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Settlement Gateway Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Settlement Gateway
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Wallet className="h-4 w-4" /> CineCash
              </span>
              <span className="text-zinc-600">+</span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <CreditCard className="h-4 w-4" /> Stripe
              </span>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-zinc-500">
            Automated double-entry debits with Resilience4j circuit-breaker fallback.
          </p>
        </div>
      </div>

      {/* Friends Balance Sheet breakdown */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Friend-by-Friend Balance Sheet
            </h3>
          </div>
          <span className="text-xs text-zinc-500">
            Real-time balance settlement ledger
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {users
            .filter((u) => u.id !== 'usr-marcus')
            .map((u) => {
              const displayName = getUserDisplayName(u)
              const balance = balancesWithFriends[displayName] ?? 0
              const owesYou = balance > 0
              const youOwe = balance < 0
              const settled = balance === 0

              return (
                <div
                  key={u.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 flex flex-col justify-between gap-3 hover:border-zinc-700 transition"
                >
                  <div className="flex items-center gap-3">
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt={displayName}
                        className="h-10 w-10 rounded-full object-cover border border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {displayName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{displayName}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">
                        {owesYou ? 'Owes you' : youOwe ? 'You owe' : 'Status'}
                      </span>
                      <span
                        className={`text-sm font-bold font-mono ${
                          owesYou
                            ? 'text-emerald-400'
                            : youOwe
                            ? 'text-amber-400'
                            : 'text-zinc-500'
                        }`}
                      >
                        {settled ? 'Settled' : `$${Math.abs(balance).toFixed(2)}`}
                      </span>
                    </div>

                    {!settled && (
                      <button
                        onClick={() => {
                          const matchingExp = expenses.find((exp) =>
                            exp.shares.some((s) => s.userId === u.id && !isSharePaid(s))
                          )
                          if (matchingExp) {
                            handleSettle(matchingExp.id, u.id, 'WALLET')
                          } else {
                            showNotification(`All pending direct tickets for ${displayName} are squared up.`)
                          }
                        }}
                        className="rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-2.5 py-1 text-[10px] font-bold text-indigo-300 hover:bg-indigo-600/30 transition"
                      >
                        {owesYou ? 'Request' : 'Settle'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Squad Filter Tabs & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Squad Outing Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedGroup('ALL')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
                selectedGroup === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              All Squad Outings ({expenses.length})
            </button>
            {groups.map((g) => {
              const count = expenses.filter((e) => e.groupId === g.id).length
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 ${
                    selectedGroup === g.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {g.name} ({count})
                </button>
              )
            })}
          </div>

          {/* Settlement Status Filter Pills */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-zinc-900/90 border border-zinc-800 rounded-xl p-1">
            {(['ALL', 'PENDING', 'SETTLED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  statusFilter === filter
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter === 'PENDING' ? 'Pending' : 'Settled'}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bills by title, payer, or member (e.g. 'Dune', 'Marcus', 'Popcorn')..."
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Expenses Feed */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="h-4 w-4 text-indigo-400" />
            Group Bills & Settlements
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            Showing {filteredExpenses.length} of {expenses.length} Logged Bills
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 p-12 text-center text-xs text-zinc-500 space-y-3">
            <Users className="mx-auto h-8 w-8 text-zinc-600" />
            <p>
              {searchQuery || statusFilter !== 'ALL' || selectedGroup !== 'ALL'
                ? 'No expenses match the selected filters.'
                : 'No squad expenses recorded yet.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {(searchQuery || statusFilter !== 'ALL' || selectedGroup !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('ALL')
                    setSelectedGroup('ALL')
                  }}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 font-semibold text-zinc-300 hover:text-white"
                >
                  Reset Filters
                </button>
              )}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500"
              >
                Split Your First Cinema Bill
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map((exp) => {
              const pendingCount = exp.shares.filter(
                (s) => !isSharePaid(s) && s.userId !== exp.paidByUserId
              ).length
              const totalShares = exp.shares.length
              const paidShares = totalShares - pendingCount
              const settledPct = Math.round((paidShares / totalShares) * 100)
              const isSettled = pendingCount === 0

              return (
                <div
                  key={exp.id}
                  className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5 hover:border-zinc-700 transition shadow-lg"
                >
                  {/* Expense Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-400 shrink-0">
                        {exp.name.toLowerCase().includes('concession') ||
                        exp.name.toLowerCase().includes('f&b') ||
                        exp.name.toLowerCase().includes('popcorn') ? (
                          <UtensilsCrossed className="h-5 w-5 text-amber-400" />
                        ) : exp.name.toLowerCase().includes('uber') ||
                          exp.name.toLowerCase().includes('ride') ? (
                          <Car className="h-5 w-5 text-sky-400" />
                        ) : (
                          <Film className="h-5 w-5 text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{exp.name}</h4>
                          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[9px] font-mono text-zinc-400">
                            {exp.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span>
                            Paid in full by <strong className="text-zinc-200">{exp.paidByUserName}</strong>
                          </span>
                          <span>•</span>
                          <span>{new Date(exp.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <button
                        onClick={() => handleCopyExpenseSummary(exp)}
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-white hover:border-zinc-700 transition"
                        title="Copy Formatted Share Summary"
                      >
                        {copiedId === exp.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="h-3 w-3" />
                            <span>Share</span>
                          </>
                        )}
                      </button>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          isSettled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isSettled ? 'Fully Settled' : `${pendingCount} Pending`}
                      </span>
                      <span className="text-lg font-extrabold text-white font-mono">
                        ${exp.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Settlement Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-medium">
                        Settlement Progress: {paidShares} of {totalShares} Shares Settled ({settledPct}%)
                      </span>
                      <span className="text-zinc-400 font-mono font-semibold">
                        ${((exp.totalAmount * paidShares) / totalShares).toFixed(2)} / ${exp.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isSettled
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                        }`}
                        style={{ width: `${settledPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Shares Breakdown */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {exp.shares.map((share) => {
                      const isPayer = share.userId === exp.paidByUserId
                      const settleKey = `${exp.id}-${share.userId}`
                      const isCurrentlySettling = isSettling === settleKey

                      return (
                        <div
                          key={share.userId}
                          className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 hover:border-zinc-700 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-xs font-bold text-white shrink-0">
                              {share.userName.charAt(0)}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate">
                                {share.userName} {isPayer ? '(Host)' : ''}
                              </p>
                              <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                                ${share.shareAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 ml-2">
                            {isPayer ? (
                              <span className="flex items-center gap-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Host
                              </span>
                            ) : isSharePaid(share) ? (
                              <span className="flex items-center gap-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400">
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
          <div className="relative w-full max-w-xl rounded-3xl border border-indigo-500/30 bg-[#121214] p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Split a Cinema Bill</h3>
                  <p className="text-[11px] text-zinc-400">
                    Divide tickets, concessions, or rides across your movie squad
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Quick Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PRESETS.map((p) => {
                  const Icon = p.icon
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 hover:border-indigo-500/40 text-left text-xs font-semibold text-zinc-300 transition"
                    >
                      <Icon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <p className="truncate text-xs">{p.label}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">${p.amount}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
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
                  placeholder="e.g. 78.00"
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
                  Select Squad Members to Split With ({selectedMembers.length} selected)
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
                        {isChecked && (
                          <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 ml-1.5" />
                        )}
                      </button>
                    )
                  })}
                </div>
                {expenseTotal && parseFloat(expenseTotal) > 0 && selectedMembers.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Each Member Pays:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ${(parseFloat(expenseTotal) / selectedMembers.length).toFixed(2)}
                    </span>
                  </div>
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
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50 shadow-lg shadow-indigo-600/30"
                >
                  {isCreatingExpense ? 'Dividing...' : 'Create & Divide Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Squad Group Modal */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-indigo-500/30 bg-[#121214] p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Movie Squad</h3>
                  <p className="text-[11px] text-zinc-400">
                    Form a recurring screening group for bill splitting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                  Squad Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nolan 70mm Fanatics or Late Night Crew"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekend screenings and gourmet concessions"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2">
                  Select Initial Members ({groupMembers.length} selected)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isChecked = groupMembers.includes(u.id)
                    const displayName = getUserDisplayName(u)
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => toggleGroupMemberSelection(u.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
                          isChecked
                            ? 'border-indigo-500 bg-indigo-600/20 text-white'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="truncate">{displayName}</span>
                        {isChecked && (
                          <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 ml-1" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50 shadow-lg shadow-indigo-600/30"
                >
                  {isCreatingGroup ? 'Creating...' : 'Create Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
