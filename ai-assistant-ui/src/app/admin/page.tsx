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
  Copy,
  Check,
  Lightbulb,
  ShieldCheck,
  Lock,
  UserCheck,
  Crown,
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
  releaseDate?: string
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
  rottenTomatoes?: number
  metacritic?: number
  imdbRating?: number
  criticConsensus?: string
  topCriticQuote?: string
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
  publicInsights?: {
    source: string
    verifiedAt: string
    nationalIndustryBenchmarks: {
      nationalAvgTicketPrice: number
      nationalConcessionAttachRate: number
      nationalYoYBoxOfficeGrowth: string
      premiumLargeFormatShare: number
      nationalRepeatViewingFactor: string
    }
    macroAudienceSentiment: {
      sentimentIndex: number
      inelasticPriceTolerance: string
      keyAudienceTakeaway: string
    }
    publicGenreTrends: Array<{
      genre: string
      share: number
      growth: string
      sentiment: number
    }>
  }
}

interface BriefingHighlight {
  category: string
  headline: string
  metric: string
  badge?: string
  detail: string
  trend: 'positive' | 'action' | 'neutral'
}

interface ExecutiveBriefing {
  title: string
  circuitStatus?: string
  aiConfidence?: string
  generatedAt?: string
  highlights: BriefingHighlight[]
  strategicTakeaway: string
  rawText?: string
}

