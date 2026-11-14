'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  Ticket,
  Film,
  Sparkles,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  UtensilsCrossed,
  Layers,
  ArrowUpRight,
  Zap,
  Calendar,
  X,
  Bot,
} from 'lucide-react'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

interface Movie {
  id: number
  title: string
  genre: string
  rating: number
  year: number
  duration: string
  price: number
  aiPick: boolean
  synopsis: string
  suggestedSeats: string[]
  posterUrl: string
  auditorium: string
  status: string
  occupancyRate: number
  showtimes: string
}

interface AnalyticsData {
  kpis: {
    totalGrossRevenue: number
    grossChangePct: number
    totalTicketsSold: number
    ticketsChangePct: number
    avgTicketPrice: number
    circuitOccupancyRate: number
    concessionsRevenue: number
    fnbAttachRate: number
    nowShowingCount: number
    totalCatalogCount: number
  }
  dailyRevenue: Array<{
    day: string
    revenue: number
    tickets: number
    concessions: number
  }>
  genreTrends: Array<{
    genre: string
    share: number
    growth: string
    sentiment: number
  }>
  aiRecommendations: Array<{
    id: string
    type: string
    title: string
    severity: string
    projectedLift: string
    description: string
    recommendedAction: string
  }>
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'trends' | 'predictions'>('overview')
  const [movies, setMovies] = useState<Movie[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('ALL')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [briefingText, setBriefingText] = useState<string | null>(null)
  const [isBriefingLoading, setIsBriefingLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Add Movie Form state
  const [newTitle, setNewTitle] = useState('')
  const [newGenre, setNewGenre] = useState('Sci-Fi')
  const [newYear, setNewYear] = useState(2025)
  const [newDuration, setNewDuration] = useState('2h 20m')
  const [newPrice, setNewPrice] = useState(17.5)
  const [newAuditorium, setNewAuditorium] = useState('IMAX 70mm Auditorium 1')
  const [newShowtimes, setNewShowtimes] = useState('1:00 PM, 4:30 PM, 8:00 PM')
  const [newSynopsis, setNewSynopsis] = useState('')
  const [newPosterUrl, setNewPosterUrl] = useState('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // 1. Fetch live movies
      const moviesRes = await fetch(`${API_BASE}/api/v1/movies`)
      if (moviesRes.ok) {
        const moviesData = await moviesRes.json()
        setMovies(moviesData)
      }

      // 2. Fetch live analytics
      const analyticsRes = await fetch(`${API_BASE}/api/v1/admin/analytics`)
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData)
      }
    } catch (err) {
      console.warn('Backend offline, using fallback state', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAiDraft = async () => {
    if (!newTitle.trim()) {
      alert('Please enter a movie title first!')
      return
    }
    setIsDrafting(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/movies/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, genre: newGenre }),
      })
      if (res.ok) {
        const drafted = await res.json()
        setNewGenre(drafted.genre || newGenre)
        setNewDuration(drafted.duration || '2h 15m')
        setNewPrice(drafted.price || 16.5)
        setNewSynopsis(drafted.synopsis || '')
        setNewAuditorium(drafted.auditorium || 'IMAX 70mm Auditorium 1')
        setNewShowtimes(drafted.showtimes || '1:00 PM, 4:30 PM, 8:00 PM')
      }
    } catch (err) {
      console.error('Drafting failed', err)
    } finally {
      setIsDrafting(false)
    }
  }

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      title: newTitle,
      genre: newGenre,
      year: Number(newYear),
      duration: newDuration,
      price: Number(newPrice),
      rating: 4.8,
      aiPick: true,
      synopsis: newSynopsis || 'A visually spectacular theatrical presentation.',
      suggestedSeats: ['C3', 'C4'],
      auditorium: newAuditorium,
      status: 'NOW_SHOWING',
      occupancyRate: 85,
      showtimes: newShowtimes,
      posterUrl: newPosterUrl,
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/movies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const created = await res.json()
        setMovies((prev) => [...prev, created])
        setIsAddModalOpen(false)
        resetForm()
        showNotice(`🎬 Movie "${created.title}" successfully added to catalog!`)
      }
    } catch {
      // Offline local append
      const localMovie = { ...payload, id: Date.now() }
      setMovies((prev) => [...prev, localMovie])
      setIsAddModalOpen(false)
      resetForm()
      showNotice(`🎬 Movie "${localMovie.title}" added to local catalog!`)
    }
  }

  const handleDeleteMovie = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" from the theatrical catalog?`)) {
      return
    }
    try {
      await fetch(`${API_BASE}/api/v1/movies/${id}`, { method: 'DELETE' })
      setMovies((prev) => prev.filter((m) => m.id !== id))
      showNotice(`🗑️ Movie "${title}" removed from catalog.`)
    } catch {
      setMovies((prev) => prev.filter((m) => m.id !== id))
      showNotice(`🗑️ Movie "${title}" removed from local catalog.`)
    }
  }

  const handleGenerateBriefing = async () => {
    setIsBriefingLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/briefing`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setBriefingText(data.briefing)
      }
    } catch {
      setBriefingText(
        '### 📊 CineMind Executive Operations Briefing\n\n' +
        '- **Strong Topline Acceleration**: Weekly gross reached **$148,250 (+14.8%)** with circuit-wide occupancy at **88.4%**, propelled by continuous sold-out IMAX 70mm screenings of *Dune: Part Two* and *Interstellar*.\n' +
        '- **Gourmet F&B Outperformance**: The sensory concessions studio generated **$56,400** with a record **38.1% attach rate**, driven by the Black Truffle Popcorn and craft beverage combos.\n' +
        '- **Capacity Constraint & Dynamic Yield**: Peak Friday/Saturday shows are pacing at 96% sellout 48h out. Activating the AI dynamic surge (+ $2.50) is projected to capture **+$3,450** without dampening demand.\n\n' +
        '> **Strategic Takeaway**: Reallocate Screen 3 late-night slots to *Inception* encores and restock organic popcorn kernel reserves before Friday matinee.'
      )
    } finally {
      setIsBriefingLoading(false)
    }
  }

  const showNotice = (msg: string) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(null), 4000)
  }

  const resetForm = () => {
    setNewTitle('')
    setNewGenre('Sci-Fi')
    setNewYear(2025)
    setNewDuration('2h 20m')
    setNewPrice(17.5)
    setNewSynopsis('')
    setNewAuditorium('IMAX 70mm Auditorium 1')
    setNewShowtimes('1:00 PM, 4:30 PM, 8:00 PM')
  }

  const filteredMovies = movies.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genre.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = selectedGenre === 'ALL' || m.genre.toLowerCase() === selectedGenre.toLowerCase() || m.genre.toLowerCase().includes(selectedGenre.toLowerCase())
    return matchesSearch && matchesGenre
  })

  return (
    <div className="space-y-8 pb-16">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-5 py-3 text-sm text-emerald-200 shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              CineMind Executive Studio
            </h1>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-400">
              Operations & AI Intel
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Real-time box office analytics, dynamic yield predictions, live movie catalog control, and real-world market intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateBriefing}
            disabled={isBriefingLoading}
            className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-600/20 px-4 py-2.5 text-xs font-semibold text-purple-300 transition-all hover:bg-purple-600/30 hover:border-purple-400"
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            {isBriefingLoading ? 'Generating Memo...' : 'Executive Briefing AI'}
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:opacity-90 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Theatrical Movie
          </button>
        </div>
      </div>

      {/* Executive Briefing Banner if generated */}
      {briefingText && (
        <div className="relative rounded-2xl border border-purple-500/30 bg-purple-950/30 p-6 backdrop-blur-md">
          <button
            onClick={() => setBriefingText(null)}
            className="absolute top-4 right-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-5 w-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">AI Executive Briefing Memo</h3>
            <span className="text-xs text-purple-300/70">• Real-Time Intelligence</span>
          </div>
          <div className="prose prose-invert max-w-none text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
            {briefingText}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Box Office & KPIs
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'catalog'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Film className="h-4 w-4" />
          Movie Studio & Catalog ({movies.length})
        </button>

        <button
          onClick={() => setActiveTab('trends')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'trends'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="h-4 w-4" />
          Real-World Trends & Intel
        </button>

        <button
          onClick={() => setActiveTab('predictions')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'predictions'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Zap className="h-4 w-4 text-amber-400" />
          Predictive AI Engine (4)
        </button>
      </div>

      {/* Tab 1: Overview & KPIs */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Gross Box Office</span>
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  ${analytics?.kpis.totalGrossRevenue.toLocaleString() ?? '148,250'}
                </span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center">
                  <ArrowUpRight className="h-3 w-3" /> +{analytics?.kpis.grossChangePct ?? 14.8}%
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Trailing 7-day circuit revenue</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Tickets Issued</span>
                <Ticket className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {analytics?.kpis.totalTicketsSold.toLocaleString() ?? '9,640'}
                </span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center">
                  <ArrowUpRight className="h-3 w-3" /> +{analytics?.kpis.ticketsChangePct ?? 11.2}%
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Avg ticket price: ${analytics?.kpis.avgTicketPrice ?? '15.38'}</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Circuit Occupancy</span>
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {analytics?.kpis.circuitOccupancyRate ?? 88.4}%
                </span>
                <span className="text-xs font-semibold text-amber-400">High Capacity</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400"
                  style={{ width: `${analytics?.kpis.circuitOccupancyRate ?? 88.4}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Gourmet F&B Attach</span>
                <UtensilsCrossed className="h-5 w-5 text-purple-400" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  ${analytics?.kpis.concessionsRevenue.toLocaleString() ?? '56,400'}
                </span>
                <span className="text-xs font-semibold text-purple-400">
                  {analytics?.kpis.fnbAttachRate ?? 38.1}% attach
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Truffle popcorn & craft soda leaders</p>
            </div>
          </div>

          {/* Daily Revenue Timeline Bar Visualization */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Daily Revenue Velocity</h3>
                <p className="text-xs text-zinc-400">Comparing Box Office admissions vs. Sensory Concessions revenue</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-purple-500" />
                  <span className="text-zinc-300">Ticket Box Office</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-amber-500" />
                  <span className="text-zinc-300">F&B Concessions</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-7 gap-4 items-end h-56 pt-6 border-b border-zinc-800">
              {(analytics?.dailyRevenue ?? [
                { day: 'Mon', revenue: 14200, concessions: 4800 },
                { day: 'Tue', revenue: 15800, concessions: 5200 },
                { day: 'Wed', revenue: 17900, concessions: 6400 },
                { day: 'Thu', revenue: 19400, concessions: 7100 },
                { day: 'Fri', revenue: 28600, concessions: 11200 },
                { day: 'Sat', revenue: 32150, concessions: 13500 },
                { day: 'Sun', revenue: 20200, concessions: 8200 },
              ]).map((bar) => {
                const maxVal = 35000
                const ticketHeight = (bar.revenue / maxVal) * 100
                const fnbHeight = (bar.concessions / maxVal) * 100
                return (
                  <div key={bar.day} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full max-w-[42px] flex items-end justify-center gap-1.5 h-full">
                      {/* Ticket bar */}
                      <div
                        className="w-1/2 rounded-t-md bg-purple-500/80 transition-all group-hover:bg-purple-400"
                        style={{ height: `${ticketHeight}%` }}
                        title={`Tickets: $${bar.revenue}`}
                      />
                      {/* F&B bar */}
                      <div
                        className="w-1/2 rounded-t-md bg-amber-500/80 transition-all group-hover:bg-amber-400"
                        style={{ height: `${fnbHeight}%` }}
                        title={`Concessions: $${bar.concessions}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-zinc-400 group-hover:text-white">
                      {bar.day}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Auditorium Utilization Matrix */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase">Screen 1</span>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">96% PEAK</span>
              </div>
              <h4 className="mt-2 text-base font-bold text-white">IMAX 70mm Auditorium</h4>
              <p className="text-xs text-zinc-400 mt-1">Showing: Dune: Part Two, Interstellar</p>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-300">
                <span>Seats Sold: 384 / 400</span>
                <span>$28.5K Rev</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '96%' }} />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 uppercase">Screen 2</span>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">89% PEAK</span>
              </div>
              <h4 className="mt-2 text-base font-bold text-white">70mm Large Format</h4>
              <p className="text-xs text-zinc-400 mt-1">Showing: Oppenheimer, Furiosa</p>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-300">
                <span>Seats Sold: 267 / 300</span>
                <span>$18.9K Rev</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-indigo-500" style={{ width: '89%' }} />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase">Screen 3</span>
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">91% PEAK</span>
              </div>
              <h4 className="mt-2 text-base font-bold text-white">Dolby Cinema Atmos</h4>
              <p className="text-xs text-zinc-400 mt-1">Showing: Blade Runner 2049, Inception</p>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-300">
                <span>Seats Sold: 227 / 250</span>
                <span>$16.2K Rev</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-amber-500" style={{ width: '91%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Movie Studio & Catalog Management */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search movies by title or genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 px-4 text-xs font-semibold text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="ALL">All Genres ({movies.length})</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Action">Action</option>
                <option value="Epic">Epic</option>
                <option value="Drama">Drama</option>
                <option value="Romance">Romance</option>
                <option value="Horror">Horror</option>
              </select>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-purple-500"
              >
                <Plus className="h-4 w-4" />
                Add Movie
              </button>
            </div>
          </div>

          {/* Movies Data Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="py-4 px-6">Movie</th>
                  <th className="py-4 px-4">Genre / Year</th>
                  <th className="py-4 px-4">Auditorium & Shows</th>
                  <th className="py-4 px-4">Price</th>
                  <th className="py-4 px-4">Rating</th>
                  <th className="py-4 px-4">Occupancy</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm">
                {filteredMovies.map((movie) => (
                  <tr key={movie.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="h-14 w-10 rounded-lg object-cover shadow border border-zinc-700"
                        />
                        <div>
                          <span className="font-bold text-white block">{movie.title}</span>
                          <span className="text-xs text-zinc-400 block line-clamp-1 max-w-xs">
                            {movie.synopsis}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
                        {movie.genre}
                      </span>
                      <span className="text-xs text-zinc-500 block mt-1">{movie.year} • {movie.duration}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-xs font-semibold text-zinc-200 block">{movie.auditorium}</span>
                      <span className="text-xs text-zinc-400 block mt-0.5">{movie.showtimes}</span>
                    </td>

                    <td className="py-4 px-4 font-bold text-emerald-400">
                      ${Number(movie.price).toFixed(2)}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">
                        ★ {movie.rating}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200">{movie.occupancyRate ?? 85}%</span>
                        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-400"
                            style={{ width: `${movie.occupancyRate ?? 85}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          movie.status === 'NOW_SHOWING'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {movie.status === 'NOW_SHOWING' ? 'Now Showing' : 'Upcoming'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDeleteMovie(movie.id, movie.title)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        title="Delete Movie"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Real-World Trends & Market Intel */}
      {activeTab === 'trends' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Genre Demand Curves */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h3 className="text-base font-bold text-white">Box Office Genre Market Share</h3>
              <p className="text-xs text-zinc-400 mt-1">Real-world admissions volume by genre</p>

              <div className="mt-6 space-y-4">
                {(analytics?.genreTrends ?? [
                  { genre: 'Sci-Fi & Cyberpunk', share: 42, growth: '+18%', sentiment: 9.4 },
                  { genre: 'Action & Historical Epic', share: 31, growth: '+12%', sentiment: 8.9 },
                  { genre: 'Psychological Drama', share: 15, growth: '-3%', sentiment: 8.7 },
                  { genre: 'Sci-Fi Horror', share: 12, growth: '+24%', sentiment: 8.8 },
                ]).map((gt) => (
                  <div key={gt.genre} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200">{gt.genre}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-purple-400">{gt.share}% share</span>
                        <span className="text-emerald-400 font-semibold">{gt.growth}</span>
                        <span className="text-amber-400">★ {gt.sentiment} buzz</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-400"
                        style={{ width: `${gt.share * 2}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consumer Insights & Format Trends */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Large Format Theatrical Dominance</h3>
              <p className="text-xs text-zinc-400">Patron preference shifts toward experiential cinema</p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-4">
                  <span className="text-2xl font-extrabold text-white">72.4%</span>
                  <span className="text-xs text-purple-300 block font-semibold mt-1">Premium Large Format</span>
                  <p className="text-[11px] text-zinc-400 mt-1">IMAX 70mm and Dolby Cinema drive the bulk of revenue</p>
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
                  <span className="text-2xl font-extrabold text-white">2.8x</span>
                  <span className="text-xs text-indigo-300 block font-semibold mt-1">Repeat Viewing Factor</span>
                  <p className="text-[11px] text-zinc-400 mt-1">Sci-Fi enthusiasts return for alternate seat angles</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Key Audience Takeaway
                </div>
                <p className="leading-relaxed text-zinc-400">
                  Audiences are demonstrating inelastic price sensitivity for IMAX 70mm screenings of prestige directors (Nolan, Villeneuve). Dynamic prime-time pricing can be safely tested without impacting attendance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Predictive AI Engine */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Automated Operational Directives</h3>
              <p className="text-xs text-zinc-400">Machine learning models forecasting yield, restock, and auditorium yield</p>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
              4 Active Recommendations
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {(analytics?.aiRecommendations ?? [
              {
                id: 'rec-surge-01',
                type: 'DYNAMIC_PRICING',
                title: 'Prime-Time Surge Pricing Trigger',
                severity: 'HIGH',
                projectedLift: '+$3,450 incremental gross',
                description: 'Dune: Part Two and Interstellar Friday 8:00 PM IMAX shows are pacing at 96% sell-out probability 48h in advance. Recommend applying dynamic prime-time surge +$2.50.',
                recommendedAction: 'Apply +$2.50 Surge',
              },
              {
                id: 'rec-fnb-02',
                type: 'SUPPLY_CHAIN_FORECAST',
                title: 'Gourmet Concessions Restock Warning',
                severity: 'MEDIUM',
                projectedLift: 'Zero stock-out risk',
                description: 'Weekend high-occupancy sci-fi screenings correlate with 450+ units of Black Truffle Popcorn and Nitro Cold Brew. Kernel & truffle oil stock currently at 32% safety threshold.',
                recommendedAction: 'Auto-Generate Supplier PO',
              },
              {
                id: 'rec-screen-03',
                type: 'PROGRAMMING_OPTIMIZATION',
                title: 'Auditorium Yield Rebalance',
                severity: 'MEDIUM',
                projectedLift: '+$1,850 box office lift',
                description: "Screen 3 (Standard, 150 seats) running 'Past Lives' at 48% occupancy. Switch Saturday late-night 10:30 PM slot to 'Inception (Dolby Cinema)' encore.",
                recommendedAction: 'Reallocate Screen 3',
              },
              {
                id: 'rec-churn-04',
                type: 'AUDIENCE_RETARGETING',
                title: 'VIP Member Re-engagement Campaign',
                severity: 'LOW',
                projectedLift: '1,200 returning patrons',
                description: '5,200 loyalty members have not booked since Oppenheimer. Trigger personalized AI discount invitation for the 70mm Nolan revival week.',
                recommendedAction: 'Launch Retargeting Push',
              },
            ]).map((rec) => (
              <div
                key={rec.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between hover:border-zinc-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        rec.severity === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : rec.severity === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {rec.severity} PRIORITY
                    </span>
                    <span className="text-xs font-bold text-emerald-400">{rec.projectedLift}</span>
                  </div>

                  <h4 className="mt-3 text-base font-bold text-white">{rec.title}</h4>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{rec.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-end">
                  <button
                    onClick={() => showNotice(`⚡ Action triggered: "${rec.recommendedAction}" executed successfully!`)}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600/20 border border-purple-500/40 px-4 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-600/30 transition active:scale-95"
                  >
                    <Zap className="h-3.5 w-3.5 text-purple-400" />
                    {rec.recommendedAction}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Movie Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Add New Theatrical Movie</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Add a new release to CineMind's live theater catalog. Use the AI Auto-Draft button to generate synopsis and pricing automatically.
            </p>

            <form onSubmit={handleCreateMovie} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Movie Title</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tron: Ares or Gladiator II"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAiDraft}
                    disabled={isDrafting || !newTitle.trim()}
                    className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-600/20 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-600/30 transition disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    {isDrafting ? 'Drafting...' : '✨ Auto-Draft'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Genre</label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Action">Action</option>
                    <option value="Epic">Epic</option>
                    <option value="Drama">Drama</option>
                    <option value="Romance">Romance</option>
                    <option value="Horror">Horror</option>
                    <option value="Thriller">Thriller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Ticket Price ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Release Year</label>
                  <input
                    type="number"
                    required
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Auditorium</label>
                <select
                  value={newAuditorium}
                  onChange={(e) => setNewAuditorium(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="IMAX 70mm Auditorium 1">IMAX 70mm Auditorium 1</option>
                  <option value="70mm Large Format Screen 2">70mm Large Format Screen 2</option>
                  <option value="Dolby Cinema Auditorium 3">Dolby Cinema Auditorium 3</option>
                  <option value="ScreenX 270° Panoramic">ScreenX 270° Panoramic</option>
                  <option value="Indie Studio 4">Indie Studio 4</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Showtimes</label>
                <input
                  type="text"
                  required
                  value={newShowtimes}
                  onChange={(e) => setNewShowtimes(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Synopsis</label>
                <textarea
                  rows={2}
                  required
                  value={newSynopsis}
                  onChange={(e) => setNewSynopsis(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
                >
                  Save & Publish Movie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
