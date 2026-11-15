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
  Users,
  Wallet,
  MapPin,
  Eye,
  Volume2,
  Tv,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Unlock,
  ShieldAlert,
} from 'lucide-react'
import {
  splitService,
  authService,
  movieService,
  walletService,
  ticketService,
  llmopsService,
} from '@/services'
import { Toast, type ToastMessage } from '@/components/ui/AlertToast'

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

interface CinemaVenue {
  id: string
  name: string
  shortName: string
  neighborhood: string
  distance: string
  address: string
  features: string[]
  screens: {
    id: string
    name: string
    format: string
    tech: string
    aspectRatio: string
    soundSystem: string
    baseMultiplier: number
    capacity: number
  }[]
}

const CINEMA_VENUES: CinemaVenue[] = [
  {
    id: 'flagship-lincoln',
    name: 'CineMind Flagship — Lincoln Square',
    shortName: 'Lincoln Square',
    neighborhood: 'Upper West Side',
    distance: '1.8 mi',
    address: '1998 Broadway, New York, NY',
    features: ['IMAX 70mm Dual Laser', 'Dolby Atmos 128-ch', 'VIP Heated Recliners', 'Craft Dining Bar'],
    screens: [
      {
        id: 'screen-ls-1',
        name: 'Auditorium 1 — Grand GT Laser',
        format: 'IMAX 70mm',
        tech: 'Dual 4K Commercial Laser',
        aspectRatio: '1.43:1 Giant Dome',
        soundSystem: '12-Channel IMAX Immersion',
        baseMultiplier: 1.15,
        capacity: 30,
      },
      {
        id: 'screen-ls-2',
        name: 'Auditorium 2 — Dolby Prime Stage',
        format: 'Dolby Cinema',
        tech: 'Dual Christie 6P 4K Laser HDR',
        aspectRatio: '2.39:1 CinemaScope',
        soundSystem: '128-Channel Dolby Atmos',
        baseMultiplier: 1.05,
        capacity: 30,
      },
      {
        id: 'screen-ls-3',
        name: 'Auditorium 3 — Laser Studio A',
        format: 'Standard 4K Laser',
        tech: 'Barco Series 4 Laser',
        aspectRatio: '2.39:1 Scope',
        soundSystem: '7.1 Studio Surround',
        baseMultiplier: 1.0,
        capacity: 30,
      },
    ],
  },
  {
    id: 'west-end-pavilion',
    name: 'CineMind West End Pavilion',
    shortName: 'West End',
    neighborhood: "Hell's Kitchen",
    distance: '4.2 mi',
    address: '610 W 54th St, New York, NY',
    features: ['Dolby Cinema Reference', 'In-Seat Chef Dining', 'Artisan Cocktail Lounge'],
    screens: [
      {
        id: 'screen-we-1',
        name: 'Auditorium A — Pavilion Dolby 1',
        format: 'Dolby Cinema',
        tech: 'Dual Dolby 4K Laser HDR',
        aspectRatio: '2.39:1 CinemaScope',
        soundSystem: 'Dolby Atmos Spatial Audio',
        baseMultiplier: 1.05,
        capacity: 30,
      },
      {
        id: 'screen-we-2',
        name: 'Auditorium B — Classic Laser 2',
        format: 'Standard 4K Laser',
        tech: 'Christie 4K Laser',
        aspectRatio: '1.85:1 Flat',
        soundSystem: '5.1 Surround',
        baseMultiplier: 1.0,
        capacity: 30,
      },
    ],
  },
  {
    id: 'uptown-arts-center',
    name: 'CineMind Uptown IMAX Arts Center',
    shortName: 'Uptown Arts',
    neighborhood: 'Carnegie Hill',
    distance: '6.5 mi',
    address: '1220 Lexington Ave, New York, NY',
    features: ['Curated Art Repertory', 'Sommelier Wine Bar', 'Acoustic Wool Baffling'],
    screens: [
      {
        id: 'screen-up-1',
        name: 'Auditorium I — Arts IMAX Dome',
        format: 'IMAX 70mm',
        tech: 'Single IMAX Laser Curved Arc',
        aspectRatio: '1.90:1 Expanded',
        soundSystem: '12-Channel Immersive',
        baseMultiplier: 1.15,
        capacity: 30,
      },
      {
        id: 'screen-up-2',
        name: 'Auditorium II — Intimate Studio B',
        format: 'Standard 4K Laser',
        tech: 'Barco 4K Laser',
        aspectRatio: '1.85:1 Flat',
        soundSystem: 'Dolby Atmos 64-ch',
        baseMultiplier: 1.0,
        capacity: 30,
      },
    ],
  },
]

interface SeatSightline {
  seatId: string
  row: string
  col: number
  tier: SeatTier
  tierName: string
  horizontalAngle: number
  horizontalDescription: string
  verticalTilt: number
  verticalDescription: string
  fieldOfView: number
  fovDescription: string
  acousticScore: number
  acousticDescription: string
  overallExperienceScore: number
}

