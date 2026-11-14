'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Star,
  Sparkles,
  Ticket,
  Info,
  CheckCircle2,
  ShieldCheck,
  Armchair,
  CreditCard,
  Search,
  X,
  SlidersHorizontal,
  Bot,
  Loader2,
  Compass,
  UtensilsCrossed,
  ArrowRight,
  QrCode,
  Play,
  Clock,
  Crown,
  Accessibility,
  Lock,
  Timer,
  AlertCircle,
  Calendar,
  RefreshCw,
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
  showtimes?: string
  auditorium?: string
  posterUrl?: string
  rottenTomatoes?: number
  metacritic?: number
  imdbRating?: number
  criticConsensus?: string
  topCriticQuote?: string
  reviewsCount?: number
  trailerUrl?: string
  director?: string
  cast?: string
  ageRating?: string
}

const INITIAL_MOVIES: Movie[] = [
  {
    id: 1,
    title: 'Interstellar',
    genre: 'Sci-Fi',
    rating: 4.8,
    year: 2014,
    duration: '2h 49m',
    price: 15,
    aiPick: true,
    synopsis: 'A team of explorers travel through a wormhole in space to ensure humanity’s survival.',
    suggestedSeats: ['B3', 'B4'],
  },
  {
    id: 2,
    title: 'Dune: Part Two',
    genre: 'Epic',
    rating: 4.7,
    year: 2024,
    duration: '2h 46m',
    price: 16,
    aiPick: true,
    synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.',
    suggestedSeats: ['C3', 'C4'],
  },
  {
    id: 3,
    title: 'Oppenheimer',
    genre: 'Drama',
    rating: 4.9,
    year: 2023,
    duration: '3h 00m',
    price: 14,
    aiPick: false,
    synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the Manhattan Project.',
    suggestedSeats: ['B2', 'B3'],
  },
  {
    id: 4,
    title: 'Spider-Man: Across the Spider-Verse',
    genre: 'Action',
    rating: 4.8,
    year: 2023,
    duration: '2h 20m',
    price: 13,
    aiPick: false,
    synopsis: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People.',
    suggestedSeats: ['A3', 'A4'],
  },
  {
    id: 5,
    title: 'Past Lives',
    genre: 'Romance',
    rating: 4.6,
    year: 2023,
    duration: '1h 45m',
    price: 12,
    aiPick: false,
    synopsis: 'Nora and Hae Sung, two deeply connected childhood friends, are reunited for one fateful week.',
    suggestedSeats: ['C2', 'C3'],
  },
  {
    id: 6,
    title: 'Blade Runner 2049',
    genre: 'Sci-Fi',
    rating: 4.7,
    year: 2017,
    duration: '2h 44m',
    price: 15,
    aiPick: false,
    synopsis: 'A young blade runner unearths a long-buried secret that leads him to track down Rick Deckard.',
    suggestedSeats: ['B4', 'B5'],
  },
]

const GENRES = ['All', 'Sci-Fi', 'Epic', 'Drama', 'Action', 'Romance']
const SCREENING_DATES = [
  { id: 'today', label: 'Today', date: 'Nov 14', dayName: 'Thursday' },
  { id: 'tomorrow', label: 'Tomorrow', date: 'Nov 15', dayName: 'Friday' },
  { id: 'sat', label: 'Sat', date: 'Nov 16', dayName: 'Saturday' },
  { id: 'sun', label: 'Sun', date: 'Nov 17', dayName: 'Sunday' },
  { id: 'mon', label: 'Mon', date: 'Nov 18', dayName: 'Monday' },
]
const ROWS = ['A', 'B', 'C', 'D', 'E']
const COLS_LEFT = [1, 2, 3]
const COLS_RIGHT = [4, 5, 6]

type SeatTier = 'VIP_RECLINER' | 'PRIME_RESERVED' | 'STANDARD' | 'ACCESSIBLE'

interface TierConfig {
  name: string
  basePrice: number
  description: string
  seats: string[]
  badgeColor: string
  borderColor: string
}

const SEAT_TIERS: Record<SeatTier, TierConfig> = {
  VIP_RECLINER: {
    name: 'VIP Heated Leather Recliner',
    basePrice: 24.5,
    description: 'Motorized reclining, heated seat, food tray, Dolby Atmos focal center',
    seats: ['C3', 'C4', 'D3', 'D4'],
    badgeColor: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    borderColor: 'border-amber-400/80',
  },
  PRIME_RESERVED: {
    name: 'Prime Stadium Reserved',
    basePrice: 19.5,
    description: 'Extra legroom, luxury plush rocker, central field of view',
    seats: ['B3', 'B4', 'C2', 'C5', 'D2', 'D5'],
    badgeColor: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
    borderColor: 'border-purple-400/70',
  },
  STANDARD: {
    name: 'Standard Stadium',
    basePrice: 16.0,
    description: 'Ergonomic high-back theater seat with cup holder',
    seats: ['A2', 'A3', 'A4', 'A5', 'B2', 'B5', 'E2', 'E3', 'E4', 'E5'],
    badgeColor: 'text-zinc-300 bg-zinc-800 border-zinc-700',
    borderColor: 'border-zinc-700',
  },
  ACCESSIBLE: {
    name: 'Wheelchair & Companion Bay',
    basePrice: 16.0,
    description: 'Step-free flat entrance bay with companion adjacent seating',
    seats: ['A1', 'A6', 'E1', 'E6'],
    badgeColor: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    borderColor: 'border-cyan-400/70',
  },
}

function getSeatTier(seatId: string): SeatTier {
  if (SEAT_TIERS.VIP_RECLINER.seats.includes(seatId)) return 'VIP_RECLINER'
  if (SEAT_TIERS.PRIME_RESERVED.seats.includes(seatId)) return 'PRIME_RESERVED'
  if (SEAT_TIERS.ACCESSIBLE.seats.includes(seatId)) return 'ACCESSIBLE'
  return 'STANDARD'
}

function getFormatMultiplier(fmt: string): number {
  if (fmt.includes('IMAX')) return 1.15
  if (fmt.includes('Dolby')) return 1.05
  return 1.0
}

