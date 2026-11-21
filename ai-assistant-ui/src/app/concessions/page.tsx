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
  Receipt,
  DollarSign,
  Printer,
  Store,
  ChevronDown,
  ChevronUp,
  Search,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import {
  splitService,
  authService,
  concessionsService,
  ticketService,
  walletService,
  movieService,
  Permissions,
  rbacPolicyEngine,
} from '@/services'
import { Toast, type ToastMessage } from '@/components/ui/AlertToast'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

interface ConcessionItem {
  id: string
  name: string
  category: string
  price: number
  calories: number
  icon: string
  dietary?: string[]
  dietaryTags?: string[]
  genrePairings?: string[]
  description: string
  inStock?: boolean
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
  const [selectedDietary, setSelectedDietary] = useState<string>('ALL')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [isLoadingCombos, setIsLoadingCombos] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)

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
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [personas, setPersonas] = useState<any[]>([])
  const [circuitAuditoriums, setCircuitAuditoriums] = useState<any[]>([])

  // Staff POS Counter Mode State
  // Role-Aligned Concessions Mode: Patron Self-Order vs Staff POS Counter vs Usher Delivery Checklist
  const [concessionsViewMode, setConcessionsViewMode] = useState<'PATRON' | 'POS_COUNTER' | 'USHER_DISPATCH'>('PATRON')
  const [usherAuditoriumFilter, setUsherAuditoriumFilter] = useState<string>('ALL')
  const [posCustomerType, setPosCustomerType] = useState<'WALK_UP' | 'PATRON_SEAT'>('WALK_UP')
  const [posCustomerName, setPosCustomerName] = useState<string>('Walk-up Guest')
  const [posDiscountType, setPosDiscountType] = useState<'NONE' | 'STAFF_20' | 'VIP_COMP'>('NONE')
  const [cashTendered, setCashTendered] = useState<number>(0)
  const [posPaymentType, setPosPaymentType] = useState<'CARD' | 'CASH' | 'WALLET'>('CARD')
  const [posReceiptModal, setPosReceiptModal] = useState<any>(null)
  const [posSearchTerm, setPosSearchTerm] = useState<string>('')
  const [isKitchenQueueOpen, setIsKitchenQueueOpen] = useState<boolean>(false)

  useEffect(() => {
    authService.getCurrentUser()
      .then((u) => {
        setCurrentUser(u)
        if (u) {
          if (u.role === 'AUDITORIUM_USHER') {
            setConcessionsViewMode('USHER_DISPATCH')
          } else if (u.role === 'CINEMA_MANAGER' || u.role === 'EXECUTIVE_ADMIN') {
            setConcessionsViewMode('POS_COUNTER')
          } else {
            setConcessionsViewMode('PATRON')
          }
        }
      })
      .catch(() => setCurrentUser(null))

    authService.getPersonas()
      .then((p) => {
        if (p && Array.isArray(p)) setPersonas(p)
      })
      .catch(() => {})

    movieService.getAuditoriums()
      .then((auds: any) => {
        if (auds && Array.isArray(auds)) setCircuitAuditoriums(auds)
      })
      .catch(() => {})
  }, [])

  // SplitMoney Integration State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false)
  const [splitExpenseData, setSplitExpenseData] = useState<any>(null)
  const [isSettlingShare, setIsSettlingShare] = useState(false)

  const handleOpenSplitModal = async (order: any) => {
    try {
      const [currentUser, squadUsers] = await Promise.all([
        authService.getCurrentUser().catch(() => null),
        splitService.getUsers().catch(() => []),
      ])
      const matchedUser = squadUsers.find(
        (u) =>
          u.email?.toLowerCase() === currentUser?.email?.toLowerCase() ||
          u.name?.toLowerCase() === currentUser?.name?.toLowerCase()
      )
      const payerId = matchedUser?.id || squadUsers[0]?.id || ''
      const memberIds = squadUsers.length > 0 ? squadUsers.map((u) => u.id) : (payerId ? [payerId] : [])

      const data = await splitService.createSplit({
        name: `Gourmet F&B Order (${order.orderId} - Seat ${order.seat})`,
        totalAmount: order.totalPrice,
        paidByUserId: payerId,
        memberUserIds: memberIds,
        referenceType: 'CONCESSION_ORDER',
        referenceId: order.orderId,
      })
      setSplitExpenseData(data)
      setIsSplitModalOpen(true)
    } catch (err) {
      console.warn('Failed to split F&B bill via SplitMoney:', err)
    }
  }

  const handleSettleShare = async (expenseId: string, debtorUserId: string, method: string) => {
    setIsSettlingShare(true)
    try {
      await splitService.settleShare({
        expenseId,
        debtorUserId,
        paymentMethod: method,
      })
      const list = await splitService.getExpenses().catch(() => [])
      const updated = list.find((e: any) => e.id === expenseId)
      if (updated) setSplitExpenseData(updated)
      showNotice(
        `🎉 Squad member settled their F&B share via ${method === 'WALLET' ? 'CineCash Wallet' : 'Stripe Card Gateway'}!`,
        'success',
        'Squad Share Settled'
      )
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
      const raw = await ticketService.getTickets()
      let list: UserTicket[] = Array.isArray(raw) ? (raw as any) : []

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
            auditorium: auditoriumParam || (circuitAuditoriums[0]?.name ?? ''),
            seats: parsedSeats,
            status: 'ISSUED',
          }
          list = [synth, ...list]
          setSelectedTicketId(synth.ticketId)
        }
        const aud = auditoriumParam || match?.auditorium || (circuitAuditoriums[0]?.name ?? '')
        if (parsedSeats.length === 1) {
          setDeliverySeat(`${aud}, Seat ${parsedSeats[0]}`)
        } else if (parsedSeats.length > 1) {
          setDeliverySeat(`${aud}, Seats ${parsedSeats.join(', ')}`)
        }
      } else if (list.length > 0) {
        const latest = list[list.length - 1]
        setSelectedTicketId(latest.ticketId)
        const aud = latest.auditorium || (circuitAuditoriums[0]?.name ?? '')
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
    const aud = ticket.auditorium || (circuitAuditoriums[0]?.name ?? '')
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
      const data = await walletService.getWalletSummary()
      setWalletBalance(data.balance)
    } catch {}
  }

  const fetchOrders = async () => {
    try {
      const data = await concessionsService.getOrders()
      setAllOrders(data as any)
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
    } catch (e) {
      console.warn('Failed to fetch orders:', e)
    }
  }

  const fetchMenu = async () => {
    try {
      const data = await concessionsService.getMenu()
      setMenu(data as any)
    } catch (e) {
      console.warn('Failed to fetch menu:', e)
    }
  }

  const fetchCombos = async (genre: string, size: number) => {
    setIsLoadingCombos(true)
    try {
      const data = await concessionsService.recommendCombos(genre, size)
      setCombos(data as any)
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

  const handleAdvanceStatus = async (targetStatus: string, specificOrderId?: string) => {
    const targetId = specificOrderId || activeOrder?.orderId
    if (!targetId || isAdvancingStatus) return
    setIsAdvancingStatus(true)
    try {
      const updated = await concessionsService.updateOrderStatus(targetId, targetStatus)
      const st = updated.status === 'DELIVERED' ? 'DELIVERED' : (updated.status === 'PLATED' || updated.status === 'READY') ? 'READY' : 'PREPARING'
      if (activeOrder && activeOrder.orderId === targetId) {
        setActiveOrder((prev) => prev ? {
          ...prev,
          status: st,
          estimatedMinutes: updated.estimatedMinutes,
        } : null)
      }
      setAllOrders((prev) =>
        prev.map((o) =>
          o.orderId === targetId
            ? { ...o, status: updated.status, estimatedMinutes: updated.estimatedMinutes }
            : o
        )
      )
      if (st === 'READY') playKitchenChime('plated')
      if (st === 'DELIVERED') playKitchenChime('delivered')
      showNotice(`Order #${targetId} status updated: ${updated.status}`)
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
        quantity: qty,
        price: item?.price || 0,
      }
    })

    try {
      if (paymentMethod === 'WALLET') {
        const wTxn = await walletService.pay(
          cartTotal,
          `Gourmet Concessions (${cartItemCount} items to ${deliverySeat})`
        )
        if (wTxn) {
          setWalletBalance(wTxn.balanceAfter)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cinemind-auth-changed'))
          }
        }
      }

      const orderData = await concessionsService.placeOrder({
        items: orderItems,
        deliverySeat,
        total: cartTotal,
      })

      setActiveOrder({
        orderId: orderData.orderId,
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
          ? `Paid $${cartTotal.toFixed(2)} via CineCash Wallet! Dispatched to kitchen.`
          : 'Gourmet concessions order dispatched to kitchen!',
        'success',
        'Order Confirmed'
      )
    } catch (err: unknown) {
      console.error('Failed to place concessions order:', err)
      const errorMsg = err instanceof Error ? err.message : 'Kitchen order submission failed'
      showNotice(`${errorMsg}. Please verify your CineCash balance or payment method.`, 'error', 'Order Failed')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const showNotice = (
    msg: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success',
    title?: string
  ) => {
    setToast({
      type,
      title: title || (type === 'success' ? 'Order Dispatched' : type === 'error' ? 'Order Failed' : 'Notice'),
      message: msg,
    })
  }

  // Filtered menu with category & dietary tags
  const filteredMenu = menu.filter((item) => {
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory
    const tags = item.dietary || item.dietaryTags || []
    const matchDietary = selectedDietary === 'ALL' || tags.some((t) => t.toLowerCase() === selectedDietary.toLowerCase())
    return matchCat && matchDietary
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

  const discountMultiplier = posDiscountType === 'STAFF_20' ? 0.8 : posDiscountType === 'VIP_COMP' ? 0 : 1.0
  const effectivePosTotal = Math.round(cartTotal * discountMultiplier * 100) / 100
  const effectiveChangeDue = Math.max(0, Math.round((cashTendered - effectivePosTotal) * 100) / 100)

  const filteredPosMenu = menu.filter((item) => {
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory
    const matchSearch =
      !posSearchTerm.trim() ||
      item.name.toLowerCase().includes(posSearchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(posSearchTerm.toLowerCase())
    return matchCat && matchSearch
  })

  const handlePlacePosOrder = async () => {
    if (cartItemCount === 0 || isPlacingOrder) return
    setIsPlacingOrder(true)

    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menu.find((i) => i.id === itemId)
      return {
        name: item?.name || itemId,
        quantity: qty,
        price: item?.price || 0,
      }
    })

    const targetDestination = posCustomerType === 'WALK_UP' ? 'Counter Pickup (Register #02)' : deliverySeat

    try {
      if (posPaymentType === 'WALLET') {
        const wTxn = await walletService.pay(
          effectivePosTotal,
          `POS Concessions: ${posCustomerName} (${cartItemCount} items to ${targetDestination})`
        )
        if (wTxn) {
          setWalletBalance(wTxn.balanceAfter)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cinemind-auth-changed'))
          }
        }
      }

      const orderData = await concessionsService.placeOrder({
        items: orderItems,
        deliverySeat: `${targetDestination}${posDiscountType !== 'NONE' ? ` [${posDiscountType === 'STAFF_20' ? 'Staff -20%' : 'VIP Comp'}]` : ''}`,
        total: effectivePosTotal,
      })

      const placedOrder = {
        orderId: orderData.orderId,
        total: effectivePosTotal,
        subtotal: cartSubtotal,
        tax: cartTax,
        seat: targetDestination,
        itemsCount: cartItemCount,
        status: 'PREPARING' as const,
        estimatedMinutes: 6,
        customerName: posCustomerName,
        paymentType: posPaymentType,
        cashTendered: posPaymentType === 'CASH' ? cashTendered : undefined,
        changeDue: posPaymentType === 'CASH' ? effectiveChangeDue : undefined,
        discount: posDiscountType,
        items: orderItems,
        timestamp: new Date().toLocaleTimeString(),
        register: 'Register #02 (Main Lobby)',
        cashier: currentUser?.name || 'Staff Cashier',
      }

      setActiveOrder(placedOrder)
      setPosReceiptModal(placedOrder)
      playKitchenChime('order')
      setCart({})
      setCashTendered(0)
      showNotice(
        `POS Order ${orderData.orderId} dispatched to Kitchen! ${posPaymentType === 'CASH' ? `Change Due: $${effectiveChangeDue.toFixed(2)}` : 'Payment Approved'}`,
        'success',
        'POS Transaction Approved'
      )
    } catch (err: unknown) {
      console.error('Failed to place POS concessions order:', err)
      const errorMsg = err instanceof Error ? err.message : 'POS order submission failed'
      showNotice(`${errorMsg}`, 'error', 'POS Transaction Failed')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const hasDispatchPerm = rbacPolicyEngine.hasPermission(currentUser, Permissions.DISPATCH_FNB_ORDER)
  const hasMenuPerm = rbacPolicyEngine.hasPermission(currentUser, Permissions.MANAGE_FNB_MENU)
  const isManager = hasMenuPerm
  const isStaff = hasDispatchPerm || hasMenuPerm
  const effectiveViewMode = hasMenuPerm
    ? concessionsViewMode
    : hasDispatchPerm
    ? (concessionsViewMode === 'POS_COUNTER' ? 'USHER_DISPATCH' : concessionsViewMode)
    : 'PATRON'

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Toast Notification */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Role / Mode Switcher Pill (Strictly for Staff: Managers & Ushers) */}
      {isStaff && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-zinc-300">
              {effectiveViewMode === 'USHER_DISPATCH'
                ? 'Auditorium Usher Delivery Run Sheet'
                : effectiveViewMode === 'POS_COUNTER'
                ? 'Cinema Manager Counter POS Terminal'
                : 'Patron Self-Service F&B Studio'}
            </span>
            {currentUser && (
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                Staff: {currentUser.roleDisplayName || currentUser.role}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setConcessionsViewMode('PATRON')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                effectiveViewMode === 'PATRON'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span>Patron View</span>
            </button>

            {isManager && (
              <button
                onClick={() => setConcessionsViewMode('POS_COUNTER')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  effectiveViewMode === 'POS_COUNTER'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                <span>Counter POS (Manager)</span>
              </button>
            )}

            <button
              onClick={() => setConcessionsViewMode('USHER_DISPATCH')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                effectiveViewMode === 'USHER_DISPATCH'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Delivery Checklist (Usher)</span>
            </button>
          </div>
        </div>
      )}

      {effectiveViewMode === 'USHER_DISPATCH' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Usher Delivery Header */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Auditorium Usher In-Seat Delivery Run Sheet</h2>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                    DISPATCH ACTIVE
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Assigned Usher: <span className="font-semibold text-zinc-200">{currentUser?.name || 'Auditorium Usher'}</span> • Live KDS Kitchen Orders Ready for Seat Hand-Off
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchOrders}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition"
              >
                <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
                <span>Refresh Run Sheet</span>
              </button>
            </div>
          </div>

          {/* Auditorium Filter Tabs (Dynamically derived from live database orders) */}
          {(() => {
            const audSet = new Set<string>()
            allOrders.forEach((o) => {
              const seat = o.deliverySeat || ''
              if (seat.toLowerCase().includes('counter')) {
                audSet.add('Counter')
              } else if (seat.includes('—')) {
                audSet.add(seat.split('—')[0].trim())
              } else if (seat.includes(',')) {
                audSet.add(seat.split(',')[0].trim())
              }
            })
            const filterTabs = [
              { id: 'ALL', label: 'All Auditoriums' },
              ...Array.from(audSet).map((aud) => ({
                id: aud,
                label: aud === 'Counter' ? 'VIP Counter Pickups' : aud,
              })),
            ]
            return (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setUsherAuditoriumFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                      usherAuditoriumFilter === tab.id
                        ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )
          })()}

          {/* Delivery Run Sheet Cards */}
          {allOrders.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center text-zinc-500 space-y-2">
              <UtensilsCrossed className="h-8 w-8 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-400">No In-Seat Delivery Orders Active</p>
              <p className="text-xs text-zinc-600">Live theatrical concessions orders placed by patrons or counter staff will appear here in real-time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allOrders
                .filter((ord) => {
                  if (usherAuditoriumFilter === 'ALL') return true
                  if (usherAuditoriumFilter === 'Counter') return (ord.deliverySeat || '').toLowerCase().includes('counter')
                  return (ord.deliverySeat || '').includes(usherAuditoriumFilter)
                })
              .map((ord) => {
                const isReady = ord.status === 'READY' || ord.status === 'PLATED'
                const isDelivered = ord.status === 'DELIVERED'
                return (
                  <div
                    key={ord.orderId}
                    className={`rounded-2xl p-5 border space-y-4 transition ${
                      isReady
                        ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30'
                        : isDelivered
                        ? 'bg-zinc-900/40 border-zinc-800 opacity-75'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 text-sm">
                            {ord.orderId}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDelivered
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : isReady
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            }`}
                          >
                            {isDelivered ? '✓ DELIVERED' : isReady ? 'HOT & READY FOR RUNNER' : 'CHEF PREPPING'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-semibold mt-1">
                          Patron: <strong className="text-white">{ord.customerName || 'Cinema Patron'}</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                          Destination
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {ord.deliverySeat}
                        </span>
                      </div>
                    </div>

                    {/* Items Checklist */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Items On Runner Tray:
                      </div>
                      <div className="space-y-1 text-xs">
                        {(ord.items || []).map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between py-0.5 text-zinc-300">
                            <span className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              <strong className="text-white font-mono">{it.quantity}x</strong> {it.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-400" />
                        {isDelivered
                          ? 'Hand-off complete'
                          : isReady
                          ? 'Plated ~2m ago (Warm target)'
                          : `In prep (~${ord.estimatedMinutes || 5}m)`}
                      </span>

                      {!isDelivered ? (
                        <button
                          onClick={() => handleAdvanceStatus(isReady ? 'DELIVERED' : 'PLATED', ord.orderId)}
                          disabled={isAdvancingStatus}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                            isReady
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-lg shadow-emerald-500/20'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{isReady ? 'Mark Delivered to Cup Holder' : 'Mark Plated in Kitchen'}</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : effectiveViewMode === 'POS_COUNTER' ? (
        <div className="space-y-6">
          {/* POS Terminal Status Bar */}
          <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-950 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                <Store className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Box Office Concession POS — Register #02</h2>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                    ONLINE & KDS SYNCED
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Operator: <span className="font-semibold text-zinc-200">{currentUser?.name || 'Staff Cashier'}</span> ({currentUser?.roleDisplayName || currentUser?.role || 'Staff'}) • Station: Main Lobby Bar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsKitchenQueueOpen(!isKitchenQueueOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition"
              >
                <ChefHat className="h-3.5 w-3.5 text-amber-400" />
                <span>Kitchen Queue ({allOrders.length})</span>
              </button>

              <button
                onClick={() => setCart({})}
                disabled={cartItemCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-xs font-semibold text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Tray</span>
              </button>
            </div>
          </div>

          {/* Kitchen Display System (KDS) Live Drawer */}
          {isKitchenQueueOpen && (
            <div className="rounded-2xl border border-amber-500/30 bg-zinc-950/90 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ChefHat className="h-4 w-4" />
                  Live Kitchen Display System (KDS) Queue
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {allOrders.filter((o) => o.status !== 'DELIVERED').length} in preparation
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                {allOrders.map((ord) => (
                  <div
                    key={ord.orderId}
                    className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono font-bold text-white">{ord.orderId}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.status === 'DELIVERED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : ord.status === 'READY' || ord.status === 'PLATED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                      }`}>
                        {ord.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      Dest: <strong className="text-zinc-200">{ord.deliverySeat}</strong>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Total: ${(ord.totalAmount || ord.total || 0).toFixed(2)}
                    </div>
                    {ord.status === 'PREPARING' && (
                      <button
                        onClick={() => handleAdvanceStatus('PLATED', ord.orderId)}
                        disabled={isAdvancingStatus}
                        className="w-full py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[10px] border border-amber-500/40 transition"
                      >
                        Mark Ready for Delivery
                      </button>
                    )}
                    {(ord.status === 'READY' || ord.status === 'PLATED') && (
                      <button
                        onClick={() => handleAdvanceStatus('DELIVERED', ord.orderId)}
                        disabled={isAdvancingStatus}
                        className="w-full py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-[10px] border border-emerald-500/40 transition"
                      >
                        Mark Delivered to Seat
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2-Column POS Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Fast Tap Concessions Catalog */}
            <div className="lg:col-span-7 space-y-4">
              {/* Category Pills & Search */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={posSearchTerm}
                    onChange={(e) => setPosSearchTerm(e.target.value)}
                    placeholder="Search snacks, drinks, combos..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                  {posSearchTerm && (
                    <button
                      onClick={() => setPosSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['ALL', 'Combos', 'Popcorn', 'Beverages', 'Hot Food', 'Candy'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                        selectedCategory === cat
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/40 font-bold'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fast Tap Item Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredPosMenu.map((item) => {
                  const qty = cart[item.id] || 0
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="relative p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-purple-500/50 transition-all text-left flex flex-col justify-between h-32 active:scale-95 group shadow-sm"
                    >
                      {qty > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center shadow-md">
                          {qty}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{item.icon || '🍿'}</span>
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs mt-1.5 line-clamp-1 group-hover:text-purple-300 transition">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{item.calories} kcal</p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                        <span className="uppercase text-[9px] text-zinc-500 font-mono">{item.category}</span>
                        <span className="text-purple-400 font-bold group-hover:translate-x-0.5 transition">+ Add</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right 5 Columns: Register Tape & Payment Terminal */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-4 shadow-xl">
                {/* Customer & Destination Ingest */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 text-purple-400" />
                      Register Tape
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Destination Mode */}
                  <div className="grid grid-cols-2 gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setPosCustomerType('WALK_UP')
                        setPosCustomerName('Walk-up Guest')
                        setDeliverySeat('Counter Pickup (Register #02)')
                      }}
                      className={`py-1 rounded-lg font-semibold transition ${
                        posCustomerType === 'WALK_UP'
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Walk-up Counter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPosCustomerType('PATRON_SEAT')
                        if (personas.length > 0) {
                          setPosCustomerName(personas[0].fullName)
                          const audName = circuitAuditoriums[0]?.name || (userTickets[0]?.auditorium ?? '')
                          setDeliverySeat(personas[0].defaultSeat || `${audName}, Seat C3`)
                        }
                      }}
                      className={`py-1 rounded-lg font-semibold transition ${
                        posCustomerType === 'PATRON_SEAT'
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Theater Seat In-Seat
                    </button>
                  </div>

                  {/* If in-seat selected: Patron selector chips */}
                  {posCustomerType === 'PATRON_SEAT' && (
                    <div className="space-y-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">
                        Select Cinema Patron / Seat:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {personas.map((p) => {
                          const isMatch = posCustomerName === p.fullName
                          return (
                            <button
                              key={p.userId}
                              type="button"
                              onClick={() => {
                                setPosCustomerName(p.fullName)
                                const patronAud = circuitAuditoriums.length > 0
                                  ? circuitAuditoriums[personas.indexOf(p) % circuitAuditoriums.length].name
                                  : (userTickets[0]?.auditorium ?? '')
                                setDeliverySeat(p.defaultSeat || `${patronAud}, Seat C${(personas.indexOf(p) % 6) + 1}`)
                              }}
                              className={`text-[10px] px-2 py-0.5 rounded border transition ${
                                isMatch
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                              }`}
                            >
                              {p.fullName}
                            </button>
                          )
                        })}
                      </div>
                      <input
                        type="text"
                        value={deliverySeat}
                        onChange={(e) => setDeliverySeat(e.target.value)}
                        placeholder={`Destination (${circuitAuditoriums[0]?.name || 'Auditorium'}, Seat C3)`}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  )}
                </div>

                {/* Itemized Tray Items */}
                <div className="border-t border-zinc-800/80 pt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cartItemCount === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-xs">
                      No items on register tape. Tap catalog items to add.
                    </div>
                  ) : (
                    Object.entries(cart).map(([itemId, qty]) => {
                      const item = menu.find((i) => i.id === itemId)
                      if (!item) return null
                      return (
                        <div key={itemId} className="flex items-center justify-between text-xs pt-1">
                          <div className="flex-1 pr-2">
                            <span className="font-semibold text-white block truncate">{item.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">${item.price.toFixed(2)} ea</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => decrementCart(itemId)}
                              className="h-5 w-5 rounded bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono font-bold text-white text-xs w-4 text-center">{qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="h-5 w-5 rounded bg-zinc-800 text-purple-400 hover:text-white flex items-center justify-center"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="font-mono font-bold text-emerald-400 w-12 text-right ml-1">
                              ${(item.price * qty).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Discount & Comps */}
                <div className="border-t border-zinc-800/80 pt-3 space-y-1.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">Apply POS Discount:</div>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPosDiscountType('NONE')}
                      className={`py-1 rounded font-semibold border transition ${
                        posDiscountType === 'NONE'
                          ? 'bg-zinc-800 text-white border-zinc-600'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      None (0%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosDiscountType('STAFF_20')}
                      className={`py-1 rounded font-semibold border transition ${
                        posDiscountType === 'STAFF_20'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      Staff (-20%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosDiscountType('VIP_COMP')}
                      className={`py-1 rounded font-semibold border transition ${
                        posDiscountType === 'VIP_COMP'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      VIP Comp (Free)
                    </button>
                  </div>
                </div>

                {/* Tender & Payment Selection */}
                <div className="border-t border-zinc-800/80 pt-3 space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">Payment Tender:</div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setPosPaymentType('CARD')}
                      className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 border transition ${
                        posPaymentType === 'CARD'
                          ? 'bg-purple-600 text-white border-purple-500 font-bold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <CreditCard className="h-3 w-3" />
                      <span>Card POS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPosPaymentType('CASH')
                        setCashTendered(Math.ceil(effectivePosTotal))
                      }}
                      className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 border transition ${
                        posPaymentType === 'CASH'
                          ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <DollarSign className="h-3 w-3" />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosPaymentType('WALLET')}
                      className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 border transition ${
                        posPaymentType === 'WALLET'
                          ? 'bg-amber-500 text-black border-amber-400 font-bold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <Wallet className="h-3 w-3" />
                      <span>Wallet</span>
                    </button>
                  </div>

                  {/* Cash Drawer Calculator */}
                  {posPaymentType === 'CASH' && (
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Quick Tender:</span>
                        <div className="flex gap-1">
                          {[10, 20, 50, 100].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCashTendered(amt)}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[11px]"
                            >
                              ${amt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Cash Received:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={cashTendered || ''}
                          onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-white font-mono text-right font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800 font-bold text-sm">
                        <span className="text-zinc-300">Change Due:</span>
                        <span className="text-emerald-400 font-mono">
                          ${effectiveChangeDue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtotal, Tax & Final Price */}
                <div className="border-t border-zinc-800/80 pt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="text-white">${cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Tax (8%)</span>
                    <span className="text-white">${cartTax.toFixed(2)}</span>
                  </div>
                  {posDiscountType !== 'NONE' && (
                    <div className="flex justify-between text-amber-400">
                      <span>Discount ({posDiscountType === 'STAFF_20' ? '-20%' : '100% Comp'})</span>
                      <span>-${(cartTotal - effectivePosTotal).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-zinc-800">
                    <span>Amount Due</span>
                    <span className="text-emerald-400 font-mono">${effectivePosTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Tender Action Button */}
                <button
                  onClick={handlePlacePosOrder}
                  disabled={cartItemCount === 0 || isPlacingOrder}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 hover:from-purple-500 to-indigo-600 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition active:scale-95 disabled:opacity-50"
                >
                  {isPlacingOrder
                    ? 'Transmitting to Kitchen...'
                    : `⚡ Tender & Send to Kitchen ($${effectivePosTotal.toFixed(2)})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
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

              {/* Expediter Stage Fast-Forward Controls (Restricted to DISPATCH_FNB_ORDER Permission) */}
              {rbacPolicyEngine.hasPermission(currentUser, Permissions.DISPATCH_FNB_ORDER) && activeOrder.status === 'PREPARING' && (
                <button
                  onClick={() => handleAdvanceStatus('PLATED', activeOrder.orderId)}
                  disabled={isAdvancingStatus}
                  className="flex items-center gap-1 rounded-xl bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                  title="Simulate kitchen chef finishing prep"
                >
                  <Sparkles className="h-3 w-3" /> Mark Plated
                </button>
              )}
              {rbacPolicyEngine.hasPermission(currentUser, Permissions.DISPATCH_FNB_ORDER) && activeOrder.status === 'READY' && (
                <button
                  onClick={() => handleAdvanceStatus('DELIVERED', activeOrder.orderId)}
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
                <span className="text-zinc-400">{activeTicket.auditorium || (circuitAuditoriums[0]?.name ?? '')}</span>
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
                        `${activeTicket.auditorium || (circuitAuditoriums[0]?.name ?? '')}, Seats ${activeTicket.seats.join(', ')}`
                      )
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                      deliverySeat ===
                      `${activeTicket.auditorium || (circuitAuditoriums[0]?.name ?? '')}, Seats ${activeTicket.seats.join(', ')}`
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm shadow-amber-500/30'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    👥 All Booked Seats ({activeTicket.seats.join(', ')})
                  </button>
                )}

                {activeTicket.seats &&
                  activeTicket.seats.map((seat) => {
                    const fullTarget = `${activeTicket.auditorium || (circuitAuditoriums[0]?.name ?? '')}, Seat ${seat}`
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

      {/* Menu Categories & Dietary Filter Bar */}
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-white">Theatrical Menu</h3>
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'POPCORN', 'BEVERAGES', 'SNACKS', 'HOT_FOOD', 'DESSERTS'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-zinc-500">Dietary:</span>
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'Gluten-Free', 'Vegan', 'Vegetarian', 'Halal'].map((diet) => (
              <button
                key={diet}
                onClick={() => setSelectedDietary(diet)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition ${
                  selectedDietary === diet
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {diet}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMenu.map((item) => {
          const dietaryList = item.dietary || item.dietaryTags || []
          const pairingsList = item.genrePairings || []
          const isAvailable = item.inStock !== false

          return (
            <div
              key={item.id}
              className={`rounded-2xl border bg-zinc-900/60 p-5 flex flex-col justify-between transition space-y-4 ${
                isAvailable ? 'border-zinc-800 hover:border-zinc-700' : 'border-zinc-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {item.name}
                        {!isAvailable && (
                          <span className="text-[9px] uppercase tracking-wider font-bold text-rose-400 bg-rose-950/60 border border-rose-800 px-1.5 py-0.2 rounded">
                            Sold Out
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] text-zinc-500 font-mono">{item.calories} Calories</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                    {walletService.formatCurrency(item.price)}
                  </span>
                </div>

                <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{item.description}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {dietaryList.map((d, didx) => (
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
                  {pairingsList.length > 0 ? `Pairs with: ${pairingsList.slice(0, 2).join(', ')}` : 'Gourmet Selection'}
                </span>

                {!isAvailable ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 bg-zinc-950 border border-zinc-800 cursor-not-allowed">
                    Sold Out
                  </span>
                ) : cart[item.id] ? (
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 transition active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                )}
              </div>
            </div>
          )
        })}
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
                              `${activeTicket.auditorium || (circuitAuditoriums[0]?.name ?? '')}, Seats ${activeTicket.seats.join(', ')}`
                            )
                          }
                          className={`text-[10px] px-2 py-0.5 rounded border transition ${
                            deliverySeat ===
                            `${activeTicket.auditorium || (circuitAuditoriums[0]?.name ?? '')}, Seats ${activeTicket.seats.join(', ')}`
                              ? 'bg-amber-500 text-black border-amber-400 font-bold'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          All ({activeTicket.seats.join(', ')})
                        </button>
                      )}
                      {activeTicket.seats.map((seat) => {
                        const fullTarget = `${activeTicket.auditorium || (circuitAuditoriums[0]?.name ?? '')}, Seat ${seat}`
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
                    placeholder={`e.g. ${circuitAuditoriums[0]?.name || 'Auditorium'}, Seat B3`}
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
      </>
    )}

    {/* Physical POS Thermal Receipt Slip Modal */}
    {posReceiptModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4 text-xs font-mono">
          <div className="text-center border-b border-dashed border-zinc-700 pb-3 space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-base font-bold text-white">
              <UtensilsCrossed className="h-4 w-4 text-amber-400" />
              <span>CINEMIND GOURMET POS</span>
            </div>
            <p className="text-[10px] text-zinc-500">{posReceiptModal.register}</p>
            <p className="text-[10px] text-zinc-400">Cashier: {posReceiptModal.cashier}</p>
            <p className="text-[10px] text-zinc-500">{posReceiptModal.timestamp}</p>
          </div>

          <div className="border-b border-dashed border-zinc-700 pb-2 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-zinc-400">Order ID:</span>
              <span className="text-white font-bold">{posReceiptModal.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Customer:</span>
              <span className="text-white">{posReceiptModal.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Destination:</span>
              <span className="text-amber-400 font-bold">{posReceiptModal.seat}</span>
            </div>
          </div>

          <div className="space-y-1.5 py-1 border-b border-dashed border-zinc-700">
            {posReceiptModal.items.map((it: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span>{it.quantity}x {it.name}</span>
                <span>${(it.price * it.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 pt-1 border-b border-dashed border-zinc-700 pb-2 text-zinc-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${posReceiptModal.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (8%)</span>
              <span>${posReceiptModal.tax.toFixed(2)}</span>
            </div>
            {posReceiptModal.discount !== 'NONE' && (
              <div className="flex justify-between text-amber-400">
                <span>Discount</span>
                <span>{posReceiptModal.discount === 'STAFF_20' ? '-20% Staff' : '100% VIP Comp'}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white text-sm pt-1">
              <span>TOTAL PAID</span>
              <span className="text-emerald-400 font-mono">${posReceiptModal.total.toFixed(2)}</span>
            </div>
          </div>

          {posReceiptModal.paymentType === 'CASH' && (
            <div className="space-y-0.5 text-zinc-400 pb-2 border-b border-dashed border-zinc-700">
              <div className="flex justify-between">
                <span>Cash Tendered</span>
                <span>${(posReceiptModal.cashTendered || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-400">
                <span>Change Given</span>
                <span>${(posReceiptModal.changeDue || 0).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="text-center pt-2 text-[10px] text-zinc-500">
            *** TRANSMITTED TO KITCHEN DISPLAY ***
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setPosReceiptModal(null)}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition text-center"
            >
              New POS Sale
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