function getSeatSightline(seatId: string): SeatSightline {
  const row = seatId[0] || 'C'
  const col = parseInt(seatId.slice(1), 10) || 3
  const tier = getSeatTier(seatId)
  const tierConfig = SEAT_TIERS[tier]

  const colOffset = Math.abs(col - 3.5)

  let hDeg = 0
  let vDeg = 0
  let fovDeg = 0
  let hDesc = ''
  let vDesc = ''
  let fovDesc = ''
  let acousticScore = 90
  let acousticDesc = ''

  if (row === 'A') {
    hDeg = Math.round(colOffset * 14 * 10) / 10
    vDeg = 28
    fovDeg = 58
    hDesc = colOffset <= 0.5 ? 'Center Axis' : colOffset <= 1.5 ? 'Moderate Angle' : 'Acute Side Angle'
    vDesc = 'High Neck Incline (Front Row)'
    fovDesc = 'Full IMAX Peripheral Immersion'
    acousticScore = colOffset <= 0.5 ? 82 : 74
    acousticDesc = 'Direct Screen Baffle Sound'
  } else if (row === 'B') {
    hDeg = Math.round(colOffset * 10 * 10) / 10
    vDeg = 20
    fovDeg = 49
    hDesc = colOffset <= 0.5 ? 'Center Sightline' : colOffset <= 1.5 ? 'Comfortable Angle' : 'Wide Angle'
    vDesc = 'Slight Neck Tilt'
    fovDesc = 'Wide Panoramic Field'
    acousticScore = colOffset <= 0.5 ? 90 : 83
    acousticDesc = 'Clear Left/Right Separation'
  } else if (row === 'C') {
    hDeg = Math.round(colOffset * 7 * 10) / 10
    vDeg = 14
    fovDeg = 43
    hDesc = colOffset <= 0.5 ? '0° Dead Center Reference' : colOffset <= 1.5 ? 'Subtle 10° Offset' : '17° Peripheral'
    vDesc = 'SMPTE Master Standard (<15° Ideal)'
    fovDesc = 'THX Reference 43° Optical Sweet Spot'
    acousticScore = colOffset <= 0.5 ? 99 : 92
    acousticDesc = colOffset <= 0.5 ? 'Dolby Atmos Spatial Calibration Center' : 'Balanced Surround Matrix'
  } else if (row === 'D') {
    hDeg = Math.round(colOffset * 5.5 * 10) / 10
    vDeg = 9
    fovDeg = 36
    hDesc = colOffset <= 0.5 ? 'Center Axis Alignment' : colOffset <= 1.5 ? 'Gentle 8° Angle' : '14° Soft Angle'
    vDesc = 'Relaxed Recliner Eye-Level'
    fovDesc = 'SMPTE Standard 36° Cinematic FOV'
    acousticScore = colOffset <= 0.5 ? 98 : 91
    acousticDesc = colOffset <= 0.5 ? 'Atmos Focal Core with Sub-Bass Presence' : 'Rich Spatial Acoustic Envelope'
  } else {
    hDeg = Math.round(colOffset * 4.5 * 10) / 10
    vDeg = 5
    fovDeg = 29
    hDesc = colOffset <= 0.5 ? 'Level Center' : colOffset <= 1.5 ? '7° Offset' : '11° Offset'
    vDesc = 'Level Horizontal Viewing'
    fovDesc = 'Standard Theatrical Framing'
    acousticScore = colOffset <= 0.5 ? 86 : 78
    acousticDesc = 'Rear Surround Proximity'
  }

  const anglePenalty = hDeg * 0.8
  const overallScore = Math.max(65, Math.min(99, Math.round(acousticScore * 0.5 + (50 - anglePenalty) * 0.5 + (vDeg <= 15 ? 10 : 0))))

  return {
    seatId,
    row,
    col,
    tier,
    tierName: tierConfig.name,
    horizontalAngle: hDeg,
    horizontalDescription: hDesc,
    verticalTilt: vDeg,
    verticalDescription: vDesc,
    fieldOfView: fovDeg,
    fovDescription: fovDesc,
    acousticScore,
    acousticDescription: acousticDesc,
    overallExperienceScore: overallScore,
  }
}

function getSeatPhysicalRotation(seatId: string): number {
  const row = seatId[0] || 'C'
  const col = parseInt(seatId.slice(1), 10) || 3
  const offset = col - 3.5

  const rowMultiplier = row === 'A' ? 3.6 : row === 'B' ? 2.8 : row === 'C' ? 2.2 : row === 'D' ? 1.6 : 1.2
  return Math.round(-offset * rowMultiplier * 10) / 10
}

interface SmartExperienceRecommendation {
  venueId: string
  venueName: string
  shortName: string
  distance: string
  format: string
  auditorium: string
  sweetSpotSeats: string[]
  headline: string
  reasoning: string
  tags: string[]
  matchScore: number
}

function getSmartExperienceRecommendation(movie: Movie): SmartExperienceRecommendation {
  const isLargeFormatEpic =
    ['Sci-Fi', 'Action', 'Epic'].includes(movie.genre) ||
    /dune|avatar|mickey|oppenheimer|interstellar|blade runner|mad max|matrix/i.test(movie.title)

  if (isLargeFormatEpic) {
    return {
      venueId: 'flagship-lincoln',
      venueName: 'CineMind Flagship — Lincoln Square',
      shortName: 'Lincoln Square',
      distance: '1.8 mi',
      format: 'IMAX 70mm',
      auditorium: 'Auditorium 1 — Grand GT Laser',
      sweetSpotSeats: ['C3', 'C4'],
      headline: 'IMAX 70mm GT Laser • Optical & Acoustic Reference',
      reasoning: `${movie.title} features epic visual sequences captured for giant 1.43:1 aspect ratio. Lincoln Square's Dual GT Laser delivers 40% expanded vertical imagery with 128-channel Dolby Atmos tuned directly to Center Rows C & D.`,
      tags: ['1.43:1 Expanded Aspect', 'Dual 4K Commercial Laser', 'Row C Optical Sweet Spot'],
      matchScore: 99,
    }
  }

  return {
    venueId: 'west-end-pavilion',
    venueName: 'CineMind West End Pavilion',
    shortName: 'West End',
    distance: '4.2 mi',
    format: 'Dolby Cinema',
    auditorium: 'Auditorium A — Pavilion Dolby 1',
    sweetSpotSeats: ['C3', 'C4'],
    headline: 'Dolby Cinema Dual Laser • Intimate Acoustic Stage',
    reasoning: `Intimate drama in ${movie.title} benefits from Dolby Vision's 1,000,000:1 contrast ratio, deep true blacks, and pin-drop acoustic clarity at Center Heated Recliners C3 & C4.`,
    tags: ['Dolby Vision HDR', 'Sub-bass Transducer Recliners', 'In-Seat Chef Dining'],
    matchScore: 97,
  }
}

