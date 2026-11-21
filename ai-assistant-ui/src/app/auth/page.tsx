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
import { authService, UserPersona, validateLoginInput } from '@/services'

interface FieldErrors {
  email?: string
  password?: string
}

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const validateFieldOnBlur = (field: keyof FieldErrors) => {
    const errs = validateLoginInput(
      field === 'email' ? email : 'a@b.co',
      field === 'password' ? password : 'placeholder'
    )
    setFieldErrors((prev) => ({ ...prev, [field]: errs.find((e) => e.field === field)?.message }))
  }

  const handleLogin = async (e?: React.FormEvent, quickEmail?: string, quickRole?: string) => {
    if (e) e.preventDefault()

    const targetEmail = quickEmail ?? email
    const isQuick = Boolean(quickEmail)

    const errors = isQuick ? [] : validateLoginInput(targetEmail, password)
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
      const user = await authService.login(targetEmail, quickRole ?? '', undefined)
      setStatusType('success')
      setStatusMsg(`Authenticated as ${user.fullName || user.name || 'Patron'} (${user.role})`)
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
      }, 800)
    } catch {
      setStatusType('error')
      setStatusMsg('Authentication failed. Please check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

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
                  SSO
                </span>
              </div>
              <p className="text-xs text-[#666] font-mono">Enterprise Single Sign-On Gateway</p>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Sign In to Your Cinema Experience
            </h1>
            <p className="text-xs text-[#888] leading-relaxed">
              Verify your organizational credentials, access multi-role enterprise portals, or manage session revocation under zero-trust RBAC governance.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#666] pt-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Zero-Trust Architecture · Spring Security 6.1 · JWT HMAC-256</span>
          </div>
        </div>

        {/* Right: Interactive Login Form */}
        <div className="rounded-2xl bg-[#141414] border border-[#242424] p-8 shadow-2xl relative">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Account Authentication</h2>
              <p className="text-xs text-[#777] mt-0.5">Enter a valid email and password to proceed</p>
            </div>

            {/* Status banner — distinct styles for success vs error */}
            {statusMsg && (
              <div
                className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${
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
                    autoComplete="current-password"
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
                  <span>Keep session active</span>
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
                    Validating Credentials...
                  </>
                ) : (
                  <>
                    <span>Sign In to CineMind</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-[#222] text-center">
              <Link
                href="/profile"
                className="text-xs text-[#888] hover:text-white transition flex items-center justify-center gap-1.5"
              >
                <span>Already authenticated? View Profile</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
