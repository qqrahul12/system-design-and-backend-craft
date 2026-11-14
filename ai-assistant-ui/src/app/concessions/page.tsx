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
  X,
  Ticket,
  CheckCircle2,
  ChefHat,
  Truck,
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

  useEffect(() => {
    fetchMenu()
    fetchCombos(selectedGenre, partySize)
    fetchOrders()
    detectTicketSeat()
  }, [])

  const detectTicketSeat = async () => {
    if (seatsParam) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/tickets`)
      if (res.ok) {
        const tickets = await res.json()
        if (Array.isArray(tickets) && tickets.length > 0) {
          const latest = tickets[tickets.length - 1]
          if (latest.seats && latest.seats.length > 0) {
            setDeliverySeat(`${latest.auditorium || 'Auditorium 1'}, Seat ${latest.seats[0]}`)
          }
        }
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
        setCart({})
        setIsCheckoutOpen(false)
        showNotice('Gourmet concessions order dispatched to kitchen!')
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
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-zinc-900 to-zinc-950 p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-amber-400 animate-bounce" />
              <h3 className="text-base font-bold text-white">Active Concessions Order: {activeOrder.orderId}</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-300 font-mono">
                ETA: ~{activeOrder.estimatedMinutes} Mins
              </span>
              <Link
                href="/tickets"
                className="flex items-center gap-1.5 rounded-xl bg-purple-600/30 border border-purple-500/40 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-600/40"
              >
                <Ticket className="h-3.5 w-3.5" /> View Movie Tickets
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">✓</div>
              <div>
                <p className="font-bold text-white">Order Received</p>
                <p className="text-zinc-500 text-[10px]">Payment verified</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold animate-pulse">2</div>
              <div>
                <p className="font-bold text-amber-300">Artisanal Batch Prep</p>
                <p className="text-zinc-500 text-[10px]">Truffle oil infusion in progress</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-zinc-300">In-Theater Delivery</p>
                <p className="text-zinc-500 text-[10px]">Delivering to: {activeOrder.seat}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Theater Seat Delivery Destination:
                  </label>
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
                  {isPlacingOrder ? 'Dispatching to Kitchen...' : `Confirm & Pay ($${cartTotal.toFixed(2)})`}
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