export default function BookingPage() {
  const [movies, setMovies] = useState<Movie[]>([])

  useEffect(() => {
    movieService.getMovies()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setMovies(data as any)
        }
      })
      .catch(() => {})

    authService.getCurrentUser()
      .then((u) => {
        if (u) {
          setCurrentUser(u as any)
          if (u.role === 'CINEMA_MANAGER' || u.role === 'EXECUTIVE_ADMIN') {
            setManagerHouseReserveMode(true)
          }
        }
      })
      .catch(() => {})

    authService.getPersonas()
      .then((p) => {
        if (p && Array.isArray(p)) setPersonas(p as any)
      })
      .catch(() => {})
  }, [])

  const [personas, setPersonas] = useState<any[]>([])

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
  const [toast, setToast] = useState<ToastMessage | null>(null)

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
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>('flagship-lincoln')
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null)
  const [showAllVenues, setShowAllVenues] = useState<boolean>(false)

  const selectedCinema = useMemo(() => {
    return CINEMA_VENUES.find((c) => c.id === selectedCinemaId) || CINEMA_VENUES[0]
  }, [selectedCinemaId])

  const smartRecommendation = useMemo(() => {
    if (!selectedMovie) return null
    return getSmartExperienceRecommendation(selectedMovie)
  }, [selectedMovie])

  const activeSightlineSeatId = hoveredSeat || (selectedSeats.length > 0 ? selectedSeats[0] : 'C3')
  const activeSightline = useMemo(() => getSeatSightline(activeSightlineSeatId), [activeSightlineSeatId])

  const handleApplyRecommendation = () => {
    if (!smartRecommendation) return
    setSelectedCinemaId(smartRecommendation.venueId)
    setSelectedFormat(smartRecommendation.format)
    setSelectedSeats([...smartRecommendation.sweetSpotSeats])
    setToast({
      id: Date.now().toString(),
      type: 'success',
      title: 'AI Curator Applied',
      message: `Switched to ${smartRecommendation.venueName} • ${smartRecommendation.format} • Sweet Spot (${smartRecommendation.sweetSpotSeats.join(', ')})`,
    })
    playSound('success')
  }

  const [showAnglesOnSeats, setShowAnglesOnSeats] = useState<boolean>(true)
  const [seatMapViewMode, setSeatMapViewMode] = useState<'CURVED' | 'GRID'>('CURVED')
  const [liveStreamConnected, setLiveStreamConnected] = useState<boolean>(false)
  const [liveBroadcastToast, setLiveBroadcastToast] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'CARD'>('WALLET')
  const [walletBalance, setWalletBalance] = useState<number>(175.0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false)
  const [isGuestCheckout, setIsGuestCheckout] = useState<boolean>(false)
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false)

  // Cinema Manager House Reserve State
  const [managerHouseReserveMode, setManagerHouseReserveMode] = useState<boolean>(false)
  const [houseHoldReason, setHouseHoldReason] = useState<'VIP_PRESS' | 'COMPANION' | 'CALIBRATION' | 'MAINTENANCE'>('VIP_PRESS')

  const handleManagerLockSeats = async () => {
    if (!selectedMovie || selectedSeats.length === 0) return
    setIsProcessing(true)
    try {
      const lockRes = await ticketService.lockSeats({
        movieTitle: selectedMovie.title,
        showTime: selectedShowtime,
        seats: selectedSeats,
      })
      if (lockRes && lockRes.lockToken) {
        setActiveLockToken(lockRes.lockToken)
        setLockedSeats((prev) => Array.from(new Set([...prev, ...selectedSeats])))
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'House Reserve Engaged',
          message: `Held seats ${selectedSeats.join(', ')} under ${houseHoldReason} for ${selectedMovie.title} (${selectedShowtime}).`,
        })
        playSound('lock')
        setSelectedSeats([])
      }
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'House Hold Failed',
        message: err.message || 'Could not acquire distributed hold.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManagerReleaseSeats = async () => {
    if (!selectedMovie || selectedSeats.length === 0) return
    setIsProcessing(true)
    try {
      if (activeLockToken) {
        await ticketService.unlockSeats({ lockToken: activeLockToken })
      }
      setLockedSeats((prev) => prev.filter((s) => !selectedSeats.includes(s)))
      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'House Reserve Released',
        message: `Released hold on seats ${selectedSeats.join(', ')}. Returned to public inventory.`,
      })
      playSound('success')
      setSelectedSeats([])
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: 'error',
        title: 'Release Failed',
        message: err.message || 'Could not release seat hold.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // SplitMoney Integration State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false)
  const [splitExpenseData, setSplitExpenseData] = useState<any>(null)
  const [isSettlingShare, setIsSettlingShare] = useState(false)

  const handleOpenSplitModal = async (confirmation: any) => {
    try {
      const squadUsers = await splitService.getUsers().catch(() => [])
      const matchedUser = squadUsers.find(
        (u) =>
          u.email?.toLowerCase() === currentUser?.email?.toLowerCase() ||
          u.name?.toLowerCase() === currentUser?.name?.toLowerCase()
      )
      const payerId = matchedUser?.id || squadUsers[0]?.id || ''
      const memberIds = squadUsers.length > 0 ? squadUsers.map((u) => u.id) : (payerId ? [payerId] : [])

      const data = await splitService.createSplit({
        name: `${confirmation.movie} Passes (${confirmation.seats.join(', ')})`,
        totalAmount: confirmation.totalPrice,
        paidByUserId: payerId,
        memberUserIds: memberIds,
        referenceType: 'MOVIE_TICKET',
        referenceId: confirmation.ticketId,
      })
      setSplitExpenseData(data)
      setIsSplitModalOpen(true)
    } catch (err) {
      console.warn('Failed to split bill via SplitMoney:', err)
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
      setLiveBroadcastToast(`🎉 Friend's share settled via ${method === 'WALLET' ? 'CineCash Wallet' : 'Stripe Card Gateway'}!`)
      setTimeout(() => setLiveBroadcastToast(null), 4000)
    } catch (err) {
      console.warn('Failed to settle share:', err)
    } finally {
      setIsSettlingShare(false)
    }
  }

  useEffect(() => {
    walletService.getWalletSummary()
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
      const lockData = await ticketService.lockSeats({
        movieTitle: selectedMovie.title,
        showTime: selectedShowtime,
        seats: selectedSeats,
      })
      if (lockData) {
        setActiveLockToken(lockData.lockToken)
        const expTime = new Date(lockData.expiresAt).getTime()
        setLockExpiresAt(expTime)
        setSecondsRemaining(Math.max(0, Math.floor((expTime - Date.now()) / 1000)))
        playSound('lock')
      }
    } catch {} finally {
      setIsLocking(false)
    }
  }

  // Unified Omnibar AI Agent Natural Language Movie Search with fast client timeout & fallback
  const handleAiAgentSearch = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault()
    const query = (promptOverride !== undefined ? promptOverride : searchQuery).trim()
    if (!query || isAiSearching) return

    setIsAiSearching(true)
    setAiRecommendation(null)
    setSearchQuery(query)

    const queryLower = query.toLowerCase()

    // Dynamic semantic keyword matching from actual catalog
    const findBestMatchLocally = () => {
      if (movies.length === 0) return null

      // Keyword match across title, genre, synopsis
      const textMatch = movies.find(m => {
        const fullText = `${m.title} ${m.genre ?? ''} ${m.synopsis ?? ''}`.toLowerCase()
        return queryLower.split(' ').some(word => word.length > 2 && fullText.includes(word))
      })

      const target = textMatch || movies[0]
      return {
        movie: target,
        reason: `Matched "${query}" with ${target.title} based on catalog metadata and genre preference.`
      }
    }

    try {
      // Fast fetch with 4s timeout controller
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)

      const catalogOverview = movies.map(
        (m) => `${m.title} (Genre: ${m.genre}, Rating: ${m.rating}, Story: ${m.synopsis})`
      ).join(' | ')

      const prompt = `User preference: "${query}". Current movies: ${catalogOverview}.
Return strictly:
MATCH: <Exact Movie Title>
REASON: <1 sentence why it matches>`

      const data = await llmopsService.sendChatMessage({ message: prompt, provider: 'groq' })
      clearTimeout(timeoutId)

      if (data) {
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
    if (fallback) {
      setAiRecommendation({
        suggestedMovieTitle: fallback.movie.title,
        reasoning: fallback.reason,
      })
      handleSelectMovie(fallback.movie)
    }
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

  // Refetch seat inventory whenever selected movie, showtime, date, format, or cinema changes
  useEffect(() => {
    if (!selectedMovie) return

    let isMounted = true
    const fetchInventory = async () => {
      try {
        const activeAud = `${selectedCinema.shortName} • ${selectedFormat}`
        const data = await ticketService.getAuditoriumSeats(
          selectedMovie.title,
          selectedShowtime,
          selectedFormat,
          activeAud,
          selectedDate
        )
        if (data && isMounted) {
          setOccupiedSeats(data.occupiedSeats || [])
          setLockedSeats(data.lockedSeats || [])
        }
      } catch {
        if (isMounted) {
          setOccupiedSeats(['B2', 'D5', 'A3', 'D6'])
        }
      }
    }

    // Reset user's active seat pick when changing screening slot (date, screen, or showtime)
    // so patron doesn't carry old seat selection across different screens/dates
    setSelectedSeats([])
    if (activeLockToken) {
      ticketService.unlockSeats({ lockToken: activeLockToken }).catch(() => {})
      setActiveLockToken(null)
      setLockExpiresAt(null)
      setSecondsRemaining(0)
    }

    fetchInventory()
    return () => {
      isMounted = false
    }
  }, [selectedMovie, selectedShowtime, selectedDate, selectedFormat, selectedCinemaId])

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
        setToast({
          type: 'warning',
          title: 'Seat Hold Expired',
          message: 'Your 10-minute temporary seat lock expired and seats were released. Please re-select your seats.',
        })
        if (selectedMovie) {
          ticketService.getAuditoriumSeats(
            selectedMovie.title,
            selectedShowtime
          )
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

    const rec = getSmartExperienceRecommendation(movie)
    setSelectedCinemaId(rec.venueId)

    const times = movie.showtimes ? movie.showtimes.split(',').map((s) => s.trim()) : ['7:30 PM']
    const time = customShowtime || times[0] || '7:30 PM'
    setSelectedShowtime(time)

    const defaultFmt =
      customFormat ||
      rec.format ||
      (movie.auditorium?.includes('IMAX')
        ? 'IMAX 70mm'
        : movie.auditorium?.includes('Dolby')
        ? 'Dolby Cinema'
        : 'Standard 4K Laser')
    setSelectedFormat(defaultFmt)

    // Release any previous lock
    if (activeLockToken) {
      ticketService.unlockSeats({ lockToken: activeLockToken }).catch(() => {})
      setActiveLockToken(null)
      setLockExpiresAt(null)
      setSecondsRemaining(0)
    }

    // Try pre-locking suggested seats if available
    try {
      const seatData = await ticketService.getAuditoriumSeats(movie.title, time)
      if (seatData) {
        const occupied = seatData.occupiedSeats || []
        setOccupiedSeats(occupied)
        setLockedSeats(seatData.lockedSeats || [])

        const availableSuggested = movie.suggestedSeats.filter((s) => !occupied.includes(s))
        const seatsToLock = availableSuggested.length > 0 ? availableSuggested : []
        setSelectedSeats(seatsToLock)

        if (seatsToLock.length > 0) {
          const lk = await ticketService.lockSeats({
            movieTitle: movie.title,
            showTime: time,
            seats: seatsToLock,
          })
          if (lk) {
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
    if (lockedSeats.includes(seatId) && !selectedSeats.includes(seatId) && !managerHouseReserveMode) return

    const newSeats = selectedSeats.includes(seatId)
      ? selectedSeats.filter((s) => s !== seatId)
      : [...selectedSeats, seatId]

    setSelectedSeats(newSeats)
    setLockWarning(null)
    playSound('click')

    if (!selectedMovie || managerHouseReserveMode) return

    if (newSeats.length > 0) {
      setIsLocking(true)
      try {
        const lockData = await ticketService.lockSeats({
          movieTitle: selectedMovie.title,
          showTime: selectedShowtime,
          seats: newSeats,
        })
        if (lockData) {
          setActiveLockToken(lockData.lockToken)
          const expTime = new Date(lockData.expiresAt).getTime()
          setLockExpiresAt(expTime)
          setSecondsRemaining(Math.max(0, Math.floor((expTime - Date.now()) / 1000)))
          playSound('lock')
        }
      } catch (err) {
        console.warn('Seat lock request failed:', err)
        setSelectedSeats(selectedSeats)
        setActiveLockToken(null)
        setLockExpiresAt(null)
        setSecondsRemaining(0)
      } finally {
        setIsLocking(false)
      }
    } else {
      if (activeLockToken) {
        ticketService.unlockSeats({ lockToken: activeLockToken }).catch(() => {})
        setActiveLockToken(null)
        setLockExpiresAt(null)
        setSecondsRemaining(0)
      }
    }
  }

  const handleLoginAndBook = async (roleName: string) => {
    setIsAuthLoading(true)
    try {
      const u = await authService.switchRole(roleName)
      if (u) {
        setCurrentUser(u as any)
        setIsAuthModalOpen(false)
        setTimeout(() => {
          handleCompleteBooking(true)
        }, 150)
      }
    } catch {
      handleCompleteBooking(true)
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleContinueAsGuest = () => {
    setIsGuestCheckout(true)
    setIsAuthModalOpen(false)
    setTimeout(() => {
      handleCompleteBooking(true)
    }, 150)
  }

  const handleCompleteBooking = async (bypassAuthCheck = false) => {
    if (!selectedMovie || selectedSeats.length === 0 || isProcessing) return

    // View pages are public; require authentication or guest choice only upon booking
    if (!bypassAuthCheck && (!currentUser || currentUser.role === 'STANDARD_GUEST') && !isGuestCheckout) {
      setIsAuthModalOpen(true)
      return
    }

    setIsProcessing(true)

    const totalAmount = priceBreakdown.total
    const showTime = selectedShowtime
    const auditorium = `${selectedFormat} (${selectedCinema.shortName} • ${selectedMovie.auditorium || 'Auditorium 1'})`

    try {
      if (paymentMethod === 'WALLET') {
        const wTxn = await walletService.pay(
          totalAmount,
          `${selectedMovie.title} (${selectedSeats.join(', ')})`
        )
        if (wTxn) {
          setWalletBalance(wTxn.balanceAfter)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cinemind-auth-changed'))
          }
        }
      }

      const ticket = await ticketService.issueTicket({
        movieTitle: selectedMovie.title,
        showTime,
        format: selectedFormat,
        auditorium,
        seats: selectedSeats,
        totalPaid: totalAmount,
      })

      if (ticket) {
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
          ticketService.unlockSeats({ lockToken: activeLockToken }).catch(() => {})
          setActiveLockToken(null)
          setLockExpiresAt(null)
          setSecondsRemaining(0)
        }
        setOccupiedSeats((prev) => [...prev, ...selectedSeats])
        setToast({
          type: 'success',
          title: 'VIP Pass Issued',
          message: `Confirmed ${selectedMovie.title} (${selectedSeats.join(', ')}). Your cryptographic pass is ready!`,
        })
        setSelectedSeats([])
      } else {
        throw new Error('Ticket issue failed')
      }
    } catch (err: unknown) {
      console.error('Ticket checkout failed:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unable to complete ticket reservation'
      setToast({
        type: 'error',
        title: 'Booking Failed',
        message: `${errorMsg}. Please verify your CineCash wallet balance or seat availability.`,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Toast Notification */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

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

      {/* Unified Smart Search & AI Concierge Omnibar */}
      <div
        className="rounded-2xl border p-5 space-y-4 shadow-xl"
        style={{
          background: 'linear-gradient(145deg, #16112a 0%, #111113 100%)',
          borderColor: '#7c3aed44',
          boxShadow: '0 0 28px #7c3aed15',
        }}
      >
        {/* Top Header of Omnibar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Smart Catalog Search & AI Concierge
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-500/30">
                  Unified Omnibar
                </span>
              </h2>
            </div>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            Instant Real-Time Filtering & Autonomous Agent Match
          </span>
        </div>

        {/* Single Unified Omnibar Form */}
        <form onSubmit={(e) => handleAiAgentSearch(e)} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
            <input
              type="text"
              placeholder="Search by title, actor, genre, or ask AI (e.g. 'deep emotional sci-fi', 'mind-bending thriller')..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (aiRecommendation) setAiRecommendation(null)
              }}
              className="w-full rounded-xl pl-10 pr-9 py-3 text-sm text-white bg-[#0d0d0f] border border-zinc-800 focus:border-purple-500 outline-none transition placeholder:text-zinc-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setAiRecommendation(null)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                title="Clear Search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isAiSearching || !searchQuery.trim()}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-40 transition active:scale-95 shrink-0 shadow-lg shadow-purple-600/30"
            >
              {isAiSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Agent Matching...</span>
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 text-purple-200" />
                  <span>Ask AI Concierge</span>
                </>
              )}
            </button>

            {/* AI Picks Only Toggle */}
            <button
              type="button"
              onClick={() => setFilterAiPicksOnly(!filterAiPicksOnly)}
              className={`flex items-center gap-1.5 px-3.5 py-3 rounded-xl text-xs font-semibold border transition shrink-0 ${
                filterAiPicksOnly
                  ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${filterAiPicksOnly ? 'text-purple-400' : 'text-zinc-500'}`} />
              AI Picks
            </button>
          </div>
        </form>

        {/* Quick Inspiration Prompts (1-Click) */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400 pt-0.5">
          <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-purple-400" /> Ideas:
          </span>
          {[
            'Space & Wormhole',
            'Epic Desert Sci-Fi',
            'Dark Neo-Noir Detective',
            'Mind-Bending Dream Heist',
            'Cyberpunk Neo-Tokyo',
          ].map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => handleAiAgentSearch(undefined, promptText)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-purple-950/60 border border-zinc-800 hover:border-purple-500/40 text-zinc-300 hover:text-purple-200 transition active:scale-95"
            >
              "{promptText}"
            </button>
          ))}
        </div>

        {/* AI Agent Recommendation Callout Banner */}
        {aiRecommendation && (
          <div className="rounded-xl p-3.5 text-xs bg-purple-950/40 border border-purple-500/40 text-purple-200 flex items-start justify-between gap-3 animate-slide-up">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-white">
                  AI Concierge Match:{' '}
                  <span className="text-purple-300 underline font-black">
                    {aiRecommendation.suggestedMovieTitle || 'Custom Recommendation'}
                  </span>{' '}
                  <span className="text-[11px] text-emerald-400 font-normal">
                    — Selected & Scrolled to Seat Selection below!
                  </span>
                </p>
                <p className="text-zinc-300 leading-relaxed text-[11px]">{aiRecommendation.reasoning}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAiRecommendation(null)}
              className="text-zinc-400 hover:text-white p-1"
              title="Dismiss recommendation"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Genre Filter Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-zinc-800/80">
          <span className="text-xs text-zinc-500 flex items-center gap-1 mr-1 shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Genres:
          </span>
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 ${
                selectedGenre === genre
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
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
                        {(movie.showtimes ? movie.showtimes.split(',').map((s) => s.trim()) : []).map((time) => {
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

              {/* Configurable Seat Map & Angle Controls */}
              <div className="flex items-center gap-2 sm:ml-auto pt-1 sm:pt-0 sm:pl-3 sm:border-l sm:border-zinc-800">
                <button
                  onClick={() => setShowAnglesOnSeats(!showAnglesOnSeats)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                    showAnglesOnSeats
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                  title="Toggle displaying off-axis viewing angles on each seat badge"
                >
                  <Eye className="h-3 w-3" />
                  <span>{showAnglesOnSeats ? 'Angles On' : 'Angles Off'}</span>
                </button>

                <button
                  onClick={() => setSeatMapViewMode(seatMapViewMode === 'CURVED' ? 'GRID' : 'CURVED')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                    seatMapViewMode === 'CURVED'
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/40 shadow-sm'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                  title="Toggle between physical curved theater arc and flat grid view"
                >
                  <Compass className="h-3 w-3" />
                  <span>{seatMapViewMode === 'CURVED' ? 'Curved Arc' : 'Flat Grid'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedMovie ? (
          <div className="space-y-6">
            {/* AI Experience Curator & Cinema Venue Recommendation Card */}
            {smartRecommendation && (
              <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-950 p-4 sm:p-5 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        <Sparkles className="h-3 w-3" />
                        AI Screen & Venue Curator
                      </span>
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                        {smartRecommendation.matchScore}% Audiovisual Match
                      </span>
                      <span className="rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 text-[10px] flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-zinc-400" />
                        {smartRecommendation.venueName} ({smartRecommendation.distance})
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <span>{smartRecommendation.headline}</span>
                      </h4>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed max-w-3xl">
                        {smartRecommendation.reasoning}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {smartRecommendation.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 text-[10px] font-medium text-purple-300"
                        >
                          ✦ {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                    <button
                      onClick={handleApplyRecommendation}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 hover:from-purple-500 to-indigo-600 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Select Sweet Spot ({smartRecommendation.sweetSpotSeats.join(', ')})</span>
                    </button>

                    <button
                      onClick={() => setShowAllVenues(!showAllVenues)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-2 text-xs font-medium border border-zinc-700/80 transition-all"
                    >
                      <Compass className="h-3.5 w-3.5 text-purple-400" />
                      <span>{showAllVenues ? 'Hide Venues & Screens' : 'Compare Venues & Screens (3 Locations)'}</span>
                      {showAllVenues ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {/* Venues & Screens Browser Drawer */}
                {showAllVenues && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-amber-400" />
                        Explore CineMind Circuit Venues & Auditoriums
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Instant 1-Click Screen Transfer
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {CINEMA_VENUES.map((venue) => {
                        const isVenueActive = selectedCinemaId === venue.id
                        return (
                          <div
                            key={venue.id}
                            className={`rounded-xl p-3 transition-all border ${
                              isVenueActive
                                ? 'bg-purple-950/20 border-purple-500/60 shadow-md ring-1 ring-purple-500/40'
                                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span>{venue.name}</span>
                                  {venue.id === smartRecommendation.venueId && (
                                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/40">
                                      AI Pick
                                    </span>
                                  )}
                                </h5>
                                <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-2.5 w-2.5 text-zinc-500" />
                                  {venue.neighborhood} • {venue.distance}
                                </p>
                              </div>
                              {isVenueActive && (
                                <span className="h-4 w-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-bold">
                                  ✓
                                </span>
                              )}
                            </div>

                            {/* Screen options for this venue */}
                            <div className="mt-2.5 space-y-1.5">
                              {venue.screens.map((screen) => {
                                const isScreenActive = isVenueActive && selectedFormat === screen.format
                                return (
                                  <button
                                    key={screen.id}
                                    onClick={() => {
                                      setSelectedCinemaId(venue.id)
                                      setSelectedFormat(screen.format)
                                      playSound('click')
                                    }}
                                    className={`w-full text-left p-1.5 rounded-lg text-[11px] transition-all flex items-center justify-between border ${
                                      isScreenActive
                                        ? 'bg-purple-600/30 border-purple-500 text-purple-200 font-semibold'
                                        : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-semibold">{screen.name}</div>
                                      <div className="text-[9px] text-zinc-500 font-mono">{screen.tech}</div>
                                    </div>
                                    <span className="font-mono text-[10px] text-zinc-400">
                                      {screen.format}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theatrical Date, Venue, Format & Showtime Bar */}
            <div className="space-y-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              {/* Screening Date & Venue Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
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

                {/* Selected Venue Badge & Switcher */}
                <div className="space-y-1.5 shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    Selected Cinema Venue
                  </div>
                  <button
                    onClick={() => setShowAllVenues(!showAllVenues)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition"
                  >
                    <span>{selectedCinema.shortName} ({selectedCinema.distance})</span>
                    <ChevronDown className="h-3 w-3 text-zinc-400" />
                  </button>
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
                    {(selectedMovie.showtimes ? selectedMovie.showtimes.split(',').map((s) => s.trim()) : []).map((time) => (
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

            {/* Manager House Reserve & Seating Control Panel (CINEMA_MANAGER / EXECUTIVE_ADMIN) */}
            {(currentUser?.role === 'CINEMA_MANAGER' || currentUser?.role === 'EXECUTIVE_ADMIN') && (
              <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-zinc-900 to-zinc-950 p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Cinema Manager House Reserve & Inventory Control</span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">
                          Staff Override
                        </span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Hold or release blocks of seats for VIP press, acoustic calibration, ADA companions, or maintenance.
                      </p>
                    </div>
                  </div>

                  {/* Mode Toggle Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setManagerHouseReserveMode(!managerHouseReserveMode)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        managerHouseReserveMode
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>{managerHouseReserveMode ? 'House Reserve Mode ON' : 'Patron Booking Mode'}</span>
                    </button>
                  </div>
                </div>

                {managerHouseReserveMode && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Total Capacity</span>
                        <span className="text-base font-bold text-white font-mono mt-0.5 block">30 Seats</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Available</span>
                        <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                          {Math.max(0, 30 - occupiedSeats.length - lockedSeats.length)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">House Holds</span>
                        <span className="text-base font-bold text-amber-400 font-mono mt-0.5 block">
                          {lockedSeats.length}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Sold / Admitted</span>
                        <span className="text-base font-bold text-purple-400 font-mono mt-0.5 block">
                          {occupiedSeats.length}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Occupancy</span>
                        <span className="text-base font-bold text-teal-400 font-mono mt-0.5 block">
                          {Math.round((occupiedSeats.length / 30) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-300">Reserve Reason:</span>
                        <select
                          value={houseHoldReason}
                          onChange={(e: any) => setHouseHoldReason(e.target.value)}
                          className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="VIP_PRESS">Studio / Press VIP Hold</option>
                          <option value="COMPANION">Wheelchair ADA Companion Hold</option>
                          <option value="CALIBRATION">Acoustic / Projection Calibration</option>
                          <option value="MAINTENANCE">Maintenance: Recliner Out of Service</option>
                        </select>
                        <span className="text-[11px] text-indigo-300 font-mono">
                          Selected ({selectedSeats.length}): {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleManagerLockSeats}
                          disabled={isProcessing || selectedSeats.length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition shadow-sm"
                        >
                          <Lock className="h-3 w-3" />
                          <span>Lock House Hold</span>
                        </button>
                        <button
                          onClick={handleManagerReleaseSeats}
                          disabled={isProcessing || selectedSeats.length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white disabled:opacity-40 transition border border-zinc-700"
                        >
                          <Unlock className="h-3 w-3" />
                          <span>Release Hold</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Realistic Curved Theatrical Screen Arc */}
            <div className="relative w-full text-center space-y-2 py-2">
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

                {/* Dynamic Screen Sightline Ray to Active Seat */}
                {activeSightline && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <svg className="h-full w-full opacity-70 transition-all duration-300">
                      <line
                        x1="50%"
                        y1="2"
                        x2={`${
                          activeSightline.col === 1
                            ? 12
                            : activeSightline.col === 2
                            ? 26
                            : activeSightline.col === 3
                            ? 42
                            : activeSightline.col === 4
                            ? 58
                            : activeSightline.col === 5
                            ? 74
                            : 88
                        }%`}
                        y2="100%"
                        stroke="rgba(6, 182, 212, 0.75)"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        className="animate-pulse"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-zinc-500">
                ⚡ 70MM DUAL LASER CURVED CINEMA SCREEN • {selectedCinema.shortName.toUpperCase()}
              </p>
            </div>

            {/* Spatial Sightline & Viewing Angle HUD Bar */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    Seat {activeSightline.seatId}
                  </span>
                  <span className="text-xs font-semibold text-zinc-300">
                    {activeSightline.tierName}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {hoveredSeat ? '(Live Sightline & Angle HUD)' : selectedSeats.includes(activeSightline.seatId) ? '(Selected Seat Sightline)' : '(Master Sweet Spot Reference • Hover any seat)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold">
                  <span className="text-zinc-400">Experience Rating:</span>
                  <span className="text-emerald-400 text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {activeSightline.overallExperienceScore}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* Horizontal Off-Axis */}
                <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800/80">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                    <Eye className="h-3 w-3 text-cyan-400" />
                    Viewing Angle
                  </div>
                  <div className="font-mono text-sm font-bold text-white mt-1">
                    {activeSightline.horizontalAngle}° <span className="text-[10px] font-normal text-zinc-400">off-center</span>
                  </div>
                  <div className="text-[10px] text-cyan-300/80 truncate mt-0.5">{activeSightline.horizontalDescription}</div>
                </div>

                {/* Vertical Neck Tilt */}
                <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800/80">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                    <Sliders className="h-3 w-3 text-amber-400" />
                    Vertical Neck Tilt
                  </div>
                  <div className="font-mono text-sm font-bold text-white mt-1">
                    {activeSightline.verticalTilt}° <span className="text-[10px] font-normal text-zinc-400">elevation</span>
                  </div>
                  <div className="text-[10px] text-amber-300/80 truncate mt-0.5">{activeSightline.verticalDescription}</div>
                </div>

                {/* SMPTE FOV */}
                <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800/80">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                    <Tv className="h-3 w-3 text-purple-400" />
                    Field of View (FOV)
                  </div>
                  <div className="font-mono text-sm font-bold text-white mt-1">
                    {activeSightline.fieldOfView}° <span className="text-[10px] font-normal text-zinc-400">SMPTE</span>
                  </div>
                  <div className="text-[10px] text-purple-300/80 truncate mt-0.5">{activeSightline.fovDescription}</div>
                </div>

                {/* Dolby Atmos Sweet Spot */}
                <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800/80">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                    <Volume2 className="h-3 w-3 text-emerald-400" />
                    Dolby Atmos Sweet Spot
                  </div>
                  <div className="font-mono text-sm font-bold text-white mt-1">
                    {activeSightline.acousticScore}% <span className="text-[10px] font-normal text-zinc-400">spatial</span>
                  </div>
                  <div className="text-[10px] text-emerald-300/80 truncate mt-0.5">{activeSightline.acousticDescription}</div>
                </div>
              </div>
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
                          disabled={isOccupied || (isLocked && !managerHouseReserveMode)}
                          onClick={() => toggleSeat(seatId)}
                          onMouseEnter={() => setHoveredSeat(seatId)}
                          onMouseLeave={() => setHoveredSeat(null)}
                          style={
                            seatMapViewMode === 'CURVED'
                              ? { transform: `rotate(${getSeatPhysicalRotation(seatId)}deg)` }
                              : undefined
                          }
                          className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-lg flex flex-col items-center justify-center text-xs font-mono font-bold transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 scale-105 z-10'
                              : isOccupied
                              ? 'bg-zinc-900/60 text-zinc-700 border border-zinc-800/80 cursor-not-allowed opacity-60'
                              : isLocked
                              ? managerHouseReserveMode
                                ? 'bg-amber-950/40 text-amber-300 border border-amber-500/60 ring-1 ring-amber-500/40 cursor-pointer'
                                : 'bg-purple-950/40 text-purple-400 border border-purple-500/40 cursor-not-allowed'
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
                          ) : showAnglesOnSeats ? (
                            <span className="text-[9px] font-mono text-cyan-300 leading-none">
                              {getSeatSightline(seatId).horizontalAngle}°
                            </span>
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
                          disabled={isOccupied || (isLocked && !managerHouseReserveMode)}
                          onClick={() => toggleSeat(seatId)}
                          onMouseEnter={() => setHoveredSeat(seatId)}
                          onMouseLeave={() => setHoveredSeat(null)}
                          style={
                            seatMapViewMode === 'CURVED'
                              ? { transform: `rotate(${getSeatPhysicalRotation(seatId)}deg)` }
                              : undefined
                          }
                          className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-lg flex flex-col items-center justify-center text-xs font-mono font-bold transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 scale-105 z-10'
                              : isOccupied
                              ? 'bg-zinc-900/60 text-zinc-700 border border-zinc-800/80 cursor-not-allowed opacity-60'
                              : isLocked
                              ? managerHouseReserveMode
                                ? 'bg-amber-950/40 text-amber-300 border border-amber-500/60 ring-1 ring-amber-500/40 cursor-pointer'
                                : 'bg-purple-950/40 text-purple-400 border border-purple-500/40 cursor-not-allowed'
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
                          ) : showAnglesOnSeats ? (
                            <span className="text-[9px] font-mono text-cyan-300 leading-none">
                              {getSeatSightline(seatId).horizontalAngle}°
                            </span>
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
                onClick={() => handleCompleteBooking(false)}
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

              <button
                type="button"
                onClick={() => handleOpenSplitModal(bookingConfirmation)}
                className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-5 py-3 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition active:scale-95"
              >
                <Users className="h-4 w-4 text-indigo-400" />
                Split Bill with Squad (SplitMoney)
              </button>
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
            {inspectingReviewMovie.criticConsensus && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Critical Consensus
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  "{inspectingReviewMovie.criticConsensus}"
                </p>
              </div>
            )}

            {/* Featured Publication Critic Quote */}
            {inspectingReviewMovie.topCriticQuote && (
              <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/20 via-zinc-900/60 to-transparent p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Featured Critic Spotlight
                </span>
                <blockquote className="text-xs text-purple-200 italic leading-relaxed">
                  {inspectingReviewMovie.topCriticQuote}
                </blockquote>
              </div>
            )}

            {/* Select Showtime Pill Row inside Modal */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Choose Showtime & Book
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {(inspectingReviewMovie.showtimes
                  ? inspectingReviewMovie.showtimes.split(',').map((s) => s.trim())
                  : []
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
                    Split with CineMind Squad
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
                  Total Bill
                </span>
                <p className="text-2xl font-black text-white">
                  ${splitExpenseData.totalAmount?.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Paid By (Full)
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
                Balances reflect instantaneously across CineMind & SplitMoney.
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

      {/* Sign In Required Upon Booking Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#141414] border border-[#282828] p-6 sm:p-7 shadow-2xl space-y-6">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-bold text-purple-300">
                <Crown className="h-3 w-3 text-amber-400" />
                <span>CineMind Patron Access</span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Sign In to Confirm Reservation
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Movie discovery, showtimes, and seat maps are open to all guests. Sign in to link your tickets to your passbook, access CineCash payments, and earn 5% cashback.
              </p>
            </div>

            {/* Selected Booking Summary Strip */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white truncate max-w-[220px]">{selectedMovie?.title}</p>
                <p className="text-[11px] font-mono text-zinc-400">{selectedSeats.join(', ')} • {selectedShowtime}</p>
              </div>
              <span className="text-sm font-mono font-black text-emerald-400">
                ${priceBreakdown.total.toFixed(2)}
              </span>
            </div>

            {/* Quick 1-Click Persona Sign-In */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Instant 1-Click Sign In
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(personas && personas.length > 0 ? personas : []).slice(0, 2).map((p: any) => (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleLoginAndBook(p.role)}
                    disabled={isAuthLoading}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] border border-zinc-800 hover:border-purple-500/40 text-left transition group"
                  >
                    {p.avatarUrl || p.avatar ? (
                      <img
                        src={p.avatarUrl || p.avatar}
                        alt={p.fullName || p.name || p.role}
                        className="w-8 h-8 rounded-full object-cover border border-purple-500/50"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-500/50 flex items-center justify-center text-xs">
                        👤
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-purple-300">
                        {p.fullName || p.name || p.roleDisplayName || p.role}
                      </p>
                      <p className="text-[10px] text-amber-400">{p.roleDisplayName || p.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Sign In page OR Continue as Guest */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <Link
                href="/login?redirect=/booking"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white shadow-lg shadow-purple-600/30 transition"
              >
                <span>Sign In with Password / Create Account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <button
                type="button"
                onClick={handleContinueAsGuest}
                disabled={isAuthLoading}
                className="w-full py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
              >
                Continue as Guest (No Password Required)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
