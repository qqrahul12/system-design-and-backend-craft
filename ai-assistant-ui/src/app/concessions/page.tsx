'use client'

import { useState, useEffect } from 'react'
import {
  UtensilsCrossed,
  Sparkles,
  ShoppingBag,
  Plus,
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

const GENRES = ['Sci-Fi', 'Action', 'Drama', 'Epic']

export default function ConcessionsPage() {
  const [menu, setMenu] = useState<ConcessionItem[]>([])
  const [combos, setCombos] = useState<ConcessionCombo[]>([])
  const [selectedGenre, setSelectedGenre] = useState('Sci-Fi')
  const [partySize, setPartySize] = useState(2)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [isLoadingCombos, setIsLoadingCombos] = useState(false)
  const [addedNotice, setAddedNotice] = useState<string | null>(null)

  useEffect(() => {
    fetchMenu()
    fetchCombos(selectedGenre, partySize)
  }, [])

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

  const showNotice = (msg: string) => {
    setAddedNotice(msg)
    setTimeout(() => setAddedNotice(null), 2500)
  }

  // Filtered menu
  const filteredMenu = menu.filter((item) => {
    if (selectedCategory === 'ALL') return true
    return item.category === selectedCategory
  })

  // Calculate cart total
  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartSubtotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = menu.find((i) => i.id === itemId)
    return sum + (item ? item.price * qty : 0)
  }, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
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
            Machine learning culinary recommendations matching snack flavor profiles, aromas, and beverages to movie genres.
          </p>
        </div>

        {/* Cart Pill */}
        <div className="flex items-center gap-3 bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-2.5 shadow">
          <div className="relative">
            <ShoppingBag className="h-5 w-5 text-amber-400" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {cartItemCount}
              </span>
            )}
          </div>
          <div>
            <p className="text-[11px] text-[#777]">Concessions Order</p>
            <p className="text-xs font-bold text-white">${cartSubtotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {addedNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-[#161616] px-4 py-3 text-xs font-semibold text-emerald-400 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-4 w-4" />
          <span>{addedNotice}</span>
        </div>
      )}

      {/* AI Genre Matcher Controls */}
      <div className="rounded-xl border border-[#262626] bg-[#121212] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#ccc]">
              AI Sensory Pairing Engine
            </h2>
          </div>
          <span className="text-[11px] text-[#666]">
            Select your feature's narrative tone to generate culinary combos
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#181818] border border-[#2c2c2c] rounded-lg p-1">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreChange(g)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedGenre === g
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-[#181818] border border-[#2c2c2c] rounded-lg px-3 py-1.5 text-xs">
            <span className="text-[#777]">Party Size:</span>
            {[1, 2, 4].map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPartySize(size)
                  fetchCombos(selectedGenre, size)
                }}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  partySize === size ? 'bg-[#333] text-white' : 'text-[#666] hover:text-[#bbb]'
                }`}
              >
                {size} {size === 1 ? 'Solo' : 'Guests'}
              </button>
            ))}
          </div>
        </div>

        {/* AI Combos Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-[#1c1812] to-[#121212] p-4 flex flex-col justify-between shadow-lg hover:border-amber-500/50 transition-all space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {combo.name}
                  </h3>
                  <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    Save ${combo.savings.toFixed(2)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-[#aaa] leading-relaxed italic bg-[#141414]/80 p-2.5 rounded-lg border border-[#252525]">
                  &ldquo;{combo.aiRationale}&rdquo;
                </p>

                {/* Items in combo */}
                <div className="mt-3 space-y-1.5">
                  {combo.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs text-[#ccc] py-1 border-b border-[#222]"
                    >
                      <span className="flex items-center gap-2">
                        <span>{it.icon}</span>
                        <span>{it.name}</span>
                      </span>
                      <span className="text-[#888] font-mono">${it.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#242424]">
                <div>
                  <span className="text-[10px] text-[#666] line-through mr-1.5 font-mono">
                    ${combo.originalPrice.toFixed(2)}
                  </span>
                  <span className="text-base font-bold text-amber-400 font-mono">
                    ${combo.comboPrice.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => addComboToCart(combo)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-all shadow"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Bundle
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gourmet Menu Catalog */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              🍿 CineMind Concessions Pantry
            </h2>
            <p className="text-xs text-[#777]">Hand-popped organic corn, artisanal beverages, and warm sweets</p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-[#141414] border border-[#2a2a2a] rounded-lg p-1">
            {['ALL', 'POPCORN', 'SNACKS', 'BEVERAGES'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#2a2a2a] text-white shadow-sm'
                    : 'text-[#777] hover:text-[#ccc]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenu.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#242424] bg-[#141414] p-4 flex flex-col justify-between hover:border-[#383838] transition-all space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      <p className="text-[10px] text-[#666] font-mono">{item.calories} Calories</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white font-mono bg-[#1f1f1f] px-2 py-0.5 rounded border border-[#2a2a2a]">
                    ${item.price.toFixed(2)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-[#888] leading-relaxed">{item.description}</p>

                {/* Dietary badges */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.dietary.map((d, didx) => (
                    <span
                      key={didx}
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#1c1c1c] text-[#aaa] border border-[#282828]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#1f1f1f] flex items-center justify-between">
                <span className="text-[10px] text-[#666] flex items-center gap-1">
                  Pairs with: {item.genrePairings.slice(0, 2).join(', ')}
                </span>
                <button
                  onClick={() => addToCart(item)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#222] hover:bg-[#333] transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
