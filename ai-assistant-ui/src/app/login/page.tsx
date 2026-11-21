'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  UserCheck,
  Loader2,
} from 'lucide-react'
import { authService, UserPersona, validateLoginInput, validateRegisterInput } from '@/services/authService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FieldErrors {
  fullName?: string
  email?: string
  password?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error'>('success')

  // Personas loaded from API — no hardcoded arrays
  const [personas, setPersonas] = useState<UserPersona[]>([])
  const [personasLoading, setPersonasLoading] = useState(true)

  useEffect(() => {
    authService
      .getPersonas()
      .then(setPersonas)
      .catch(() => setPersonas([]))
      .finally(() => setPersonasLoading(false))
  }, [])

  // -------------------------------------------------------------------------
  // Field-level blur validators
  // -------------------------------------------------------------------------
  const validateFieldOnBlur = (field: keyof FieldErrors) => {
    if (field === 'email') {
      const errs = validateLoginInput(email, 'placeholder')
      setFieldErrors((prev) => ({ ...prev, email: errs.find((e) => e.field === 'email')?.message }))
    }
    if (field === 'password') {
      const errs = validateLoginInput('a@b.co', password)
      setFieldErrors((prev) => ({ ...prev, password: errs.find((e) => e.field === 'password')?.message }))
    }
    if (field === 'fullName') {
      if (activeTab === 'register') {
        const errs = validateRegisterInput(fullName, 'a@b.co', 'placeholder')
        setFieldErrors((prev) => ({ ...prev, fullName: errs.find((e) => e.field === 'fullName')?.message }))
      }
    }
  }

  // -------------------------------------------------------------------------
  // Login handler (manual form + 1-click persona)
  // -------------------------------------------------------------------------
  const handleLogin = async (e?: React.FormEvent, quickPersonaEmail?: string, quickPersonaRole?: string) => {
    if (e) e.preventDefault()

    const targetEmail = quickPersonaEmail ?? email
    const targetRole  = quickPersonaRole  ?? ''

    // Skip password validation for 1-click persona buttons (they are pre-trusted demo accounts)
    const isQuickLogin = Boolean(quickPersonaEmail)

    const errors = isQuickLogin
      ? [] // 1-click persona bypasses password — it authenticates by known email+role
      : activeTab === 'register'
        ? validateRegisterInput(fullName, targetEmail, password)
        : validateLoginInput(targetEmail, password)

    if (errors.length > 0) {
      const mapped: FieldErrors = {}
      errors.forEach((err) => { mapped[err.field as keyof FieldErrors] = err.message })
      setFieldErrors(mapped)
      setStatusType('error')
      setStatusMsg('Please fix the highlighted fields before continuing.')
      return
    }

    setFieldErrors({})
    setLoading(true)
    setStatusMsg(null)

    try {
      const user = await authService.login(
        targetEmail,
        isQuickLogin ? targetRole : undefined,
        fullName || undefined,
        isQuickLogin ? undefined : password
      )
      setStatusType('success')
      setStatusMsg(`Welcome, ${user.fullName || user.name || 'Patron'}! Redirecting...`)
      setTimeout(() => {
        if (user.role === 'EXECUTIVE_ADMIN') {
          router.push('/admin')
        } else if (user.role === 'AUDITORIUM_USHER') {
          router.push('/tickets')
        } else if (user.role === 'CINEMA_MANAGER') {
          router.push('/manager')
        } else {
          router.push('/booking')
        }
      }, 600)
    } catch (err: any) {
      setStatusType('error')
      setStatusMsg(err?.response?.data?.message || err?.message || 'Invalid email or password. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const inputClass = (field: keyof FieldErrors) =>
    `w-full rounded-xl bg-[#1c1c1c] border pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none transition ${
      fieldErrors[field]
        ? 'border-red-500/70 focus:border-red-500'
        : 'border-[#333] focus:border-purple-500'
    }`

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Branding & Fast Switcher */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 shadow-lg shadow-purple-600/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">CineMind</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white bg-purple-600">
                  SECURITY
                </span>
              </div>
              <p className="text-xs text-[#666] font-mono">Unified Identity &amp; Access Gateway</p>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Welcome to CineMind AI
            </h1>
            <p className="text-xs text-[#888] leading-relaxed">
              Sign in to manage your high-concurrency movie bookings, access the CineCash Digital Wallet, track squad expenses, or access enterprise operations with role-based access control.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#666] pt-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Zero-Trust Architecture · Spring Security 6.1 · HMAC-SHA256</span>
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="rounded-2xl bg-[#141414] border border-[#242424] p-8 shadow-2xl relative">
          {/* Tab Switcher */}
          <div className="flex border-b border-[#242424] mb-6">
            <button
              onClick={() => { setActiveTab('signin'); setFieldErrors({}); setStatusMsg(null) }}
              className={`pb-3 text-xs font-bold transition border-b-2 mr-6 ${
                activeTab === 'signin'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-[#666] hover:text-[#aaa]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setFieldErrors({}); setStatusMsg(null) }}
              className={`pb-3 text-xs font-bold transition border-b-2 ${
                activeTab === 'register'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-[#666] hover:text-[#aaa]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Status banner — distinct styles for success vs error */}
          {statusMsg && (
            <div
              className={`rounded-xl border p-3 text-xs flex items-center gap-2 mb-4 ${
                statusType === 'success'
                  ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                  : 'bg-red-950/60 border-red-500/40 text-red-200'
              }`}
            >
              {statusType === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span>{statusMsg}</span>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4" noValidate>
            {activeTab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setFieldErrors((prev) => ({ ...prev, fullName: undefined })) }}
                    onBlur={() => validateFieldOnBlur('fullName')}
                    autoComplete="name"
                    className={inputClass('fullName')}
                    placeholder="Enter your full name"
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.fullName}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })) }}
                  onBlur={() => validateFieldOnBlur('email')}
                  autoComplete="email"
                  inputMode="email"
                  className={inputClass('email')}
                  placeholder="name@cinemind.vip"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#aaa] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })) }}
                  onBlur={() => validateFieldOnBlur('password')}
                  autoComplete={activeTab === 'register' ? 'new-password' : 'current-password'}
                  className={inputClass('password')}
                  placeholder="••••••••••••"
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-[#888] pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded bg-[#222] border-[#444] text-purple-600 focus:ring-0"
                />
                <span>Remember session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <span>{activeTab === 'signin' ? 'Sign In' : 'Create VIP Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 mt-4 border-t border-[#222] text-center">
            <Link
              href="/profile"
              className="text-xs text-[#888] hover:text-white transition flex items-center justify-center gap-1.5"
            >
              <span>Already signed in? Open Profile Hub</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
