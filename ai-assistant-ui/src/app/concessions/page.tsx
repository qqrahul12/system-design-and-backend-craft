'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  UtensilsCrossed,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Flame,
  Coffee,
  Heart,
  Tag,
  Info,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  CreditCard,
  Wallet,
  X,
  Ticket,
  CheckCircle2,
  ChefHat,
  Truck,
  Users,
} from 'lucide-react'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

interface ConcessionItem {
  id: string
  name: string
  category: 'POPCORN' | 'BEVERAGES' | 'SNACKS' | 'GOURMET'
  price: number
  calories: number
  icon: string
  dietary: string[]
  genrePairings: string[]
  description: string
}

interface ConcessionCombo {
  id: string
  name: string
  items: ConcessionItem[]
  originalPrice: number
  comboPrice: number
  savings: number
  aiRationale: string
  matchedGenre: string
}

interface UserTicket {
  ticketId: string
  movieTitle: string
  showTime?: string
  format?: string
  auditorium?: string
  seats: string[]
  status?: string
}

const GENRES = ['Sci-Fi', 'Action', 'Drama', 'Epic', 'Horror', 'Romance']

function ConcessionsContent() {
  const searchParams = useSearchParams()
  const movieParam = searchParams.get('movie')
  const seatsParam = searchParams.get('seats')
  const auditoriumParam = searchParams.get('auditorium')

  const [menu, setMenu] = useState<ConcessionItem[]>([])
  const [combos, setCombos] = useState<ConcessionCombo[]>([])
  const [selectedGenre, setSelectedGenre] = useState(
    movieParam && (movieParam.toLowerCase().includes('dune') || movieParam.toLowerCase().includes('interstellar'))
      ? 'Sci-Fi'
      : 'Action'
  )
  const [partySize, setPartySize] = useState(2)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [isLoadingCombos, setIsLoadingCombos] = useState(false)
  const [addedNotice, setAddedNotice] = useState<string | null>(null)

  // Active Movie Passes & Seat Selector State
  const [userTickets, setUserTickets] = useState<UserTicket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  // Checkout & Live Kitchen Tracker State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [deliverySeat, setDeliverySeat] = useState(
    seatsParam
      ? `${auditoriumParam ? auditoriumParam + ', ' : ''}Seat ${seatsParam.split(',')?.[0]}`
      : 'Express VIP Pickup Counter'
  )
  const [activeOrder, setActiveOrder] = useState<{
    orderId: string
    total: number
    seat: string
    itemsCount: number
    status: 'PREPARING' | 'READY' | 'DELIVERED'
    estimatedMinutes: number
  } | null>(null)
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false)
  const [liveStreamConnected, setLiveStreamConnected] = useState<boolean>(false)
  const [isAdvancingStatus, setIsAdvancingStatus] = useState<boolean>(false)
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'CARD'>('WALLET')
  const [walletBalance, setWalletBalance] = useState<number>(175.00)

  // SplitMoney Integration State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false)
  const [splitExpenseData, setSplitExpenseData] = useState<any>(null)
  const [isSettlingShare, setIsSettlingShare] = useState(false)

  const handleOpenSplitModal = async (order: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/split/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Gourmet F&B Order (${order.orderId} - Seat ${order.seat})`,
          totalAmount: order.totalPrice,
          paidByUserId: 'usr-marcus',
          referenceType: 'CONCESSION_ORDER',
          referenceId: order.orderId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSplitExpenseData(data)
        setIsSplitModalOpen(true)
      }
    } catch (err) {
      console.warn('Failed to split F&B bill via SplitMoney:', err)
    }
  }

  const handleSettleShare = async (expenseId: string, debtorUserId: string, method: string) => {
    setIsSettlingShare(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/split/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId,
          debtorUserId,
          paymentMethod: method,
        }),
      })
      if (res.ok) {
        const expRes = await fetch(`${API_BASE}/api/v1/split/expenses`)
        if (expRes.ok) {
          const list = await expRes.json()
          const updated = list.find((e: any) => e.id === expenseId)
          if (updated) setSplitExpenseData(updated)
        }
        setAddedNotice(`🎉 Squad member settled their F&B share via ${method === 'WALLET' ? 'CineCash Wallet' : 'Stripe Card Gateway'}!`)
        setTimeout(() => setAddedNotice(null), 4000)
      }
    } catch (err) {
      console.warn('Failed to settle F&B share:', err)
    } finally {
      setIsSettlingShare(false)
    }
  }

  const playKitchenChime = (kind: 'order' | 'plated' | 'delivered') => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      if (kind === 'order') {
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.15)
      } else if (kind === 'plated') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime)
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      } else if (kind === 'delivered') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime)
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08)
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16)
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.24)
        gain.gain.setValueAtTime(0.09, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.45)
      }
    } catch {}
  }

  useEffect(() => {
    fetchMenu()
    fetchCombos(selectedGenre, partySize)
    fetchOrders()
    fetchTickets()
    fetchWallet()

    // SSE Stream for Real-Time Kitchen Order Updates
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource(`${API_BASE}/api/v1/concessions/orders/stream`)
      eventSource.onopen = () => setLiveStreamConnected(true)
      eventSource.addEventListener('order-update', (e) => {
        try {
          const updated = JSON.parse(e.data)
          if (!updated) return
          setAllOrders((prev) => {
            const idx = prev.findIndex((o) => o.orderId === updated.orderId)
            if (idx >= 0) {
              const copy = [...prev]
              copy[idx] = updated
              return copy
            }
            return [updated, ...prev]
          })

          setActiveOrder((prev) => {
            if (!prev || prev.orderId === updated.orderId) {
              const status = updated.status === 'DELIVERED'
                ? 'DELIVERED'
                : updated.status === 'PLATED' || updated.status === 'READY'
                ? 'READY'
                : 'PREPARING'

              if (status === 'READY') playKitchenChime('plated')
              if (status === 'DELIVERED') playKitchenChime('delivered')

              return {
                orderId: updated.orderId,
                total: updated.totalAmount || prev?.total || 18.5,
                seat: updated.deliverySeat || prev?.seat || 'VIP Seat',
                itemsCount: updated.items?.length || prev?.itemsCount || 1,
                status,
                estimatedMinutes: updated.estimatedMinutes ?? 0,
              }
            }
            return prev
          })
        } catch {}
      })
      eventSource.onerror = () => setLiveStreamConnected(false)
    } catch {
      setLiveStreamConnected(false)
    }

    return () => {
      if (eventSource) eventSource.close()
    }
  }, [])

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/tickets`)
      let list: UserTicket[] = []
      if (res.ok) {
        const raw = await res.json()
        if (Array.isArray(raw)) {
          list = raw
        }
      }

      // If query parameters provided (e.g. redirected from booking confirmation)
      if (movieParam && seatsParam) {
        const parsedSeats = seatsParam.split(',').map((s) => s.trim()).filter(Boolean)
        const match = list.find((t) => t.movieTitle.toLowerCase() === movieParam.toLowerCase())
        if (match) {
          setSelectedTicketId(match.ticketId)
        } else {
          const synth: UserTicket = {
            ticketId: `PASS-URL-${Date.now().toString().slice(-4)}`,
            movieTitle: movieParam,
            showTime: 'Current Screening',
            format: 'IMAX 70mm',
            auditorium: auditoriumParam || 'IMAX 70mm Auditorium 1',
            seats: parsedSeats,
            status: 'ISSUED',
          }
          list = [synth, ...list]
          setSelectedTicketId(synth.ticketId)
        }
        const aud = auditoriumParam || match?.auditorium || 'Auditorium 1'
        if (parsedSeats.length === 1) {
          setDeliverySeat(`${aud}, Seat ${parsedSeats[0]}`)
        } else if (parsedSeats.length > 1) {
          setDeliverySeat(`${aud}, Seats ${parsedSeats.join(', ')}`)
        }
      } else if (list.length > 0) {
        const latest = list[list.length - 1]
        setSelectedTicketId(latest.ticketId)
        const aud = latest.auditorium || 'Auditorium 1'
        if (latest.seats && latest.seats.length > 0) {
          if (latest.seats.length === 1) {
            setDeliverySeat(`${aud}, Seat ${latest.seats[0]}`)
          } else {
            setDeliverySeat(`${aud}, Seats ${latest.seats.join(', ')}`)
          }
        }
      }
      setUserTickets(list)
    } catch (err) {
      console.warn('Failed to fetch user tickets:', err)
    }
  }

  const handleSelectTicket = (ticket: UserTicket) => {
    setSelectedTicketId(ticket.ticketId)
    const aud = ticket.auditorium || 'Auditorium 1'
    if (ticket.seats && ticket.seats.length > 0) {
      if (ticket.seats.length === 1) {
        setDeliverySeat(`${aud}, Seat ${ticket.seats[0]}`)
      } else {
        setDeliverySeat(`${aud}, Seats ${ticket.seats.join(', ')}`)
      }
    }

    // Auto-harmonize culinary genre to selected movie
    const title = ticket.movieTitle.toLowerCase()
    let g = 'Action'
    if (title.includes('dune') || title.includes('interstellar') || title.includes('sci-fi') || title.includes('tron') || title.includes('matrix')) {
      g = 'Sci-Fi'
    } else if (title.includes('oppenheimer') || title.includes('drama') || title.includes('godfather')) {
      g = 'Drama'
    } else if (title.includes('horror') || title.includes('alien') || title.includes('conjuring') || title.includes('nosferatu')) {
      g = 'Horror'
    } else if (title.includes('gladiator') || title.includes('batman') || title.includes('wick') || title.includes('avengers')) {
      g = 'Action'
    } else if (title.includes('epic') || title.includes('lord of the rings')) {
      g = 'Epic'
    } else if (title.includes('romance') || title.includes('love')) {
      g = 'Romance'
    }
    handleGenreChange(g)
    showNotice(`Active pass switched to "${ticket.movieTitle}". F&B pairings recalculated.`)
  }

  const handleSelectSeatDestination = (destination: string) => {
    setDeliverySeat(destination)
    showNotice(`Delivery destination set to: ${destination}`)
  }

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/wallet`)
      if (res.ok) {
        const data = await res.json()
        setWalletBalance(data.balance)
      }
    } catch {}
  }

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/concessions/orders`)
      if (res.ok) {
        const data = await res.json()
        setAllOrders(data)
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[0]
          setActiveOrder({
            orderId: latest.orderId,
            total: latest.totalAmount,
            seat: latest.deliverySeat,
            itemsCount: latest.items?.length || 1,
            status: latest.status === 'PREPARING' ? 'PREPARING' : 'READY',
            estimatedMinutes: latest.estimatedMinutes || 6,
          })
        }
      }
    } catch (e) {
      console.warn('Failed to fetch orders:', e)
    }
  }

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/concessions/menu`)
      if (res.ok) {
        const data = await res.json()
        setMenu(data)
      }
    } catch (e) {
      console.warn('Failed to fetch menu:', e)
    }
  }

  const fetchCombos = async (genre: string, size: number) => {
    setIsLoadingCombos(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/concessions/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre, partySize: size }),
      })
      if (res.ok) {
        const data = await res.json()
        setCombos(data)
      }
    } catch (e) {
      console.warn('Failed to fetch combos:', e)
    } finally {
      setIsLoadingCombos(false)
    }
  }

  const handleGenreChange = (g: string) => {
    setSelectedGenre(g)
    fetchCombos(g, partySize)
  }

  const addToCart = (item: ConcessionItem) => {
    setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))
    showNotice(`Added ${item.name} to order`)
  }

  const decrementCart = (itemId: string) => {
    setCart((prev) => {
      const current = prev[itemId] || 0
      if (current <= 1) {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      }
      return { ...prev, [itemId]: current - 1 }
    })
  }

  const addComboToCart = (combo: ConcessionCombo) => {
    setCart((prev) => {
      const updated = { ...prev }
      combo.items.forEach((item) => {
        updated[item.id] = (updated[item.id] || 0) + 1
      })
      return updated
    })
    showNotice(`Added ${combo.name} combo to order!`)
  }

  const handleAdvanceStatus = async (targetStatus: string) => {
    if (!activeOrder || isAdvancingStatus) return
    setIsAdvancingStatus(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/concessions/orders/${activeOrder.orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        const st = updated.status === 'DELIVERED' ? 'DELIVERED' : updated.status === 'PLATED' ? 'READY' : 'PREPARING'
        setActiveOrder((prev) => prev ? {
          ...prev,
          status: st,
          estimatedMinutes: updated.estimatedMinutes,
        } : null)
        if (st === 'READY') playKitchenChime('plated')
        if (st === 'DELIVERED') playKitchenChime('delivered')
        showNotice(`Kitchen status updated: ${updated.status}`)
      }
    } catch (e) {
      console.warn('Failed to advance order status:', e)
    } finally {
      setIsAdvancingStatus(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (cartItemCount === 0 || isPlacingOrder) return
    setIsPlacingOrder(true)

    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menu.find((i) => i.id === itemId)
      return {
        name: item?.name || itemId,
        qty,
        price: item?.price || 0,
      }
    })

    try {
      if (paymentMethod === 'WALLET') {
        try {
          const wRes = await fetch(`${API_BASE}/api/v1/wallet/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: cartTotal,
              type: 'CONCESSION_PAYMENT',
              description: `Gourmet Concessions (${cartItemCount} items to ${deliverySeat})`,
            }),
          })
          if (wRes.ok) {
            const wTxn = await wRes.json()
            setWalletBalance(wTxn.balanceAfter)
          }
        } catch {}
      }

      const res = await fetch(`${API_BASE}/api/v1/concessions/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          deliverySeat,
          total: cartTotal,
        }),
      })

      if (res.ok) {
        const orderData = await res.json()
        setActiveOrder({
          orderId: orderData.orderId || '#FB-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          total: cartTotal,
          seat: deliverySeat,
          itemsCount: cartItemCount,
          status: 'PREPARING',
          estimatedMinutes: 8,
        })
        playKitchenChime('order')
        setCart({})
        setIsCheckoutOpen(false)
        showNotice(
          paymentMethod === 'WALLET'
            ? `Paid $${cartTotal.toFixed(2)} via CineMind Wallet! Dispatched to kitchen.`
            : 'Gourmet concessions order dispatched to kitchen!'
        )
      }
    } catch {
      // Local fallback
      setActiveOrder({
        orderId: '#FB-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        total: cartTotal,
        seat: deliverySeat,
        itemsCount: cartItemCount,
        status: 'PREPARING',
        estimatedMinutes: 8,
      })
      playKitchenChime('order')
      setCart({})
      setIsCheckoutOpen(false)
      showNotice('Gourmet concessions order placed!')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const showNotice = (msg: string) => {
    setAddedNotice(msg)
    setTimeout(() => setAddedNotice(null), 3000)
  }

  // Filtered menu
  const filteredMenu = menu.filter((item) => {
    if (selectedCategory === 'ALL') return true
    return item.category === selectedCategory
  })

  // Cart Calculations
  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartSubtotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = menu.find((i) => i.id === itemId)
    return sum + (item ? item.price * qty : 0)
  }, 0)
  const cartTax = Math.round(cartSubtotal * 0.08 * 100) / 100
  const cartTotal = Math.round((cartSubtotal + cartTax) * 100) / 100

  const activeTicket = userTickets.find((t) => t.ticketId === selectedTicketId) || (userTickets.length > 0 ? userTickets[0] : null)

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Toast Notification */}
      {addedNotice && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/90 px-5 py-3 text-sm text-amber-200 shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-amber-400" />
          <span>{addedNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-lg shadow-rose-500/20">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              CineMind Gourmet F&B Studio
            </h1>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
              AI Sensory Pairings
            </span>
          </div>
          <p className="mt-1.5 text-sm text-[#888]">
            {movieParam ? (
              <span>
                Personalized culinary pairings for <strong className="text-white">{movieParam}</strong> {seatsParam ? `(Seat ${seatsParam})` : ''}.
              </span>
            ) : (
              'Machine learning culinary recommendations matching snack flavor profiles, aromas, and beverages to movie genres.'
            )}
          </p>
        </div>

        {/* Live Cart Floating Pill */}
        <button
          onClick={() => setIsCheckoutOpen(true)}
          className="flex items-center gap-3 bg-[#141414] border border-[#2a2a2a] hover:border-amber-500/40 rounded-xl px-4 py-2.5 shadow transition active:scale-95"
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5 text-amber-400" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                {cartItemCount}
              </span>
            )}
          </div>
          <div className="text-left text-xs">
            <p className="font-semibold text-white">Your Tray (${cartTotal.toFixed(2)})</p>
            <p className="text-[10px] text-[#666]">{cartItemCount} gourmet items</p>
          </div>
        </button>
      </div>

      {/* Live Kitchen Order Tracker (if an order was placed) */}
      {activeOrder && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-zinc-900 to-zinc-950 p-6 space-y-4 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <ChefHat className="h-5 w-5 text-amber-400 animate-bounce" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Active Order: {activeOrder.orderId}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                      liveStreamConnected
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        liveStreamConnected ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'
                      }`}
                    />
                    {liveStreamConnected ? 'SSE Kitchen Stream' : 'Live Sync'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">Seat: {activeOrder.seat}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-amber-300 font-mono bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {activeOrder.status === 'DELIVERED'
                  ? 'DELIVERED'
                  : activeOrder.status === 'READY'
                  ? 'READY FOR DELIVERY (~1 MIN)'
                  : `PREP IN PROGRESS (~${activeOrder.estimatedMinutes} MIN)`}
              </span>

              {/* Expediter Stage Fast-Forward Controls */}
              {activeOrder.status === 'PREPARING' && (
                <button
                  onClick={() => handleAdvanceStatus('PLATED')}
                  disabled={isAdvancingStatus}
                  className="flex items-center gap-1 rounded-xl bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                  title="Simulate kitchen chef finishing prep"
                >
                  <Sparkles className="h-3 w-3" /> Mark Plated
                </button>
              )}
              {activeOrder.status === 'READY' && (
                <button
                  onClick={() => handleAdvanceStatus('DELIVERED')}
                  disabled={isAdvancingStatus}
                  className="flex items-center gap-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
                  title="Simulate in-seat usher delivery"
                >
                  <Truck className="h-3 w-3" /> Mark Delivered
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOrderHistoryOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300 hover:text-white transition"
              >
                <Clock className="h-3.5 w-3.5 text-amber-400" /> Order History ({allOrders.length})
              </button>

              <Link
                href="/tickets"
                className="flex items-center gap-1.5 rounded-xl bg-purple-600/30 border border-purple-500/40 px-3 py-1 text-xs font-semibold text-purple-300 hover:bg-purple-600/40 transition"
              >
                <Ticket className="h-3.5 w-3.5" /> View Pass Wallet
              </Link>

              <button
                type="button"
                onClick={() => handleOpenSplitModal(activeOrder)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600/30 border border-indigo-500/40 px-3 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/40 transition active:scale-95"
              >
                <Users className="h-3.5 w-3.5 text-indigo-400" /> Split F&B Bill (SplitMoney)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
            {/* Step 1: Order Verified */}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <p className="font-bold text-white">Order Received</p>
                <p className="text-zinc-500 text-[10px]">Payment verified & routed to kitchen</p>
              </div>
            </div>

            {/* Step 2: Artisanal Batch Prep */}
            <div className="flex items-center gap-2.5">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${
                  activeOrder.status === 'READY' || activeOrder.status === 'DELIVERED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400 animate-pulse'
                }`}
              >
                {activeOrder.status === 'READY' || activeOrder.status === 'DELIVERED' ? '✓' : '2'}
              </div>
              <div>
                <p
                  className={`font-bold ${
                    activeOrder.status === 'PREPARING'
                      ? 'text-amber-300'
                      : activeOrder.status === 'READY' || activeOrder.status === 'DELIVERED'
                      ? 'text-emerald-400'
                      : 'text-zinc-400'
                  }`}
                >
                  Artisanal Batch Prep
                </p>
                <p className="text-zinc-500 text-[10px]">
                  {activeOrder.status === 'PREPARING'
                    ? 'Truffle infusion & beverage tapping'
                    : 'Plated & thermal wrapped'}
                </p>
              </div>
            </div>

            {/* Step 3: In-Theater Delivery */}
            <div className="flex items-center gap-2.5">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${
                  activeOrder.status === 'DELIVERED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : activeOrder.status === 'READY'
                    ? 'bg-amber-500/20 text-amber-300 animate-bounce'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {activeOrder.status === 'DELIVERED' ? '✓' : <Truck className="h-4 w-4" />}
              </div>
              <div>
                <p
                  className={`font-bold ${
                    activeOrder.status === 'DELIVERED'
                      ? 'text-emerald-400'
                      : activeOrder.status === 'READY'
                      ? 'text-amber-300'
                      : 'text-zinc-400'
                  }`}
                >
                  In-Theater Delivery
                </p>
                <p className="text-zinc-500 text-[10px]">
                  {activeOrder.status === 'DELIVERED'
                    ? `Hand-delivered to ${activeOrder.seat}!`
                    : activeOrder.status === 'READY'
                    ? `Usher en route to ${activeOrder.seat}`
                    : `Dispatches when plated`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Theatrical Pass & Seat Delivery Destination Pod */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-zinc-900 to-zinc-950 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Ticket className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Active Theatrical Pass & Seat Delivery</h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  Seat-Connected
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Gourmet treats, chef bites, and craft beverages are delivered directly to your cup holder before the show begins.
              </p>
            </div>
          </div>

          {userTickets.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span>Multiple Bookings:</span>
              <span className="font-bold text-amber-400">{userTickets.length} Passes Active</span>
            </div>
          )}
        </div>

        {/* Multiple Bookings Switcher (if user has multiple tickets) */}
        {userTickets.length > 1 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Switch Active Booking:
            </div>
            <div className="flex flex-wrap gap-2">
              {userTickets.map((t) => {
                const isSelected = activeTicket?.ticketId === t.ticketId
                return (
                  <button
                    key={t.ticketId}
                    type="button"
                    onClick={() => handleSelectTicket(t)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10 ring-1 ring-amber-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <Ticket className="h-3.5 w-3.5 text-amber-400" />
                    <span>{t.movieTitle}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      ({t.seats && t.seats.length > 0 ? t.seats.join(', ') : 'VIP'})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Pass Details & Seat Destination Selector */}
        {activeTicket ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-white text-sm">{activeTicket.movieTitle}</span>
                <span className="text-zinc-500 mx-2">•</span>
                <span className="text-zinc-400">{activeTicket.auditorium || 'Auditorium 1'}</span>
                <span className="text-zinc-500 mx-2">•</span>
                <span className="text-zinc-400">{activeTicket.showTime || 'Today'}</span>
                {activeTicket.format && (
                  <span className="ml-2 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/30">
                    {activeTicket.format}
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400">
                Current Delivery Target: <strong className="text-amber-400 font-mono">{deliverySeat}</strong>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Select Delivery Destination for this Order:
              </label>
              <div className="flex flex-wrap gap-2">
                {activeTicket.seats && activeTicket.seats.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectSeatDestination(
                        `${activeTicket.auditorium || 'Auditorium 1'}, Seats ${activeTicket.seats.join(', ')}`
                      )
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                      deliverySeat ===
                      `${activeTicket.auditorium || 'Auditorium 1'}, Seats ${activeTicket.seats.join(', ')}`
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm shadow-amber-500/30'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    👥 All Booked Seats ({activeTicket.seats.join(', ')})
                  </button>
                )}

                {activeTicket.seats &&
                  activeTicket.seats.map((seat) => {
                    const fullTarget = `${activeTicket.auditorium || 'Auditorium 1'}, Seat ${seat}`
                    const isSelected = deliverySeat === fullTarget
                    return (
                      <button
                        key={seat}
                        type="button"
                        onClick={() => handleSelectSeatDestination(fullTarget)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm shadow-amber-500/30'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        💺 Seat {seat}
                      </button>
                    )
                  })}

                <button
                  type="button"
                  onClick={() => handleSelectSeatDestination('Express VIP Pickup Counter')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                    deliverySeat === 'Express VIP Pickup Counter'
                      ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm shadow-amber-500/30'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  🛎️ Express VIP Pickup Counter
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-zinc-400 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <span>No active tickets found in session. Destination defaults to Express VIP Counter.</span>
            <Link href="/booking" className="text-purple-400 hover:underline font-semibold">
              Book Tickets First &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Genre Selector for AI Recommendations */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">AI Sensory Flavor Match</h3>
            <span className="text-xs text-zinc-500">• Select movie genre to recalculate culinary harmonies</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreChange(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedGenre === g
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* AI Combo Recommendation Card */}
        {combos.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">{combos[0].name}</h4>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Save ${combos[0].savings.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => addComboToCart(combos[0])}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition active:scale-95 shadow-md shadow-amber-500/20"
              >
                <Plus className="h-3.5 w-3.5" /> Add Curated Combo (${combos[0].comboPrice.toFixed(2)})
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{combos[0].aiRationale}</p>
          </div>
        )}
      </div>

      {/* Menu Categories Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 className="text-base font-bold text-white">Theatrical Menu</h3>
        <div className="flex gap-2">
          {['ALL', 'POPCORN', 'BEVERAGES', 'SNACKS'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMenu.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between hover:border-zinc-700 transition space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                    <span className="text-[11px] text-zinc-500 font-mono">{item.calories} Calories</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 font-mono bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  ${item.price.toFixed(2)}
                </span>
              </div>

              <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{item.description}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.dietary.map((d, didx) => (
                  <span
                    key={didx}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                Pairs with: {item.genrePairings.slice(0, 2).join(', ')}
              </span>

              {cart[item.id] ? (
                <div className="flex items-center gap-2 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => decrementCart(item.id)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-bold text-white">{cart[item.id]}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="p-1 text-amber-400 hover:text-white"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Checkout Drawer / Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-6">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-zinc-400 hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Your Concessions Order</h3>
            </div>

            {/* Cart Items List */}
            {cartItemCount > 0 ? (
              <div className="space-y-4">
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-800">
                  {Object.entries(cart).map(([itemId, qty]) => {
                    const item = menu.find((i) => i.id === itemId)
                    if (!item) return null
                    return (
                      <div key={itemId} className="flex justify-between items-center pt-2 text-xs">
                        <div>
                          <span className="font-bold text-white block">{item.name}</span>
                          <span className="text-zinc-500">${item.price.toFixed(2)} each</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrementCart(itemId)}
                            className="p-1 text-zinc-400 hover:text-white bg-zinc-800 rounded"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-bold text-white w-4 text-center">{qty}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-1 text-amber-400 hover:text-white bg-zinc-800 rounded"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <span className="font-mono font-bold text-emerald-400 ml-2 w-14 text-right">
                            ${(item.price * qty).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Delivery Seat Selector */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Theater Seat Delivery Destination:
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">In-Seat Service</span>
                  </div>

                  {/* Quick Seat Chips from active pass */}
                  {activeTicket && activeTicket.seats && activeTicket.seats.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {activeTicket.seats.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeliverySeat(
                              `${activeTicket.auditorium || 'Auditorium 1'}, Seats ${activeTicket.seats.join(', ')}`
                            )
                          }
                          className={`text-[10px] px-2 py-0.5 rounded border transition ${
                            deliverySeat ===
                            `${activeTicket.auditorium || 'Auditorium 1'}, Seats ${activeTicket.seats.join(', ')}`
                              ? 'bg-amber-500 text-black border-amber-400 font-bold'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          All ({activeTicket.seats.join(', ')})
                        </button>
                      )}
                      {activeTicket.seats.map((seat) => {
                        const fullTarget = `${activeTicket.auditorium || 'Auditorium 1'}, Seat ${seat}`
                        const isSelected = deliverySeat === fullTarget
                        return (
                          <button
                            key={seat}
                            type="button"
                            onClick={() => setDeliverySeat(fullTarget)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition ${
                              isSelected
                                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            Seat {seat}
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => setDeliverySeat('Express VIP Pickup Counter')}
                        className={`text-[10px] px-2 py-0.5 rounded border transition ${
                          deliverySeat === 'Express VIP Pickup Counter'
                            ? 'bg-amber-500 text-black border-amber-400 font-bold'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        VIP Counter
                      </button>
                    </div>
                  )}

                  <input
                    type="text"
                    value={deliverySeat}
                    onChange={(e) => setDeliverySeat(e.target.value)}
                    placeholder="e.g. Auditorium 1, Seat B3"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Artisanal treats delivered directly to your cup holder before previews end.
                  </p>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">Payment Method:</span>
                    <span className="text-[11px] text-zinc-500 font-mono">1-Click Auth</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('WALLET')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-semibold border transition ${
                        paymentMethod === 'WALLET'
                          ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 shadow-sm shadow-amber-500/20'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Wallet className="h-3.5 w-3.5 text-amber-400" />
                      <span>Wallet (${walletBalance.toFixed(2)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-semibold border transition ${
                        paymentMethod === 'CARD'
                          ? 'bg-purple-500/15 border-purple-500/80 text-purple-300 shadow-sm shadow-purple-500/20'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="h-3.5 w-3.5 text-purple-400" />
                      <span>Card (Stripe)</span>
                    </button>
                  </div>
                  {paymentMethod === 'WALLET' && (
                    <p className="text-[10px] text-amber-400/90 flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5" />
                      Debits stored CineCash balance with zero fees & instant kitchen dispatch.
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-1 text-xs border-t border-zinc-800 pt-3 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-white">${cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sales Tax (8%)</span>
                    <span className="text-white">${cartTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-zinc-800">
                    <span>Total</span>
                    <span className="text-emerald-400">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-black font-bold text-xs hover:opacity-90 transition active:scale-95 shadow-lg shadow-amber-500/20"
                >
                  {isPlacingOrder ? 'Dispatching to Kitchen...' : `Confirm & Pay with ${paymentMethod === 'WALLET' ? 'Wallet' : 'Card'} ($${cartTotal.toFixed(2)})`}
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 space-y-2">
                <ShoppingBag className="h-8 w-8 mx-auto text-zinc-600" />
                <p className="text-xs">Your tray is currently empty.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SplitMoney Squad Bill Splitting Modal */}
      {isSplitModalOpen && splitExpenseData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-[#121214] p-6 shadow-2xl space-y-5 my-8">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Users className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Split F&B Bill with Squad
                  </h3>
                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                    SplitMoney Domain
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  {splitExpenseData.name}
                </p>
              </div>
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total & Summary Banner */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Total Gourmet Bill
                </span>
                <p className="text-2xl font-black text-white">
                  ${splitExpenseData.totalAmount?.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Covered By
                </span>
                <p className="text-sm font-semibold text-zinc-200">
                  {splitExpenseData.paidByUserName} (You)
                </p>
              </div>
            </div>

            {/* Squad Members Breakdown */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Squad Shares ({splitExpenseData.shares?.length ?? 0} members)
              </span>
              <div className="space-y-2">
                {splitExpenseData.shares?.map((share: any) => {
                  const isPayer = share.userId === splitExpenseData.paidByUserId
                  return (
                    <div
                      key={share.userId}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow">
                          {share.userName?.charAt(0) ?? 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            {share.userName} {isPayer ? '(You)' : ''}
                          </p>
                          <p className="text-[11px] font-mono text-zinc-400">
                            ${share.shareAmount?.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isPayer ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded-lg">
                            <CheckCircle2 className="h-3 w-3" /> Payer (Settled)
                          </span>
                        ) : share.isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded-lg">
                            <CheckCircle2 className="h-3 w-3" /> Paid ({share.paymentMethod})
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSettleShare(splitExpenseData.id, share.userId, 'WALLET')}
                              disabled={isSettlingShare}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-600/30 transition disabled:opacity-50"
                              title="Settle using CineCash Wallet"
                            >
                              <Wallet className="h-2.5 w-2.5" /> Wallet
                            </button>
                            <button
                              onClick={() => handleSettleShare(splitExpenseData.id, share.userId, 'STRIPE_CARD')}
                              disabled={isSettlingShare}
                              className="flex items-center gap-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-2 py-1 text-[10px] font-bold text-indigo-300 hover:bg-indigo-600/30 transition disabled:opacity-50"
                              title="Settle using Stripe Card Gateway"
                            >
                              <CreditCard className="h-2.5 w-2.5" /> Card
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <span className="text-[11px] text-zinc-500">
                Split equal among squad. 1-click settlements update ledger.
              </span>
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F&B Order History Modal */}
      {isOrderHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl border border-amber-500/30 bg-[#121214] p-7 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Gourmet F&B Order History</h3>
                  <p className="text-[11px] text-zinc-400">
                    All culinary orders placed to your auditorium seat or VIP express pickup
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOrderHistoryOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {allOrders.length === 0 ? (
                <div className="text-center p-8 text-xs text-zinc-500">
                  No previous F&B orders recorded yet.
                </div>
              ) : (
                allOrders.map((ord: any) => {
                  const statusColors =
                    ord.status === 'DELIVERED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : ord.status === 'PLATED' || ord.status === 'READY'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'

                  return (
                    <div
                      key={ord.orderId}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-white text-xs">{ord.orderId}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-xs text-zinc-300 font-semibold">{ord.deliverySeat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${statusColors}`}>
                            {ord.status}
                          </span>
                          <span className="font-mono font-bold text-white text-xs">
                            ${(ord.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="text-xs text-zinc-400">
                        {ord.items && ord.items.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {ord.items.map((it: any, idx: number) => (
                              <span
                                key={idx}
                                className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300"
                              >
                                {it.name || 'Gourmet Selection'} x{it.quantity || 1}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span>Gourmet Cinema Selection</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                        <span>{ord.createdAt ? new Date(ord.createdAt).toLocaleString() : 'Recent'}</span>
                        <button
                          onClick={() => {
                            setActiveOrder({
                              orderId: ord.orderId,
                              total: ord.totalAmount,
                              seat: ord.deliverySeat,
                              itemsCount: ord.items?.length || 1,
                              status: ord.status === 'PREPARING' ? 'PREPARING' : 'READY',
                              estimatedMinutes: ord.estimatedMinutes || 5,
                            })
                            setIsOrderHistoryOpen(false)
                            showNotice(`Tracking order ${ord.orderId} in live monitor`)
                          }}
                          className="text-amber-400 hover:text-amber-300 font-semibold"
                        >
                          Track in Live Monitor →
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-800">
              <button
                onClick={() => setIsOrderHistoryOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConcessionsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-zinc-500">Loading F&B Studio...</div>}>
      <ConcessionsContent />
    </Suspense>
  )
}
