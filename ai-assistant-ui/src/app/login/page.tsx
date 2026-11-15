'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  UserCheck,
  Crown,
  Key,
} from 'lucide-react'
import { authService } from '@/services'

const DEMO_PERSONAS = [
  {
    name: 'Alex Vance',
    email: 'alex.vance@cinemind.vip',
    role: 'VIP_PATRON',
    badge: '👑 VIP Patron',
    tier: 'CineMind Founder Gold (20% Off)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
  },
  {
    name: 'Marcus Kane',
    email: 'marcus.kane@cinemind-hq.com',
    role: 'EXECUTIVE_ADMIN',
    badge: '🛡️ Circuit Director',
    tier: 'Executive Box Office Operations',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop',
  },
  {
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@cinemind-theaters.com',
    role: 'AUDITORIUM_USHER',
    badge: '🎟️ Floor Usher',
    tier: 'Gate Scanning & Kitchen Delivery',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
  },
  {
    name: 'Jordan Lee',
    email: 'jordan.lee@example.com',
    role: 'STANDARD_GUEST',
    badge: '👤 General Guest',
    tier: 'Standard Moviegoer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const handleLogin = async (e?: React.FormEvent, customEmail?: string) => {
    if (e) e.preventDefault()
    setLoading(true)
    const targetEmail = customEmail || email

    try {
      const user = await authService.login(targetEmail)
      setStatusMsg(`Welcome back, ${user.name || 'Patron'}! Redirecting...`)
      setTimeout(() => {
        if (user.role === 'EXECUTIVE_ADMIN') {
          router.push('/admin')
        } else if (user.role === 'AUDITORIUM_USHER') {
          router.push('/tickets')
        } else {
          router.push('/booking')
        }
      }, 600)
    } catch {
      setStatusMsg('Connection error reaching Auth microservice.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectQuickAccount = (p: typeof DEMO_PERSONAS[0]) => {
    setEmail(p.email)
    handleLogin(undefined, p.email)
  }

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
              <p className="text-xs text-[#666] font-mono">Unified Identity & Access Gateway</p>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Welcome to CineMind AI
            </h1>
            <p className="text-xs text-[#888] leading-relaxed">
              Sign in to manage your high-concurrency movie bookings, access the CineCash Digital Wallet, track squad expenses, or test enterprise roles with live RBAC.
            </p>
          </div>

          {/* Quick Demo Switcher Cards */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#666] font-semibold">
              Instant 1-Click Persona Login
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => handleSelectQuickAccount(p)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#252525] hover:border-purple-500/40 text-left transition group"
                >
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#333]"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate group-hover:text-purple-300">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-[#888] truncate">{p.badge}</p>
                  </div>
                </button>
              ))}
            </div>
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
              onClick={() => setActiveTab('signin')}
              className={`pb-3 text-xs font-bold transition border-b-2 mr-6 ${
                activeTab === 'signin'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-[#666] hover:text-[#aaa]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`pb-3 text-xs font-bold transition border-b-2 ${
                activeTab === 'register'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-[#666] hover:text-[#aaa]'
              }`}
            >
              Create Account
            </button>
          </div>

          {statusMsg && (
            <div className="rounded-xl bg-purple-950/60 border border-purple-500/40 p-3 text-xs text-purple-200 flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
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
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-xl bg-[#1c1c1c] border border-[#333] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-purple-500 transition"
                    placeholder="Alex Vance"
                  />
                </div>
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl bg-[#1c1c1c] border border-[#333] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-purple-500 transition"
                  placeholder="name@cinemind.vip"
                />
              </div>
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl bg-[#1c1c1c] border border-[#333] pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-purple-500 transition"
                  placeholder="••••••••••••"
                />
              </div>
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