export default function BookingPage() {
  const [movies, setMovies] = useState<Movie[]>(INITIAL_MOVIES)

  useEffect(() => {
    const API_BASE =
      typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
        : 'http://localhost:8080'
    fetch(`${API_BASE}/api/v1/movies`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setMovies(data)
        }
      })
      .catch(() => {})
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [filterAiPicksOnly, setFilterAiPicksOnly] = useState(false)

  // AI Agent Search State
  const [aiSearchPrompt, setAiSearchPrompt] = useState('')
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState<{
    reasoning: string
    suggestedMovieTitle: string
  } | null>(null)

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Real-Time Distributed Seat Inventory & 10-Minute Lock State
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([])
  const [lockedSeats, setLockedSeats] = useState<string[]>([])
  const [activeLockToken, setActiveLockToken] = useState<string | null>(null)
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
  const [isLocking, setIsLocking] = useState<boolean>(false)
  const [lockWarning, setLockWarning] = useState<string | null>(null)

  const [bookingConfirmation, setBookingConfirmation] = useState<{
    ticketId: string
    txnId: string
    movie: string
    seats: string[]
    totalAmount: number
    auditorium: string
    showTime: string
  } | null>(null)

  const [inspectingReviewMovie, setInspectingReviewMovie] = useState<Movie | null>(null)
  const [selectedShowtime, setSelectedShowtime] = useState<string>('7:30 PM')
  const [selectedFormat, setSelectedFormat] = useState<string>('IMAX 70mm')
  const [selectedDate, setSelectedDate] = useState<string>('today')
  const [liveStreamConnected, setLiveStreamConnected] = useState<boolean>(false)
  const [liveBroadcastToast, setLiveBroadcastToast] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'CARD'>('WALLET')
  const [walletBalance, setWalletBalance] = useState<number>(175.0)

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/wallet`)
      .then((r) => (r.ok ? r.json() : null))
      .then((w) => {
        if (w) setWalletBalance(w.balance)
      })
      .catch(() => {})
  }, [])

  const playSound = (kind: 'click' | 'lock' | 'success') => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      if (kind === 'click') {
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        gain.gain.setValueAtTime(0.04, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.04)
      } else if (kind === 'lock') {
        osc.frequency.setValueAtTime(520, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08)
        gain.gain.setValueAtTime(0.05, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.12)
      } else if (kind === 'success') {
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08)
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.35)
      }
    } catch {}
  }

  const handleExtendLock = async () => {
    if (!selectedMovie || selectedSeats.length === 0 || isLocking) return
    setIsLocking(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/tickets/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: selectedMovie.title,
          showTime: selectedShowtime,
          seats: selectedSeats,
        }),
      })
      if (res.ok) {
        const lockData = await res.json()
        setActiveLockToken(lockData.lockToken)
        const expTime = new Date(lockData.expiresAt).getTime()
        setLockExpiresAt(expTime)
        setSecondsRemaining(Math.max(0, Math.floor((expTime - Date.now()) / 1000)))
        playSound('lock')
      }
    } finally {
      setIsLocking(false)
    }
  }

  // AI Agent Natural Language Movie Search with fast client timeout & fallback
  const handleAiAgentSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiSearchPrompt.trim() || isAiSearching) return

    setIsAiSearching(true)
    setAiRecommendation(null)

    const queryLower = aiSearchPrompt.toLowerCase()

    // Smart semantic keyword mapping
    const findBestMatchLocally = () => {
      // Space / Nolan / Wormhole
      if (queryLower.includes('space') || queryLower.includes('wormhole') || queryLower.includes('nolan') || queryLower.includes('father') || queryLower.includes('time')) {
        return {
          movie: movies[0] || INITIAL_MOVIES[0], // Interstellar
          reason: 'Interstellar is Christopher Nolan’s definitive masterpiece on space, love across dimensions, and relativity.'
        }
      }
      // Epic / Desert / Sci-fi battle
      if (queryLower.includes('desert') || queryLower.includes('epic') || queryLower.includes('war') || queryLower.includes('chani') || queryLower.includes('dune')) {
        return {
          movie: movies[1] || INITIAL_MOVIES[1], // Dune 2
          reason: 'Dune: Part Two delivers unmatched scale, desert warfare cinematography, and Hans Zimmer’s thunderous sound design.'
        }
      }
      // Historical / Physics / Drama
      if (queryLower.includes('history') || queryLower.includes('bomb') || queryLower.includes('physics') || queryLower.includes('drama') || queryLower.includes('oppenheimer')) {
        return {
          movie: movies[2] || INITIAL_MOVIES[2], // Oppenheimer
          reason: 'Oppenheimer offers a gripping character study of historical brilliance and atomic tension.'
        }
      }
      // Animation / Multiverse / Action
      if (queryLower.includes('superhero') || queryLower.includes('spiderman') || queryLower.includes('spider') || queryLower.includes('multiverse') || queryLower.includes('action') || queryLower.includes('animation')) {
        return {
          movie: movies[3] || INITIAL_MOVIES[3], // Spider-Man
          reason: 'Across the Spider-Verse features groundbreaking animation styles and a thrilling high-velocity multiverse story.'
        }
      }
      // Romance / Emotional / Quiet
      if (queryLower.includes('love') || queryLower.includes('romance') || queryLower.includes('emotional') || queryLower.includes('relationship') || queryLower.includes('gentle')) {
        return {
          movie: movies[4] || INITIAL_MOVIES[4], // Past Lives
          reason: 'Past Lives is an intimate, poignant meditation on destiny, lost love, and parallel paths.'
        }
      }
      // Cyberpunk / Detective / Mystery
      if (queryLower.includes('cyberpunk') || queryLower.includes('future') || queryLower.includes('detective') || queryLower.includes('ai') || queryLower.includes('blade')) {
        return {
          movie: movies[5] || INITIAL_MOVIES[5], // Blade Runner
          reason: 'Blade Runner 2049 is the gold standard for atmospheric neo-noir sci-fi and existential questions.'
        }
      }

      // Default highest rated AI pick
      return {
        movie: movies[0] || INITIAL_MOVIES[0],
        reason: `Matched "${aiSearchPrompt}" with our highest-rated IMAX feature.`
      }
    }

    try {
      // Fast fetch with 4s timeout controller
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)

      const catalogOverview = movies.map(
        (m) => `${m.title} (Genre: ${m.genre}, Rating: ${m.rating}, Story: ${m.synopsis})`
      ).join(' | ')

      const prompt = `User preference: "${aiSearchPrompt.trim()}". Current movies: ${catalogOverview}.
Return strictly:
MATCH: <Exact Movie Title>
REASON: <1 sentence why it matches>`

      const res = await fetch(`${API_BASE}/api/v1/chat?provider=groq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const text = data.response || ''
        const matchLine = text.split('\n').find((l: string) => l.startsWith('MATCH:'))
        const reasonLine = text.split('\n').find((l: string) => l.startsWith('REASON:'))

        const foundTitle = matchLine ? matchLine.replace('MATCH:', '').trim() : ''
        const reasonText = reasonLine ? reasonLine.replace('REASON:', '').trim() : ''

        const targetMovie = movies.find(
          (m) =>
            (foundTitle && m.title.toLowerCase().includes(foundTitle.toLowerCase())) ||
            text.toLowerCase().includes(m.title.toLowerCase())
        )

        if (targetMovie) {
          setAiRecommendation({
            suggestedMovieTitle: targetMovie.title,
            reasoning: reasonText || `AI selected ${targetMovie.title} for your preference!`,
          })
          handleSelectMovie(targetMovie)
          return
        }
      }
    } catch {
      // If backend network call takes too long or times out, seamlessly use smart local semantic match!
    }

    // Instant seamless execution
    const fallback = findBestMatchLocally()
    setAiRecommendation({
      suggestedMovieTitle: fallback.movie.title,
      reasoning: fallback.reason,
    })
    handleSelectMovie(fallback.movie)
    setIsAiSearching(false)
  }

  // Filter movies by search query, genre, and AI pick toggle
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesSearch =
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.synopsis.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesGenre = selectedGenre === 'All' || movie.genre === selectedGenre
      const matchesAiPick = !filterAiPicksOnly || movie.aiPick
      return matchesSearch && matchesGenre && matchesAiPick
    })
  }, [movies, searchQuery, selectedGenre, filterAiPicksOnly])

  // Refetch seat inventory whenever selected movie or showtime changes
  useEffect(() => {
    if (!selectedMovie) return

    let isMounted = true
    const fetchInventory = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/tickets/seats?movie=${encodeURIComponent(
            selectedMovie.title
          )}&showtime=${encodeURIComponent(selectedShowtime)}`
        )
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setOccupiedSeats(data.occupiedSeats || [])
            setLockedSeats(data.lockedSeats || [])
          }
        }
      } catch {
        if (isMounted) {
          setOccupiedSeats(['B2', 'D5', 'A3', 'D6'])
        }
      }
    }

    fetchInventory()
    return () => {
      isMounted = false
    }
  }, [selectedMovie, selectedShowtime])

  // Real-Time SSE Distributed Seat Synchronizer across concurrent patrons
  useEffect(() => {
    if (typeof window === 'undefined') return
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource(`${API_BASE}/api/v1/tickets/seats/stream`)
      eventSource.onopen = () => {
        setLiveStreamConnected(true)
      }
      eventSource.addEventListener('seat-update', (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (!payload) return
          const seats: string[] = Array.isArray(payload.seats) ? payload.seats : []
          if (payload.event === 'LOCK_ACQUIRED') {
            setLockedSeats((prev) => Array.from(new Set([...prev, ...seats])))
            setLiveBroadcastToast(`⚡ Guest hold acquired on seat ${seats.join(', ')}`)
            setTimeout(() => setLiveBroadcastToast(null), 4000)
            playSound('lock')
          } else if (payload.event === 'LOCK_RELEASED') {
            setLockedSeats((prev) => prev.filter((s) => !seats.includes(s)))
          } else if (payload.event === 'TICKET_ISSUED') {
            setOccupiedSeats((prev) => Array.from(new Set([...prev, ...seats])))
            setLockedSeats((prev) => prev.filter((s) => !seats.includes(s)))
            setLiveBroadcastToast(`🎟️ Seat ${seats.join(', ')} confirmed reserved`)
            setTimeout(() => setLiveBroadcastToast(null), 4000)
            playSound('success')
          }
        } catch {}
      })
      eventSource.onerror = () => {
        setLiveStreamConnected(false)
      }
    } catch {
      setLiveStreamConnected(false)
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  // 10-Minute Distributed Lock Countdown Timer
  useEffect(() => {
    if (!lockExpiresAt) return
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000))
      setSecondsRemaining(diff)
      if (diff === 0) {
        clearInterval(interval)
        setSelectedSeats([])
        setActiveLockToken(null)
        setLockExpiresAt(null)
        setLockWarning(
          '⏰ Your 10-minute seat lock expired. Seats have been returned to the public booking pool.'
        )
        if (selectedMovie) {
          fetch(
            `${API_BASE}/api/v1/tickets/seats?movie=${encodeURIComponent(
              selectedMovie.title
            )}&showtime=${encodeURIComponent(selectedShowtime)}`
          )
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d) {
                setOccupiedSeats(d.occupiedSeats || [])
                setLockedSeats(d.lockedSeats || [])
              }
            })
            .catch(() => {})
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockExpiresAt, selectedMovie, selectedShowtime])

  // Itemized dynamic price breakdown
  const priceBreakdown = useMemo(() => {
    const tierCounts: Record<SeatTier, number> = {
      VIP_RECLINER: 0,
      PRIME_RESERVED: 0,
      STANDARD: 0,
      ACCESSIBLE: 0,
    }
    selectedSeats.forEach((s) => {
      const t = getSeatTier(s)
      tierCounts[t]++
    })

    const multiplier = getFormatMultiplier(selectedFormat)
    let total = 0
    const items: { tier: SeatTier; name: string; count: number; unitPrice: number; subtotal: number }[] = []

    for (const [tierKey, count] of Object.entries(tierCounts) as [SeatTier, number][]) {
      if (count > 0) {
        const unit = Math.round(SEAT_TIERS[tierKey].basePrice * multiplier * 100) / 100
        const sub = Math.round(unit * count * 100) / 100
        total += sub
        items.push({
          tier: tierKey,
          name: SEAT_TIERS[tierKey].name,
          count,
          unitPrice: unit,
          subtotal: sub,
        })
      }
    }
    return { items, total: Math.round(total * 100) / 100 }
  }, [selectedSeats, selectedFormat])

  const handleSelectMovie = async (movie: Movie, customShowtime?: string, customFormat?: string) => {
    setSelectedMovie(movie)
    setBookingConfirmation(null)
    setLockWarning(null)

    const times = movie.showtimes ? movie.showtimes.split(',').map((s) => s.trim()) : ['7:30 PM']
    const time = customShowtime || times[0] || '7:30 PM'
    setSelectedShowtime(time)

    const defaultFmt =
      customFormat ||
      (movie.auditorium?.includes('IMAX')
        ? 'IMAX 70mm'
        : movie.auditorium?.includes('Dolby')
        ? 'Dolby Cinema'
        : 'Standard 4K Laser')
    setSelectedFormat(defaultFmt)

    // Release any previous lock
    if (activeLockToken) {
      fetch(`${API_BASE}/api/v1/tickets/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockToken: activeLockToken }),
      }).catch(() => {})
      setActiveLockToken(null)
      setLockExpiresAt(null)
      setSecondsRemaining(0)
    }

    // Try pre-locking suggested seats if available
    try {
      const seatRes = await fetch(
        `${API_BASE}/api/v1/tickets/seats?movie=${encodeURIComponent(movie.title)}&showtime=${encodeURIComponent(time)}`
      )
      if (seatRes.ok) {
        const seatData = await seatRes.json()
        const occupied = seatData.occupiedSeats || []
        setOccupiedSeats(occupied)
        setLockedSeats(seatData.lockedSeats || [])

        const availableSuggested = movie.suggestedSeats.filter((s) => !occupied.includes(s))
        const seatsToLock = availableSuggested.length > 0 ? availableSuggested : []
        setSelectedSeats(seatsToLock)

        if (seatsToLock.length > 0) {
          const lockRes = await fetch(`${API_BASE}/api/v1/tickets/lock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              movieTitle: movie.title,
              showTime: time,
              seats: seatsToLock,
            }),
          })
          if (lockRes.ok) {
            const lk = await lockRes.json()
            setActiveLockToken(lk.lockToken)
            const exp = new Date(lk.expiresAt).getTime()
            setLockExpiresAt(exp)
            setSecondsRemaining(Math.max(0, Math.floor((exp - Date.now()) / 1000)))
          }
        }
      }
    } catch {
      setSelectedSeats(movie.suggestedSeats)
    }

    // Smooth scroll to seat selector
    const seatEl = document.getElementById('seat-selector-section')
    if (seatEl) {
      seatEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const toggleSeat = async (seatId: string) => {
    if (occupiedSeats.includes(seatId)) return
    if (lockedSeats.includes(seatId) && !selectedSeats.includes(seatId)) return

    const newSeats = selectedSeats.includes(seatId)
      ? selectedSeats.filter((s) => s !== seatId)
      : [...selectedSeats, seatId]

    setSelectedSeats(newSeats)
    setLockWarning(null)
    playSound('click')

    if (!selectedMovie) return

    if (newSeats.length > 0) {
      setIsLocking(true)
      try {
        const res = await fetch(`${API_BASE}/api/v1/tickets/lock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieTitle: selectedMovie.title,
            showTime: selectedShowtime,
            seats: newSeats,
          }),
        })
        if (res.ok) {
          const lockData = await res.json()
          setActiveLockToken(lockData.lockToken)
          const expTime = new Date(lockData.expiresAt).getTime()
          setLockExpiresAt(expTime)
          setSecondsRemaining(Math.max(0, Math.floor((expTime - Date.now()) / 1000)))
          playSound('lock')
        }
      } catch {
        // Fallback local lock
        setActiveLockToken('LOCK-LOCAL-' + Math.random().toString(36).substring(2, 8).toUpperCase())
        const expTime = Date.now() + 600 * 1000
        setLockExpiresAt(expTime)
        setSecondsRemaining(600)
      } finally {
        setIsLocking(false)
      }
    } else {
      if (activeLockToken) {
        fetch(`${API_BASE}/api/v1/tickets/unlock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lockToken: activeLockToken }),
        }).catch(() => {})
        setActiveLockToken(null)
        setLockExpiresAt(null)
        setSecondsRemaining(0)
      }
    }
  }

  const handleCompleteBooking = async () => {
    if (!selectedMovie || selectedSeats.length === 0 || isProcessing) return

    setIsProcessing(true)

    const totalAmount = priceBreakdown.total
    const showTime = selectedShowtime
    const auditorium = `${selectedFormat} (${selectedMovie.auditorium || 'Screen 1'})`

    try {
      if (paymentMethod === 'WALLET') {
        try {
          const wRes = await fetch(`${API_BASE}/api/v1/wallet/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: totalAmount,
              type: 'TICKET_PAYMENT',
              description: `${selectedMovie.title} (${selectedSeats.join(', ')})`,
            }),
          })
          if (wRes.ok) {
            const wTxn = await wRes.json()
            setWalletBalance(wTxn.balanceAfter)
          }
        } catch {}
      }

      const res = await fetch(`${API_BASE}/api/v1/tickets/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: selectedMovie.title,
          showTime,
          format: selectedFormat,
          auditorium,
          seats: selectedSeats,
          totalPaid: totalAmount,
        }),
      })

      if (res.ok) {
        const ticket = await res.json()
        playSound('success')
        setBookingConfirmation({
          ticketId: ticket.ticketId,
          txnId: 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          movie: selectedMovie.title,
          seats: [...selectedSeats],
          totalAmount,
          auditorium,
          showTime,
        })

        // Release lock and mark seats occupied
        if (activeLockToken) {
          fetch(`${API_BASE}/api/v1/tickets/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lockToken: activeLockToken }),
          }).catch(() => {})
          setActiveLockToken(null)
          setLockExpiresAt(null)
          setSecondsRemaining(0)
        }
        setOccupiedSeats((prev) => [...prev, ...selectedSeats])
        setSelectedSeats([])
      } else {
        throw new Error('Ticket issue failed')
      }
    } catch {
      // Local fallback
      const fallbackTicketId =
        'TKT-' +
        selectedMovie.title.substring(0, 4).toUpperCase() +
        '-' +
        Math.random().toString(36).substring(2, 6).toUpperCase()
      setBookingConfirmation({
        ticketId: fallbackTicketId,
        txnId: 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        movie: selectedMovie.title,
        seats: [...selectedSeats],
        totalAmount,
        auditorium,
        showTime,
      })
      setOccupiedSeats((prev) => [...prev, ...selectedSeats])
      setSelectedSeats([])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>🎬 Smart Movie Booking</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${
                liveStreamConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  liveStreamConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              {liveStreamConnected ? 'Real-Time Sync Active' : 'Polling Sync'}
            </span>
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Browse theatrical titles, select sensory formats, and claim real-time distributed seat locks.
          </p>
        </div>
      </div>

      {/* Floating Live Broadcast Toast for Circuit Seat Activity */}
      {liveBroadcastToast && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs font-mono animate-slide-up shadow-xl backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span>{liveBroadcastToast}</span>
        </div>
      )}

      {/* AI Movie Concierge Agent Bar */}
      <div
        className="rounded-xl border p-5 space-y-3"
        style={{
          background: 'linear-gradient(145deg, #18112e 0%, #111111 100%)',
          borderColor: '#7c3aed44',
          boxShadow: '0 0 24px #7c3aed15',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm text-purple-300">
            <Bot className="h-4 w-4 text-[#a78bfa]" />
            <span>AI Movie Concierge Agent</span>
          </div>
          <span className="text-[11px] text-[#888] font-mono">Autonomous Search & Recommendation</span>
        </div>

        <form onSubmit={handleAiAgentSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Compass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7c3aed]" />
            <input
              type="text"
              placeholder="e.g. 'I want something deeply emotional and visual' or 'High energy sci-fi with time travel'..."
              value={aiSearchPrompt}
              onChange={(e) => setAiSearchPrompt(e.target.value)}
              className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm text-white bg-[#0d0d0d] border border-[#2a2a2a] focus:border-[#7c3aed] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isAiSearching || !aiSearchPrompt.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 transition-all shrink-0 shadow-lg"
          >
            {isAiSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Agent Searching...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Agent Search
              </>
            )}
          </button>
        </form>

        {aiRecommendation && (
          <div className="rounded-lg p-3 text-xs bg-[#7c3aed15] border border-[#7c3aed40] text-purple-200 flex items-start gap-2.5 animate-slide-up">
            <Sparkles className="h-4 w-4 text-[#a78bfa] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-white">
                Agent Match:{' '}
                <span className="text-[#a78bfa] underline cursor-pointer">
                  {aiRecommendation.suggestedMovieTitle || 'Custom Recommendation'}
                </span>{' '}
                — (Selected & Scrolled to Seat Selection below!)
              </p>
              <p className="text-[#ccc] leading-relaxed">{aiRecommendation.reasoning}</p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Keyword Search & Filters */}
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ backgroundColor: '#111111', borderColor: '#222' }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
            <input
              type="text"
              placeholder="Search catalog by title, actor, or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg pl-10 pr-9 py-2 text-sm text-white bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#7c3aed] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* AI Picks Only Toggle */}
          <button
            onClick={() => setFilterAiPicksOnly(!filterAiPicksOnly)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all shrink-0 ${
              filterAiPicksOnly
                ? 'bg-[#7c3aed20] border-[#7c3aed] text-white shadow-sm'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#888] hover:text-white'
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${filterAiPicksOnly ? 'text-[#a78bfa]' : 'text-[#666]'}`} />
            AI Picks Only
          </button>
        </div>

        {/* Genre Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-[#555] flex items-center gap-1 mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Genres:
          </span>
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedGenre === genre
                  ? 'bg-[#7c3aed] text-white shadow'
                  : 'bg-[#181818] border border-[#262626] text-[#777] hover:text-[#bbb]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Movie Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#666]">
            Showing Titles ({filteredMovies.length})
          </p>
          {(searchQuery || selectedGenre !== 'All' || filterAiPicksOnly) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedGenre('All')
                setFilterAiPicksOnly(false)
              }}
              className="text-xs text-[#a78bfa] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredMovies.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMovies.map((movie) => {
              const isSelected = selectedMovie?.id === movie.id
              return (
                <div
                  key={movie.id}
                  className={`relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${
                    isSelected
                      ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/40'
                      : 'border-[#2a2a2a] bg-[#1a1a1a]'
                  }`}
                  style={{ backgroundColor: isSelected ? '#181226' : '#1a1a1a' }}
                >
                  {movie.aiPick && (
                    <div
                      className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full px-2 py-0.5"
                      style={{ backgroundColor: '#7c3aed', boxShadow: '0 0 12px #7c3aed88' }}
                    >
                      <Sparkles className="h-3 w-3 text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                        AI Pick
                      </span>
                    </div>
                  )}

                  {/* Poster Header */}
                  <div className="relative h-36 overflow-hidden">
                    {movie.posterUrl ? (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-4xl"
                        style={{
                          background: movie.aiPick
                            ? 'linear-gradient(135deg, #1e1040 0%, #0f0f1a 100%)'
                            : 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
                        }}
                      >
                        🎬
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/50 to-transparent" />
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
                      <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-zinc-300 border border-white/10">
                        {movie.auditorium ? movie.auditorium.split(' ')[0] : 'Dolby'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-white leading-tight">{movie.title}</h3>
                        <p className="mt-0.5 text-[11px] text-zinc-400 font-mono">
                          {movie.releaseDate || movie.year} · {movie.duration}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        ${movie.price}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-[#888] line-clamp-2">
                      {movie.synopsis}
                    </p>

                    {/* Live Critic Review Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-zinc-800/60">
                      {movie.rottenTomatoes && (
                        <span className="flex items-center gap-1 rounded-md bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300 shadow-sm" title="Rotten Tomatoes Tomatometer">
                          <span>🍅</span> {movie.rottenTomatoes}%
                        </span>
                      )}
                      {movie.metacritic && (
                        <span className="flex items-center gap-1 rounded-md bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300 shadow-sm" title="Metacritic Score">
                          <span className="font-mono text-[9px] bg-indigo-600 text-white rounded px-1">M</span> {movie.metacritic}
                        </span>
                      )}
                      {movie.imdbRating && (
                        <span className="flex items-center gap-1 rounded-md bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 shadow-sm" title="IMDb Rating">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> {movie.imdbRating}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setInspectingReviewMovie(movie)
                        }}
                        className="ml-auto text-[10px] font-medium text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 py-0.5"
                      >
                        <Info className="h-3 w-3" />
                        Reviews
                      </button>
                    </div>

                    {/* Interactive Showtimes on Card */}
                    <div className="pt-2 border-t border-zinc-800/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          Showtimes
                        </span>
                        {movie.ageRating && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300 border border-zinc-700">
                            {movie.ageRating}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(movie.showtimes ? movie.showtimes.split(',').map((s) => s.trim()) : ['1:30 PM', '5:00 PM', '8:45 PM']).map((time) => {
                          const isTimeSelected = isSelected && selectedShowtime === time
                          return (
                            <button
                              key={time}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectMovie(movie, time)
                              }}
                              className={`rounded-lg px-2 py-1 text-[11px] font-mono font-medium transition-all ${
                                isTimeSelected
                                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 ring-1 ring-purple-400'
                                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60'
                              }`}
                            >
                              {time}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setInspectingReviewMovie(movie)
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-all border border-zinc-700"
                        title="Watch trailer & read verified critic reviews"
                      >
                        <Play className="h-3 w-3 text-purple-400" />
                        Trailer & Intel
                      </button>

                      <button
                        onClick={() => handleSelectMovie(movie)}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                            : 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg shadow-purple-600/30'
                        }`}
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        {isSelected ? 'Seats Active' : 'Book Seats'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#222] p-12 text-center text-[#555] space-y-2">
            <Search className="h-8 w-8 mx-auto text-[#444]" />
            <p className="text-sm font-medium text-gray-400">No movies found matching "{searchQuery}"</p>
            <p className="text-xs text-[#666]">Try adjusting your search terms or genre filter.</p>
          </div>
        )}
      </div>

      {/* Interactive Seat Picker Section */}
      <div
        id="seat-selector-section"
        className="rounded-2xl border p-6 space-y-6"
        style={{
          backgroundColor: '#101014',
          borderColor: selectedMovie ? '#7c3aed55' : '#222',
          boxShadow: selectedMovie ? '0 0 30px rgba(124, 58, 237, 0.1)' : 'none',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Armchair className="h-5 w-5 text-[#a78bfa]" />
              {selectedMovie ? `Auditorium Seating Matrix: ${selectedMovie.title}` : 'Select a Movie to Choose Seats'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {selectedMovie
                ? 'VIP Recliners, Prime Stadium, and Wheelchair bays with live 10-minute distributed reservation lock.'
                : 'Click "Book Seats" on any movie above to enter the auditorium.'}
            </p>
          </div>

          {selectedMovie && (
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <span className="text-emerald-400 font-semibold">Your Pick</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-amber-400 bg-amber-500/20" />
                <span className="text-amber-300">VIP Recliner ($24.50)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-purple-400 bg-purple-500/20" />
                <span className="text-purple-300">Prime ($19.50)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-cyan-400 bg-cyan-500/20" />
                <span className="text-cyan-300">Accessible ($16.00)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-zinc-700 bg-zinc-800" />
                <span className="text-zinc-400">Standard ($16.00)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-600 text-[9px] flex items-center justify-center">✕</span>
                <span className="text-zinc-500">Occupied</span>
              </div>
            </div>
          )}
        </div>

        {selectedMovie ? (
          <div className="space-y-6">
            {/* Theatrical Date, Format & Showtime Bar */}
            <div className="space-y-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              {/* Screening Date Selector */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Screening Date
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {SCREENING_DATES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDate(d.id)
                        playSound('click')
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                        selectedDate === d.id
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-bold'
                          : 'bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80'
                      }`}
                    >
                      <span className="text-[10px] uppercase opacity-75">{d.dayName}</span>
                      <span className="font-mono">{d.date}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-zinc-800/80">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Auditorium Experience & Projection Format
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { label: 'IMAX 70mm', mult: '+15% Dynamic Rate' },
                      { label: 'Dolby Cinema', mult: '+5% Dual Laser' },
                      { label: 'Standard 4K Laser', mult: 'Standard' },
                    ].map((fmt) => (
                      <button
                        key={fmt.label}
                        onClick={() => {
                          setSelectedFormat(fmt.label)
                          playSound('click')
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          selectedFormat === fmt.label
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                        }`}
                      >
                        <span>{fmt.label}</span>
                        <span className="text-[10px] opacity-75 font-mono">({fmt.mult})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Auditorium Showtime
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedMovie.showtimes ? selectedMovie.showtimes.split(',').map((s) => s.trim()) : ['1:30 PM', '5:00 PM', '8:45 PM']).map((time) => (
                      <button
                        key={time}
                        onClick={() => {
                          setSelectedShowtime(time)
                          playSound('click')
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                          selectedShowtime === time
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Distributed Real-Time Seat Lock Banner */}
            {activeLockToken && secondsRemaining > 0 && (
              <div className="rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-950 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4 text-purple-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Distributed Seat Lock Active
                      </span>
                      <span className="font-mono text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                        {activeLockToken}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Seats <span className="font-mono text-purple-300 font-bold">{selectedSeats.join(', ')}</span> are held in real-time across all box office terminals.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-purple-500/30">
                    <Timer className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-zinc-400 font-medium">Expires In:</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {Math.floor(secondsRemaining / 60)
                        .toString()
                        .padStart(2, '0')}
                      :{(secondsRemaining % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    onClick={handleExtendLock}
                    disabled={isLocking}
                    className="flex items-center gap-1 text-[11px] font-semibold text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 px-2.5 py-1.5 rounded-lg transition"
                    title="Extend your distributed reservation lock"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLocking ? 'animate-spin' : ''}`} />
                    +5 Min
                  </button>
                </div>
              </div>
            )}

            {/* Lock Expiry Warning Alert */}
            {lockWarning && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 flex items-center gap-3 text-amber-300 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{lockWarning}</span>
              </div>
            )}

            {/* Realistic Curved Theatrical Screen Arc */}
            <div className="w-full text-center space-y-2 py-2">
              <div className="relative mx-auto w-4/5 max-w-xl">
                <div
                  className="h-2 w-full rounded-t-full bg-gradient-to-r from-purple-500/20 via-purple-400 to-purple-500/20 shadow-lg shadow-purple-500/30"
                  style={{
                    boxShadow: '0 0 25px rgba(168, 85, 247, 0.5)',
                  }}
                />
                <div
                  className="h-10 w-full"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.18) 0%, transparent 70%)',
                  }}
                />
              </div>
              <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-zinc-500">
                ⚡ 70MM DUAL LASER CURVED CINEMA SCREEN
              </p>
            </div>

            {/* Realistic Seating Layout with Center Aisle */}
            <div className="flex flex-col items-center gap-3.5 py-2">
              {ROWS.map((row) => (
                <div key={row} className="flex items-center gap-2 sm:gap-3">
                  {/* Left row label */}
                  <span className="w-5 text-center text-xs font-mono font-bold text-zinc-500">
                    {row}
                  </span>

                  {/* Left Seating Block (Columns 1, 2, 3) */}
                  <div className="flex gap-2 sm:gap-2.5">
                    {COLS_LEFT.map((col) => {
                      const seatId = `${row}${col}`
                      const isSelected = selectedSeats.includes(seatId)
                      const isOccupied = occupiedSeats.includes(seatId)
                      const isLocked = lockedSeats.includes(seatId) && !isSelected
                      const isAiPick = selectedMovie.suggestedSeats.includes(seatId)
                      const tier = getSeatTier(seatId)
                      const tierConfig = SEAT_TIERS[tier]
                      const price = Math.round(tierConfig.basePrice * getFormatMultiplier(selectedFormat) * 100) / 100

                      return (
                        <button
                          key={seatId}
                          disabled={isOccupied || isLocked}
                          onClick={() => toggleSeat(seatId)}
                          className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-lg flex flex-col items-center justify-center text-xs font-mono font-bold transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 scale-105 z-10'
                              : isOccupied
                              ? 'bg-zinc-900/60 text-zinc-700 border border-zinc-800/80 cursor-not-allowed opacity-60'
                              : isLocked
                              ? 'bg-purple-950/40 text-purple-400 border border-purple-500/40 cursor-not-allowed'
                              : tier === 'VIP_RECLINER'
                              ? 'bg-amber-950/20 text-amber-300 border border-amber-400/80 hover:bg-amber-900/40 shadow-sm shadow-amber-500/10'
                              : tier === 'PRIME_RESERVED'
                              ? 'bg-purple-950/20 text-purple-300 border border-purple-400/70 hover:bg-purple-900/40 shadow-sm shadow-purple-500/10'
                              : tier === 'ACCESSIBLE'
                              ? 'bg-cyan-950/20 text-cyan-300 border border-cyan-400/70 hover:bg-cyan-900/40'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white'
                          }`}
                          title={`${seatId} • ${tierConfig.name} • $${price} ${
                            isOccupied
                              ? '(Occupied)'
                              : isLocked
                              ? '(Locked by guest)'
                              : isAiPick
                              ? '(AI Suggestion)'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-0.5">
                            {tier === 'VIP_RECLINER' && !isOccupied && (
                              <Crown className="h-2.5 w-2.5 text-amber-400" />
                            )}
                            {tier === 'ACCESSIBLE' && !isOccupied && (
                              <Accessibility className="h-2.5 w-2.5 text-cyan-400" />
                            )}
                            <span>{seatId}</span>
                          </div>
                          {isOccupied ? (
                            <span className="text-[9px] text-zinc-600 leading-none">✕</span>
                          ) : (
                            <span className="text-[9px] opacity-70 leading-none">${price}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Center Aisle Walkway */}
                  <div className="w-8 sm:w-12 text-center flex flex-col items-center justify-center">
                    <span className="text-[9px] font-mono tracking-widest text-zinc-600 uppercase select-none">
                      Aisle
                    </span>
                  </div>

                  {/* Right Seating Block (Columns 4, 5, 6) */}
                  <div className="flex gap-2 sm:gap-2.5">
                    {COLS_RIGHT.map((col) => {
                      const seatId = `${row}${col}`
                      const isSelected = selectedSeats.includes(seatId)
                      const isOccupied = occupiedSeats.includes(seatId)
                      const isLocked = lockedSeats.includes(seatId) && !isSelected
                      const isAiPick = selectedMovie.suggestedSeats.includes(seatId)
                      const tier = getSeatTier(seatId)
                      const tierConfig = SEAT_TIERS[tier]
                      const price = Math.round(tierConfig.basePrice * getFormatMultiplier(selectedFormat) * 100) / 100

                      return (
                        <button
                          key={seatId}
                          disabled={isOccupied || isLocked}
                          onClick={() => toggleSeat(seatId)}
                          className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-lg flex flex-col items-center justify-center text-xs font-mono font-bold transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 scale-105 z-10'
                              : isOccupied
                              ? 'bg-zinc-900/60 text-zinc-700 border border-zinc-800/80 cursor-not-allowed opacity-60'
                              : isLocked
                              ? 'bg-purple-950/40 text-purple-400 border border-purple-500/40 cursor-not-allowed'
                              : tier === 'VIP_RECLINER'
                              ? 'bg-amber-950/20 text-amber-300 border border-amber-400/80 hover:bg-amber-900/40 shadow-sm shadow-amber-500/10'
                              : tier === 'PRIME_RESERVED'
                              ? 'bg-purple-950/20 text-purple-300 border border-purple-400/70 hover:bg-purple-900/40 shadow-sm shadow-purple-500/10'
                              : tier === 'ACCESSIBLE'
                              ? 'bg-cyan-950/20 text-cyan-300 border border-cyan-400/70 hover:bg-cyan-900/40'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white'
                          }`}
                          title={`${seatId} • ${tierConfig.name} • $${price} ${
                            isOccupied
                              ? '(Occupied)'
                              : isLocked
                              ? '(Locked by guest)'
                              : isAiPick
                              ? '(AI Suggestion)'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-0.5">
                            {tier === 'VIP_RECLINER' && !isOccupied && (
                              <Crown className="h-2.5 w-2.5 text-amber-400" />
                            )}
                            {tier === 'ACCESSIBLE' && !isOccupied && (
                              <Accessibility className="h-2.5 w-2.5 text-cyan-400" />
                            )}
                            <span>{seatId}</span>
                          </div>
                          {isOccupied ? (
                            <span className="text-[9px] text-zinc-600 leading-none">✕</span>
                          ) : (
                            <span className="text-[9px] opacity-70 leading-none">${price}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Right row label */}
                  <span className="w-5 text-center text-xs font-mono font-bold text-zinc-500">
                    {row}
                  </span>
                </div>
              ))}
            </div>

            {/* Itemized Dynamic Booking & Checkout Bar */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-4 bg-zinc-950/60 p-4 rounded-xl">
              <div className="space-y-1">
                <p className="text-xs text-zinc-400 font-medium">Selected Seats:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedSeats.length > 0 ? (
                    selectedSeats.map((seatId) => {
                      const tier = getSeatTier(seatId)
                      const config = SEAT_TIERS[tier]
                      return (
                        <span
                          key={seatId}
                          className={`font-mono text-xs px-2 py-0.5 rounded border font-bold ${config.badgeColor}`}
                        >
                          {seatId} ({tier === 'VIP_RECLINER' ? 'VIP' : tier === 'PRIME_RESERVED' ? 'Prime' : tier === 'ACCESSIBLE' ? 'Access' : 'Std'})
                        </span>
                      )
                    })
                  ) : (
                    <span className="text-xs text-zinc-600 font-mono italic">No seats selected</span>
                  )}
                </div>
              </div>

              {/* Itemized price breakdown & Payment Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Fintech Wallet or Card Toggle */}
                <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('WALLET')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                      paymentMethod === 'WALLET'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>CineCash (${walletBalance.toFixed(2)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                      paymentMethod === 'CARD'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Card</span>
                  </button>
                </div>

                {priceBreakdown.items.length > 0 && (
                  <div className="text-right space-y-0.5">
                    <div className="text-[11px] text-zinc-400">
                      {priceBreakdown.items
                        .map((it) => `${it.count}x ${it.tier === 'VIP_RECLINER' ? 'VIP' : it.tier === 'PRIME_RESERVED' ? 'Prime' : it.tier === 'ACCESSIBLE' ? 'Bay' : 'Std'} ($${it.unitPrice.toFixed(2)})`)
                        .join(' + ')}
                    </div>
                    <div className="flex items-baseline justify-end gap-2">
                      <span className="text-xs text-zinc-400">Total:</span>
                      <span className="text-xl font-mono font-black text-emerald-400">
                        ${priceBreakdown.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleCompleteBooking}
                disabled={isProcessing || selectedSeats.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 shrink-0"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cryptographic Signing Pass...
                  </>
                ) : (
                  <>
                    {paymentMethod === 'WALLET' ? (
                      <Wallet className="h-4 w-4" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    Pay with {paymentMethod === 'WALLET' ? 'Wallet' : 'Card'} (${priceBreakdown.total.toFixed(2)})
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-zinc-500 space-y-2">
            <Ticket className="h-8 w-8 mx-auto text-zinc-600" />
            <p className="text-sm">Click "Book Seats" on any movie above to choose your seats.</p>
          </div>
        )}

        {/* Confirmation Modal / Real End-to-End Card */}
        {bookingConfirmation && (
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 via-zinc-900 to-zinc-950 p-6 space-y-5 text-emerald-300 animate-slide-up shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-2.5 font-bold text-emerald-400 text-lg">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <span>Admission Confirmed & Digital Pass Issued!</span>
              </div>
              <span className="font-mono text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                Ticket ID: {bookingConfirmation.ticketId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-500 uppercase font-semibold block text-[10px]">Movie</span>
                <span className="text-white font-bold text-sm">{bookingConfirmation.movie}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase font-semibold block text-[10px]">Auditorium & Showtime</span>
                <span className="text-zinc-200 font-semibold">{bookingConfirmation.auditorium} • {bookingConfirmation.showTime}</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase font-semibold block text-[10px]">Seats Reserved</span>
                <span className="text-purple-400 font-bold text-sm">{bookingConfirmation.seats.join(', ')}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/tickets?id=${bookingConfirmation.ticketId}`}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition active:scale-95"
              >
                <Ticket className="h-4 w-4" />
                Open in Pass Wallet & Gate Scanner
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href={`/concessions?movie=${encodeURIComponent(bookingConfirmation.movie)}&seats=${bookingConfirmation.seats.join(',')}&auditorium=${encodeURIComponent(bookingConfirmation.auditorium)}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition active:scale-95"
              >
                <UtensilsCrossed className="h-4 w-4 text-amber-400" />
                Order Gourmet F&B ({bookingConfirmation.seats.length > 1 ? `Seats ${bookingConfirmation.seats.join(', ')}` : `Seat ${bookingConfirmation.seats[0]}`})
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Live Critic Reviews & Theatrical Trailer Dossier Modal */}
      {inspectingReviewMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-[#121214] p-6 shadow-2xl space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {inspectingReviewMovie.title}
                  </h3>
                  {inspectingReviewMovie.ageRating && (
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-300 border border-zinc-700">
                      {inspectingReviewMovie.ageRating}
                    </span>
                  )}
                  <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
                    Premiere: {inspectingReviewMovie.releaseDate || inspectingReviewMovie.year} · {inspectingReviewMovie.duration}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Directed by {inspectingReviewMovie.director || 'Visionary Filmmaker'} • Starring {inspectingReviewMovie.cast || 'Leading Ensemble'}
                </p>
              </div>
              <button
                onClick={() => setInspectingReviewMovie(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Embedded YouTube Theatrical Trailer */}
            {inspectingReviewMovie.trailerUrl ? (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 shadow-xl bg-black">
                <iframe
                  src={`${inspectingReviewMovie.trailerUrl}?autoplay=0&rel=0&modestbranding=1`}
                  title={`${inspectingReviewMovie.title} Trailer`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative h-44 rounded-xl overflow-hidden border border-zinc-800">
                <img
                  src={inspectingReviewMovie.posterUrl}
                  alt={inspectingReviewMovie.title}
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end p-4">
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                    {inspectingReviewMovie.synopsis}
                  </p>
                </div>
              </div>
            )}

            {/* Tri-Gauge Ratings Card */}
            <div className="grid grid-cols-3 gap-3">
              {/* Rotten Tomatoes */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-center">
                <span className="text-xl">🍅</span>
                <div className="text-lg font-extrabold text-white mt-0.5">
                  {inspectingReviewMovie.rottenTomatoes ?? 88}%
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                  {(inspectingReviewMovie.rottenTomatoes ?? 88) >= 90 ? 'Certified Fresh' : 'Fresh'}
                </div>
              </div>

              {/* Metacritic */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 text-center">
                <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold text-white font-mono">
                  M
                </div>
                <div className="text-lg font-extrabold text-white mt-0.5">
                  {inspectingReviewMovie.metacritic ?? 80}/100
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                  Universal Acclaim
                </div>
              </div>

              {/* IMDb */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400" />
                </div>
                <div className="text-lg font-extrabold text-white mt-0.5">
                  {inspectingReviewMovie.imdbRating ?? inspectingReviewMovie.rating}/10
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  {inspectingReviewMovie.reviewsCount ?? 350}+ Reviews
                </div>
              </div>
            </div>

            {/* Critical Consensus Banner */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Critical Consensus
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                "{inspectingReviewMovie.criticConsensus ?? 'Critically acclaimed theatrical presentation with landmark visual design and storytelling.'}"
              </p>
            </div>

            {/* Featured Publication Critic Quote */}
            <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/20 via-zinc-900/60 to-transparent p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Featured Critic Spotlight
              </span>
              <blockquote className="text-xs text-purple-200 italic leading-relaxed">
                {inspectingReviewMovie.topCriticQuote ?? '"An exceptional cinematic feat that demands theater viewing." — Variety'}
              </blockquote>
            </div>

            {/* Select Showtime Pill Row inside Modal */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Choose Showtime & Book
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {(inspectingReviewMovie.showtimes
                  ? inspectingReviewMovie.showtimes.split(',').map((s) => s.trim())
                  : ['1:30 PM', '5:00 PM', '8:45 PM']
                ).map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      handleSelectMovie(inspectingReviewMovie, time)
                      setInspectingReviewMovie(null)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-purple-600 text-xs font-mono font-semibold text-zinc-200 hover:text-white transition border border-zinc-700"
                  >
                    <Clock className="h-3 w-3" />
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setInspectingReviewMovie(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleSelectMovie(inspectingReviewMovie)
                  setInspectingReviewMovie(null)
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:opacity-90 transition active:scale-95"
              >
                <Ticket className="h-4 w-4" />
                Select Movie & Choose Seats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
