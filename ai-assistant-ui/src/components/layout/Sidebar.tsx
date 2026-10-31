'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Film,
  FileText,
  Bot,
  BarChart3,
  MessageSquare,
  Sparkles,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const navItems: NavItem[] = [
  {
    href: '/booking',
    label: 'Smart Movie Booking',
    icon: Film,
    description: 'Seat layout & reservations',
  },
  {
    href: '/documents',
    label: 'Document Intelligence',
    icon: FileText,
    description: 'Vector embeddings & RAG',
  },
  {
    href: '/agent',
    label: 'MCP Agent Console',
    icon: Bot,
    description: 'JSON-RPC Tool discovery',
  },
  {
    href: '/analytics',
    label: 'LLMOps & Telemetry',
    icon: BarChart3,
    description: 'Cache metrics & firewall',
  },
  {
    href: '/chat',
    label: 'Multi-Model AI Chat',
    icon: MessageSquare,
    description: 'Gemini 3.8 + Groq LPU',
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col"
      style={{
        backgroundColor: '#111111',
        borderRight: '1px solid #1f1f1f',
      }}
    >
      {/* Brand Logo */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ borderBottom: '1px solid #1f1f1f' }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl shadow-lg"
          style={{ backgroundColor: '#7c3aed', boxShadow: '0 0 16px #7c3aed66' }}
        >
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white">
              CineMind
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: '#7c3aed' }}
            >
              AI
            </span>
          </div>
          <p className="text-[10px] text-[#555] font-mono mt-0.5">Enterprise Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        <div>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#555]">
            Core Modules
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-all duration-150',
                      isActive
                        ? 'text-white'
                        : 'text-[#888] hover:bg-[#181818] hover:text-white',
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor: '#7c3aed20',
                            border: '1px solid #7c3aed55',
                          }
                        : undefined
                    }
                  >
                    <div
                      className={clsx(
                        'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                        isActive
                          ? 'bg-[#7c3aed] text-white shadow'
                          : 'bg-[#1a1a1a] text-[#666] group-hover:text-white',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={clsx(
                          'truncate font-semibold',
                          isActive ? 'text-white' : '',
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-[#555] group-hover:text-[#777]">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1f1f1f] space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-[#0a0a0a] p-3 border border-[#1a1a1a]">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7c3aed22]">
            <Zap className="h-3.5 w-3.5 text-[#a78bfa]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-gray-200 truncate">Dual Engine Active</p>
            <p className="text-[10px] text-[#555] truncate">Gemini 3.8 + Groq LPU</p>
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </aside>
  )
}