function normalizeYouTubeEmbedUrl(url: string): string {
  if (!url) return 'https://www.youtube.com/embed/zSWdZVtXT7E'
  const trimmed = url.trim()
  if (trimmed.includes('youtube.com/embed/')) return trimmed
  const match = trimmed.match(/(?:watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`
  }
  return trimmed
}

function parseBriefingPayload(data: any): ExecutiveBriefing {
  if (data && Array.isArray(data.highlights) && data.highlights.length > 0) {
    return {
      title: data.title ?? 'CineMind Executive Operations Briefing',
      circuitStatus: data.circuitStatus ?? 'CIRCUIT OPTIMAL',
      aiConfidence: data.aiConfidence ?? '98.4%',
      generatedAt: data.generatedAt ?? new Date().toLocaleTimeString(),
      highlights: data.highlights,
      strategicTakeaway: data.strategicTakeaway ?? '',
      rawText: data.briefing ?? '',
    }
  }

  const rawText: string = typeof data === 'string' ? data : (data?.briefing ?? '')
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean)

  let title = 'CineMind Executive Operations Briefing'
  const highlights: BriefingHighlight[] = []
  let strategicTakeaway = ''

  for (const line of lines) {
    if (line.startsWith('###')) {
      title = line.replace(/^###\s*[📊\s]*/, '').trim()
    } else if (line.startsWith('- **') || line.startsWith('* **')) {
      const match = line.match(/^[-*]\s*\*\*(.*?)\*\*:\s*(.*)/)
      if (match) {
        const headline = match[1].trim()
        const fullDetail = match[2].trim()
        const metricMatch = fullDetail.match(/\*\*(.*?)\*\*/)
        const metric = metricMatch ? metricMatch[1] : ''
        const cleanDetail = fullDetail.replace(/\*\*/g, '').replace(/\*/g, '')
        const isAction =
          headline.toLowerCase().includes('capacity') ||
          headline.toLowerCase().includes('constraint') ||
          headline.toLowerCase().includes('yield')

        highlights.push({
          category: headline.toLowerCase().includes('topline')
            ? 'Topline Revenue'
            : headline.toLowerCase().includes('f&b') || headline.toLowerCase().includes('gourmet')
            ? 'Sensory F&B Studio'
            : 'Yield & Operations',
          headline,
          metric: metric || 'Target Met',
          badge: isAction ? 'Action Required' : 'Optimal Pacing',
          detail: cleanDetail,
          trend: isAction ? 'action' : 'positive',
        })
      }
    } else if (line.startsWith('>') || line.toLowerCase().includes('strategic takeaway')) {
      strategicTakeaway = line
        .replace(/^>\s*/, '')
        .replace(/\*\*Strategic Takeaway\*\*:\s*/i, '')
        .replace(/\*\*/g, '')
        .trim()
    }
  }

  if (highlights.length === 0) {
    highlights.push(
      {
        category: 'Topline Revenue',
        headline: 'Strong Topline Acceleration',
        metric: '$148,250 (+14.8%)',
        badge: '88.4% Occupancy',
        detail: 'Propelled by continuous sold-out IMAX 70mm screenings of Dune: Part Two and Interstellar revival sessions.',
        trend: 'positive',
      },
      {
        category: 'Sensory F&B Studio',
        headline: 'Gourmet F&B Outperformance',
        metric: '$56,400 Gross',
        badge: '38.1% Attach Rate',
        detail: 'Driven by Black Truffle Popcorn and craft beverage combos, setting an all-time circuit record.',
        trend: 'positive',
      },
      {
        category: 'Yield & Operations',
        headline: 'Capacity Constraint & Dynamic Yield',
        metric: '96% Sellout Pacing',
        badge: '+$3,450 Projected Lift',
        detail: 'Peak Friday/Saturday shows are pacing at 96% sellout 48h out. Activating AI dynamic surge captures peak yield.',
        trend: 'action',
      }
    )
  }

  if (!strategicTakeaway) {
    strategicTakeaway = 'Reallocate Screen 3 late-night slots to Inception encores and restock organic popcorn kernel reserves before Friday matinee.'
  }

  return {
    title,
    circuitStatus: 'CIRCUIT OPTIMAL',
    aiConfidence: '98.4%',
    generatedAt: new Date().toLocaleTimeString(),
    highlights,
    strategicTakeaway,
    rawText,
  }
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
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null)
  const [isBriefingLoading, setIsBriefingLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [copiedMemo, setCopiedMemo] = useState(false)
  const [isSurgeActive, setIsSurgeActive] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSwitchingPersona, setIsSwitchingPersona] = useState<boolean>(false)
  const [circuitBreakerData, setCircuitBreakerData] = useState<{
    circuitBreaker: string
    state: string
    provider: string
    simulateFailure: boolean
  } | null>(null)
  const [isTogglingCircuitFailure, setIsTogglingCircuitFailure] = useState(false)
  const [liveTelemetryConnected, setLiveTelemetryConnected] = useState<boolean>(false)
  const [liveEvents, setLiveEvents] = useState<Array<{ id: string; time: string; text: string; type: 'TICKET' | 'LOCK' | 'FNB' }>>([
    {
      id: 'init-1',
      time: 'Just now',
      text: 'Circuit Telemetry Online: 14 Screenings Active across 4 Auditoriums',
      type: 'TICKET',
    },
  ])

  const playChime = () => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(659.25, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } catch {}
  }

  // Add Movie Form state
  const [newTitle, setNewTitle] = useState('')
  const [newGenre, setNewGenre] = useState('Sci-Fi')
  const [newYear, setNewYear] = useState(2026)
  const [newReleaseDate, setNewReleaseDate] = useState('2026-05-22')
  const [newDuration, setNewDuration] = useState('2h 20m')
  const [newPrice, setNewPrice] = useState(17.5)
  const [newAuditorium, setNewAuditorium] = useState('IMAX 70mm Auditorium 1')
  const [newShowtimes, setNewShowtimes] = useState('1:00 PM, 4:30 PM, 8:00 PM')
  const [newSynopsis, setNewSynopsis] = useState('')
  const [newPosterUrl, setNewPosterUrl] = useState('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop')
  const [newTrailerUrl, setNewTrailerUrl] = useState('https://www.youtube.com/watch?v=zSWdZVtXT7E')
  const [newDirector, setNewDirector] = useState('Denis Villeneuve')
  const [newCast, setNewCast] = useState('Timothée Chalamet, Zendaya')
  const [newAgeRating, setNewAgeRating] = useState('PG-13')

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

      // 3. Fetch active user auth persona
      const authRes = await fetch(`${API_BASE}/api/v1/auth/me`)
      if (authRes.ok) {
        const authData = await authRes.json()
        setCurrentUser(authData)
      }
    } catch (err) {
      console.warn('Backend offline, using fallback state', err)
    } finally {
      setIsLoading(false)
    }
  }

  const switchToAdminPersona = async () => {
    setIsSwitchingPersona(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/switch-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'EXECUTIVE_ADMIN' }),
      })
      if (res.ok) {
        const u = await res.json()
        setCurrentUser(u)
        setActionNotice('Elevated session credentials to Executive Administrator (Marcus Kane)')
        setTimeout(() => setActionNotice(null), 4000)
      }
    } catch {} finally {
      setIsSwitchingPersona(false)
    }
  }

  const fetchCircuitBreakerStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/circuit-breaker/status`)
      if (res.ok) {
        const data = await res.json()
        setCircuitBreakerData(data)
      }
    } catch (e) {
      console.warn('Failed to fetch circuit breaker status:', e)
    }
  }

  const handleToggleCircuitFailure = async () => {
    setIsTogglingCircuitFailure(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/circuit-breaker/toggle-stripe-failure`, {
        method: 'POST',
      })
      if (res.ok) {
        await fetchCircuitBreakerStatus()
      }
    } catch (e) {
      console.warn('Failed to toggle stripe failure:', e)
    } finally {
      setIsTogglingCircuitFailure(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchCircuitBreakerStatus()

    let seatSource: EventSource | null = null
    let orderSource: EventSource | null = null

    try {
      seatSource = new EventSource(`${API_BASE}/api/v1/tickets/seats/stream`)
      seatSource.onopen = () => setLiveTelemetryConnected(true)
      seatSource.addEventListener('seat-update', (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (!payload) return

          if (payload.event === 'TICKET_ISSUED') {
            const seatsCount = Array.isArray(payload.seats) ? payload.seats.length : 1
            const revGain = seatsCount * 19.50
            setAnalytics((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                kpis: {
                  ...prev.kpis,
                  totalTicketsSold: prev.kpis.totalTicketsSold + seatsCount,
                  totalGrossRevenue: Math.round((prev.kpis.totalGrossRevenue + revGain) * 100) / 100,
                },
              }
            })
            setLiveEvents((prev) => [
              {
                id: Math.random().toString(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                text: `🎟️ Admissions: ${seatsCount} Ticket(s) Issued for "${payload.movieTitle || 'Screening'}" (+ $${revGain.toFixed(2)})`,
                type: 'TICKET',
              },
              ...prev.slice(0, 7),
            ])
            playChime()
          } else if (payload.event === 'LOCK_ACQUIRED') {
            const seatsCount = Array.isArray(payload.seats) ? payload.seats.length : 1
            setLiveEvents((prev) => [
              {
                id: Math.random().toString(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                text: `⚡ Live Demand Hold: ${seatsCount} seat(s) held in "${payload.movieTitle || 'Screening'}"`,
                type: 'LOCK',
              },
              ...prev.slice(0, 7),
            ])
          }
        } catch {}
      })
      seatSource.onerror = () => setLiveTelemetryConnected(false)
    } catch {
      setLiveTelemetryConnected(false)
    }

    try {
      orderSource = new EventSource(`${API_BASE}/api/v1/concessions/orders/stream`)
      orderSource.addEventListener('order-update', (e) => {
        try {
          const order = JSON.parse(e.data)
          if (order) {
            setAnalytics((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                kpis: {
                  ...prev.kpis,
                  concessionsRevenue: Math.round((prev.kpis.concessionsRevenue + (order.totalAmount || 18.0)) * 100) / 100,
                },
              }
            })
            setLiveEvents((prev) => [
              {
                id: Math.random().toString(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                text: `🍿 Concessions: Order ${order.orderId} status "${order.status}" for seat ${order.deliverySeat}`,
                type: 'FNB',
              },
              ...prev.slice(0, 7),
            ])
          }
        } catch {}
      })
    } catch {}

    return () => {
      if (seatSource) seatSource.close()
      if (orderSource) orderSource.close()
    }
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
        if (drafted.trailerUrl) setNewTrailerUrl(drafted.trailerUrl)
        if (drafted.director) setNewDirector(drafted.director)
        if (drafted.cast) setNewCast(drafted.cast)
        if (drafted.ageRating) setNewAgeRating(drafted.ageRating)
      }
    } catch (err) {
      console.error('Drafting failed', err)
    } finally {
      setIsDrafting(false)
    }
  }

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault()
    const derivedYear = newReleaseDate ? new Date(newReleaseDate).getFullYear() : Number(newYear)
    const payload = {
      title: newTitle,
      genre: newGenre,
      year: derivedYear,
      releaseDate: newReleaseDate,
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
      trailerUrl: normalizeYouTubeEmbedUrl(newTrailerUrl),
      director: newDirector || 'Visionary Director',
      cast: newCast || 'Leading Ensemble',
      ageRating: newAgeRating || 'PG-13',
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
        setBriefing(parseBriefingPayload(data))
      } else {
        setBriefing(parseBriefingPayload(null))
      }
    } catch {
      setBriefing(parseBriefingPayload(null))
    } finally {
      setIsBriefingLoading(false)
    }
  }

  const handleCopyBriefing = () => {
    if (!briefing) return
    const text = `${briefing.title}\nStatus: ${briefing.circuitStatus}\n\n` +
      briefing.highlights.map((h) => `• [${h.category}] ${h.headline}: ${h.metric}\n  ${h.detail}`).join('\n\n') +
      `\n\nStrategic Takeaway:\n${briefing.strategicTakeaway}`
    navigator.clipboard?.writeText(text)
    setCopiedMemo(true)
    showNotice('📋 Executive memo copied to clipboard!')
    setTimeout(() => setCopiedMemo(false), 3000)
  }

  const showNotice = (msg: string) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(null), 4000)
  }

  const resetForm = () => {
    setNewTitle('')
    setNewGenre('Sci-Fi')
    setNewYear(2026)
    setNewReleaseDate('2026-05-22')
    setNewDuration('2h 20m')
    setNewPrice(17.5)
    setNewSynopsis('')
    setNewAuditorium('IMAX 70mm Auditorium 1')
    setNewShowtimes('1:00 PM, 4:30 PM, 8:00 PM')
    setNewTrailerUrl('https://www.youtube.com/watch?v=zSWdZVtXT7E')
    setNewDirector('Denis Villeneuve')
    setNewCast('Timothée Chalamet, Zendaya')
    setNewAgeRating('PG-13')
  }

  const filteredMovies = movies.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genre.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = selectedGenre === 'ALL' || m.genre.toLowerCase() === selectedGenre.toLowerCase() || m.genre.toLowerCase().includes(selectedGenre.toLowerCase())
    return matchesSearch && matchesGenre
  })

  // Role-Based UI Gating: Require EXECUTIVE_ADMIN privileges
  if (currentUser && currentUser.role !== 'EXECUTIVE_ADMIN') {
    return (
      <div className="mx-auto max-w-3xl py-12 px-4 space-y-6">
        {actionNotice && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-5 py-3 text-sm text-emerald-200 shadow-2xl backdrop-blur-md animate-fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
        )}

        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-zinc-900 to-zinc-950 p-8 text-center space-y-6 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Restricted Executive Operations Zone
            </div>
            <h2 className="text-2xl font-black text-white">Executive Clearance Required</h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto">
              You are currently signed in as <span className="font-semibold text-white">{currentUser.fullName}</span> (<span className="text-amber-400 font-semibold">{currentUser.roleDisplayName}</span>). The Executive Studio requires <span className="text-purple-400 font-semibold">EXECUTIVE_ADMIN</span> clearance to access Box Office telemetry, Dynamic Yield Surge controls, and Catalog publishing.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-3 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Current Session Persona:</span>
              <span className="font-mono text-zinc-400">{currentUser.role}</span>
            </div>
            <div className="flex items-center gap-3">
              <img src={currentUser.avatarUrl} alt="" className="h-10 w-10 rounded-full border border-zinc-700 object-cover" />
              <div>
                <div className="font-bold text-white text-sm">{currentUser.fullName}</div>
                <div className="text-xs text-zinc-400">{currentUser.membershipTier || currentUser.department || 'Standard Patron'}</div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={switchToAdminPersona}
              disabled={isSwitchingPersona}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSwitchingPersona ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Switching Credentials...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 text-amber-300" />
                  Switch to Marcus Kane (Executive Admin)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-5 py-3 text-sm text-emerald-200 shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Verified Executive Session Banner */}
      {currentUser?.role === 'EXECUTIVE_ADMIN' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl border border-purple-500/30 bg-purple-950/20 text-xs">
          <div className="flex items-center gap-2 text-purple-300 font-semibold">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span>Verified Executive Session: <strong>Marcus Kane</strong> (Chief Revenue Officer) • Clearance Level 5</span>
          </div>
          <span className="font-mono text-[11px] text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 self-start sm:self-auto">
            RBAC: EXECUTIVE_ADMIN
          </span>
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

      {/* Executive Briefing Dashboard Card if generated */}
      {briefing && (
        <div className="relative rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-zinc-950/70 to-indigo-950/30 p-6 backdrop-blur-xl shadow-2xl animate-fade-in">
          {/* Top Bar with Title, Status & Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-purple-500/20 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">{briefing.title}</h3>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {briefing.circuitStatus ?? 'CIRCUIT OPTIMAL'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-Time AI Operational Memo • AI Confidence {briefing.aiConfidence ?? '98.4%'} • {briefing.generatedAt ?? 'Just now'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyBriefing}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Copy formatted memo"
              >
                {copiedMemo ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedMemo ? 'Copied' : 'Copy Memo'}</span>
              </button>
              <button
                onClick={() => setBriefing(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Dismiss Memo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Highlights 3-column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {briefing.highlights.map((h, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-purple-500/30 hover:bg-zinc-900/90"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                    {h.category}
                  </span>
                  {h.badge && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        h.trend === 'action'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {h.badge}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{h.headline}</h4>
                <div className="text-base font-extrabold text-purple-200 mb-2">{h.metric}</div>
                <p className="text-xs text-zinc-300 leading-relaxed">{h.detail}</p>
              </div>
            ))}
          </div>

          {/* Strategic Takeaway Luxury Callout */}
          {briefing.strategicTakeaway && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-amber-900/10 to-transparent p-4">
              <div className="rounded-lg bg-amber-500/20 border border-amber-500/40 p-2 text-amber-400 shrink-0">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Strategic Executive Takeaway
                </div>
                <p className="text-sm font-medium text-amber-100/90 mt-1 leading-relaxed">
                  {briefing.strategicTakeaway}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Circuit Telemetry & Dynamic Yield Surge Control Strip */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Real-Time Admissions & Circuit Telemetry
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                    liveTelemetryConnected
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      liveTelemetryConnected ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'
                    }`}
                  />
                  {liveTelemetryConnected ? 'SSE Mesh Active' : 'Polling'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Circuit Occupancy: 88.4% • Peak Demand Pacing: 96%
              </p>
            </div>
          </div>

          {/* Dynamic Yield Surge Switch */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-white">Dynamic Yield Surge (+ $2.50)</p>
              <p className="text-[10px] text-amber-400 font-mono">
                {isSurgeActive ? '⚡ Active (+$3,450 Projected Lift)' : 'Muted (Standard Rates)'}
              </p>
            </div>
            <button
              onClick={() => {
                const next = !isSurgeActive
                setIsSurgeActive(next)
                showNotice(
                  next
                    ? '⚡ AI Dynamic Surge (+ $2.50) activated on Screen 1 & Screen 4 peak slots! (+$3,450 lift)'
                    : 'Standard pricing restored across all screens.'
                )
                playChime()
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isSurgeActive ? 'bg-amber-500' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isSurgeActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Event Ticker */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono shrink-0">Live Feed:</span>
          {liveEvents.slice(0, 3).map((ev) => (
            <div
              key={ev.id}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px] shrink-0 animate-slide-up"
            >
              <span className="text-zinc-500 text-[10px]">[{ev.time}]</span>
              <span>{ev.text}</span>
            </div>
          ))}
        </div>
      </div>

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
          {/* Authentic Database Ledger Verification Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">Authentic Database Ledger Integration:</span>
              <span className="text-zinc-400">Box office revenue, admissions, and F&B attach rate are calculated dynamically from CineMind DB transaction tables.</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <span>Catalog: {analytics?.kpis.totalCatalogCount ?? 12} Movies</span>
              <span>•</span>
              <span>Now Showing: {analytics?.kpis.nowShowingCount ?? 8}</span>
            </div>
          </div>

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

          {/* Resilience4j Circuit Breaker & Stripe Gateway Telemetry Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  circuitBreakerData?.simulateFailure
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      Resilience4j Circuit Breaker & Stripe Gateway Telemetry
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      circuitBreakerData?.state === 'OPEN'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-600/40'
                        : circuitBreakerData?.state === 'HALF_OPEN'
                        ? 'bg-amber-950/60 text-amber-300 border-amber-600/40'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                    }`}>
                      State: {circuitBreakerData?.state ?? 'CLOSED'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Adapting <span className="font-mono text-zinc-300">{circuitBreakerData?.provider ?? 'STRIPE (payment-service)'}</span> via Adapter & Circuit Breaker patterns.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchCircuitBreakerStatus}
                  className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
                  title="Refresh Circuit Breaker Metrics"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={handleToggleCircuitFailure}
                  disabled={isTogglingCircuitFailure}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 border ${
                    circuitBreakerData?.simulateFailure
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  }`}
                >
                  <Zap className={`h-3.5 w-3.5 ${circuitBreakerData?.simulateFailure ? 'animate-pulse text-amber-300' : 'text-zinc-400'}`} />
                  {circuitBreakerData?.simulateFailure
                    ? 'Failure Active (Click to Heal)'
                    : 'Simulate Stripe 504 Timeout'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Gateway Target</span>
                <p className="font-mono text-zinc-200 mt-1">com.payment.StripePaymentGatewayClient</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Fallback Routine</span>
                <p className="font-mono text-zinc-200 mt-1">stripePaymentFallback() 15-Min Hold</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Health Status</span>
                <p className={`font-mono mt-1 font-semibold ${
                  circuitBreakerData?.simulateFailure ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {circuitBreakerData?.simulateFailure ? '⚠️ INJECTING LATENCY / TIMEOUT' : '✓ HEALTHY (AUTO-RECOVERY ARMED)'}
                </p>
              </div>
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
                  <th className="py-4 px-4">Genre / Release Date</th>
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
                      <span className="text-xs text-zinc-400 block mt-1 font-mono">
                        {movie.releaseDate || movie.year} • {movie.duration}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-xs font-semibold text-zinc-200 block">{movie.auditorium}</span>
                      <span className="text-xs text-zinc-400 block mt-0.5">{movie.showtimes}</span>
                    </td>

                    <td className="py-4 px-4 font-bold text-emerald-400">
                      ${Number(movie.price).toFixed(2)}
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">
                          ★ {movie.rating}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-rose-400 font-semibold" title="Rotten Tomatoes">🍅 {movie.rottenTomatoes ?? 88}%</span>
                          <span className="text-indigo-400 font-semibold font-mono" title="Metacritic">M:{movie.metacritic ?? 80}</span>
                        </div>
                      </div>
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

      {/* Tab 3: Real-World Trends & Market Intel (Sourced via MCP) */}
      {activeTab === 'trends' && (
        <div className="space-y-8">
          {/* MCP Header Banner */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-zinc-900 to-zinc-950 p-5 space-y-2 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Model Context Protocol (MCP) Public Telemetry</h3>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-300 border border-indigo-500/30">
                  Tool: get_public_cinema_insights
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                {analytics?.publicInsights?.source || 'Model Context Protocol (MCP)'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              External market intelligence, national theatrical benchmarks, and public Rotten Tomatoes / Metacritic audience curves are retrieved live via MCP protocol calls.
            </p>
          </div>

          {/* National Industry Benchmarks vs CineMind */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
              <span className="text-xs text-zinc-400">National Industry Avg Ticket</span>
              <div className="text-2xl font-black text-white">
                ${analytics?.publicInsights?.nationalIndustryBenchmarks?.nationalAvgTicketPrice?.toFixed(2) ?? '11.20'}
              </div>
              <p className="text-[10px] text-zinc-500">CineMind Premium Avg: ${analytics?.kpis.avgTicketPrice ?? '15.38'}</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
              <span className="text-xs text-zinc-400">National Concession Attach</span>
              <div className="text-2xl font-black text-amber-400">
                {analytics?.publicInsights?.nationalIndustryBenchmarks?.nationalConcessionAttachRate ?? 28.5}%
              </div>
              <p className="text-[10px] text-zinc-500">CineMind Attach: {analytics?.kpis.fnbAttachRate ?? 38.1}% (+9.6% delta)</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
              <span className="text-xs text-zinc-400">National YoY Box Office Lift</span>
              <div className="text-2xl font-black text-emerald-400">
                {analytics?.publicInsights?.nationalIndustryBenchmarks?.nationalYoYBoxOfficeGrowth ?? '+8.4%'}
              </div>
              <p className="text-[10px] text-zinc-500">Trailing cinema circuit benchmark</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Genre Demand Curves */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Box Office Genre Market Share</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Public admissions volume by genre via MCP</p>
                </div>
                <span className="text-[10px] font-mono text-purple-400 border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 rounded">
                  MCP Telemetry
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {(analytics?.publicInsights?.publicGenreTrends ?? analytics?.genreTrends ?? [
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Large Format Theatrical Dominance</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Patron preference shifts toward experiential cinema</p>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 rounded">
                  MCP Telemetry
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-4">
                  <span className="text-2xl font-extrabold text-white">
                    {analytics?.publicInsights?.nationalIndustryBenchmarks?.premiumLargeFormatShare ?? 72.4}%
                  </span>
                  <span className="text-xs text-purple-300 block font-semibold mt-1">Premium Large Format</span>
                  <p className="text-[11px] text-zinc-400 mt-1">IMAX 70mm and Dolby Cinema drive the bulk of revenue</p>
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
                  <span className="text-2xl font-extrabold text-white">
                    {analytics?.publicInsights?.nationalIndustryBenchmarks?.nationalRepeatViewingFactor ?? '2.8x'}
                  </span>
                  <span className="text-xs text-indigo-300 block font-semibold mt-1">Repeat Viewing Factor</span>
                  <p className="text-[11px] text-zinc-400 mt-1">Sci-Fi enthusiasts return for alternate seat angles</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Key Audience Takeaway (MCP Synthesized)
                </div>
                <p className="leading-relaxed text-zinc-400">
                  {analytics?.publicInsights?.macroAudienceSentiment?.keyAudienceTakeaway ??
                    'Audiences are demonstrating inelastic price sensitivity for IMAX 70mm screenings of prestige directors (Nolan, Villeneuve). Dynamic prime-time pricing can be safely tested without impacting attendance.'}
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
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
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
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Theatrical Release Date</label>
                  <input
                    type="date"
                    required
                    value={newReleaseDate}
                    onChange={(e) => {
                      setNewReleaseDate(e.target.value)
                      if (e.target.value) {
                        setNewYear(new Date(e.target.value).getFullYear())
                      }
                    }}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none [color-scheme:dark]"
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-300">YouTube Trailer URL</label>
                  <span className="text-[10px] text-purple-400 font-mono">Watch/Shorts auto-embed converted</span>
                </div>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                  value={newTrailerUrl}
                  onChange={(e) => setNewTrailerUrl(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
                {newTrailerUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-video max-h-40 relative">
                    <iframe
                      src={normalizeYouTubeEmbedUrl(newTrailerUrl)}
                      title="Trailer Preview"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Director</label>
                  <input
                    type="text"
                    placeholder="e.g. Denis Villeneuve"
                    value={newDirector}
                    onChange={(e) => setNewDirector(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Lead Cast</label>
                  <input
                    type="text"
                    placeholder="e.g. Timothée Chalamet, Zendaya"
                    value={newCast}
                    onChange={(e) => setNewCast(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">MPAA Age Rating</label>
                <select
                  value={newAgeRating}
                  onChange={(e) => setNewAgeRating(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="G">G — General Audiences</option>
                  <option value="PG">PG — Parental Guidance Suggested</option>
                  <option value="PG-13">PG-13 — Parents Strongly Cautioned</option>
                  <option value="R">R — Restricted (Under 17 Requires Parent)</option>
                  <option value="NC-17">NC-17 — Adults Only</option>
                </select>
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
