'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Send,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  Ticket,
  ArrowRight,
  Film,
  MessageSquare,
  Plus,
  Trash2,
  History,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { sessionService, SessionSummary } from '@/services'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  streaming?: boolean
  timestamp: Date
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "👋 Hi! I'm CineMind AI. Ask me about movies, get recommendations, or switch between Gemini and Groq LPU!",
  model: 'gemini-2.0-flash',
  timestamp: new Date(),
}

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: '#7c3aed' }}
      >
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-4 py-3"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-2 w-2 rounded-full bg-[#555] animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Inline & Block Markdown Formatting ───────────────────────────────────────
function parseInlineMarkdown(text: string) {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(regex)

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-white tracking-wide">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={i} className="italic text-purple-200">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={i}
          className="rounded bg-black/60 border border-purple-500/30 px-1.5 py-0.5 font-mono text-xs text-amber-300"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      const href = linkMatch[2]
      const isInternal = href.startsWith('/')
      if (isInternal) {
        return (
          <Link
            key={i}
            href={href}
            className="inline-flex items-center gap-1 font-bold text-purple-400 hover:text-purple-300 underline underline-offset-2 transition"
          >
            <span>{linkMatch[1]}</span>
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        )
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-purple-400 hover:text-purple-300 underline underline-offset-2 transition"
        >
          <span>{linkMatch[1]}</span>
        </a>
      )
    }
    return part
  })
}

function FormattedChatContent({
  content,
  streaming,
}: {
  content: string
  streaming?: boolean
}) {
  if (!content) return null

  const rawLines = content.split('\n')

  return (
    <div className="space-y-1.5 leading-relaxed text-sm">
      {rawLines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />
        }

        // Heading: ### or ## or #
        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
          const headingText = line.replace(/^#+\s*/, '')
          return (
            <h4
              key={idx}
              className="text-sm font-bold text-white mt-2 mb-1 flex items-center gap-1.5"
            >
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>{parseInlineMarkdown(headingText)}</span>
            </h4>
          )
        }

        // Numbered list: 1. 2. etc.
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/)
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1 pl-0.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-300 border border-purple-500/40 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1 text-sm text-zinc-200">
                {parseInlineMarkdown(numMatch[2])}
              </div>
            </div>
          )
        }

        // Bullet point: - or * or •
        const bulletMatch = line.match(/^[-*•]\s+(.*)$/)
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 my-0.5 pl-1">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0 shadow-[0_0_8px_#c084fc]" />
              <div className="flex-1 text-sm text-zinc-200">
                {parseInlineMarkdown(bulletMatch[1])}
              </div>
            </div>
          )
        }

        // Blockquote: >
        if (line.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="my-1.5 border-l-2 border-purple-500/60 pl-3 py-1 text-xs text-purple-200/90 italic bg-purple-950/20 rounded-r-md"
            >
              {parseInlineMarkdown(line.slice(2))}
            </blockquote>
          )
        }

        // Standard paragraph line
        return (
          <p key={idx} className="text-zinc-200">
            {parseInlineMarkdown(line)}
          </p>
        )
      })}
      {streaming && (
        <span
          className="ml-0.5 inline-block h-4 w-1 align-middle rounded-full animate-pulse"
          style={{ backgroundColor: '#a78bfa' }}
        />
      )}
    </div>
  )
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex items-end gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full`}
        style={{ backgroundColor: isUser ? '#2a2a2a' : '#7c3aed' }}
      >
        {isUser ? (
          <User className="h-4 w-4 text-[#aaa]" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div className={`flex max-w-[76%] flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={
            isUser
              ? {
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  borderBottomRightRadius: '4px',
                }
              : {
                  backgroundColor: message.streaming
                    ? '#160d2b'
                    : '#181818',
                  border: message.streaming
                    ? '1px solid #7c3aed55'
                    : '1px solid #282828',
                  color: '#e5e5e5',
                  borderBottomLeftRadius: '4px',
                  boxShadow: message.streaming
                    ? '0 0 20px #7c3aed20'
                    : undefined,
                }
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <FormattedChatContent content={message.content} streaming={message.streaming} />
          )}
        </div>

        {/* Model label & CTA for AI messages */}
        {!isUser && (
          <div className="flex items-center justify-between gap-3 w-full px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span className="text-[10px] font-mono text-zinc-400">
                {message.model || 'gemini-2.0-flash'}
              </span>
            </div>

            {!message.streaming && message.content.length > 20 && (
              <Link
                href="/booking"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 rounded-lg px-2.5 py-1 transition"
              >
                <Ticket className="h-3 w-3 text-amber-400" />
                <span>Reserve Seats</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main chat page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string>(() => `session-${Date.now()}`)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [showHistory, setShowHistory] = useState<boolean>(true)
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false)

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [provider, setProvider] = useState<'gemini' | 'groq'>('groq')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const abortRef  = useRef<AbortController | null>(null)

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const data = await sessionService.listSessions()
      const chatOnly = (data || []).filter((s) => s.type === 'CHAT' || !s.type)
      setSessions(chatOnly)
    } catch (e) {
      console.warn('Failed to load chat sessions:', e)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const persistSession = useCallback(async (currentSessionId: string, currentMsgs: Message[]) => {
    if (currentMsgs.length <= 1) return
    const userFirstMsg = currentMsgs.find((m) => m.role === 'user')?.content || 'New Conversation'
    const title = userFirstMsg.length > 30 ? userFirstMsg.substring(0, 30) + '...' : userFirstMsg
    const lastMsg = currentMsgs[currentMsgs.length - 1]?.content || ''
    const preview = lastMsg.length > 50 ? lastMsg.substring(0, 50) + '...' : lastMsg

    const payload: SessionSummary = {
      sessionId: currentSessionId,
      title,
      type: 'CHAT',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      interactionCount: currentMsgs.length,
      lastPreview: preview,
      events: currentMsgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model: m.model,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : new Date().toISOString(),
      })),
    }

    try {
      await sessionService.saveSession(payload)
      const data = await sessionService.listSessions()
      const chatOnly = (data || []).filter((s) => s.type === 'CHAT' || !s.type)
      setSessions(chatOnly)
    } catch (e) {
      console.warn('Failed to persist session:', e)
    }
  }, [])

  const startNewChat = () => {
    abortRef.current?.abort()
    setSessionId(`session-${Date.now()}`)
    setMessages([WELCOME_MESSAGE])
    setInput('')
    setError(null)
    setIsLoading(false)
  }

  const selectSession = (s: SessionSummary) => {
    abortRef.current?.abort()
    setSessionId(s.sessionId)
    setError(null)
    setIsLoading(false)
    if (s.events && s.events.length > 0) {
      setMessages(
        s.events.map((e: any) => ({
          id: e.id || `msg-${Math.random()}`,
          role: e.role,
          content: e.content,
          model: e.model,
          timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
        }))
      )
    } else {
      setMessages([
        WELCOME_MESSAGE,
        {
          id: `preview-${Date.now()}`,
          role: 'assistant',
          content: s.lastPreview || 'Previous discussion',
          timestamp: new Date(s.lastActiveAt || s.createdAt),
        },
      ])
    }
  }

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await sessionService.deleteSession(id)
      setSessions((prev) => prev.filter((s) => s.sessionId !== id))
      if (sessionId === id) {
        startNewChat()
      }
    } catch (err) {
      console.warn('Failed to delete session:', err)
    }
  }

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setError(null)

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    // Placeholder AI message for streaming
    const aiId = `ai-${Date.now()}`
    const aiMsg: Message = {
      id: aiId,
      role: 'assistant',
      content: '',
      model: provider === 'groq' ? 'qwen/qwen3.8-27b (Groq LPU)' : 'gemini-2.0-flash',
      streaming: true,
      timestamp: new Date(),
    }

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const response = await fetch(
        `${API_BASE}/api/v1/chat/stream?message=${encodeURIComponent(text)}&provider=${provider}`,
        { signal: controller.signal },
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Insert empty AI bubble
      setMessages((prev) => [...prev, aiMsg])
      setIsLoading(false)

      const reader  = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''          // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const trimmed = line.trim()
          if (trimmed === 'data: [DONE]' || trimmed === 'data:[DONE]' || line.slice(5).trim() === '[DONE]') {
            // Mark streaming finished
            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.id === aiId ? { ...m, streaming: false } : m,
              )
              persistSession(sessionId, updated)
              return updated
            })
            return
          }

          // Do NOT call .trim() because leading space is the space between words!
          let token = line.slice(5)
          if (token === '' && line.startsWith('data:')) {
            token = '\n'
          }

          // Try to parse as JSON if token is a structured object
          if (token.startsWith('{') && token.endsWith('}')) {
            try {
              const parsed = JSON.parse(token) as { text?: string; content?: string }
              token = parsed.text ?? parsed.content ?? token
            } catch {
              // keep as raw token
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, content: m.content + token }
                : m,
            ),
          )
        }
      }

      // Ensure streaming flag is cleared
      setMessages((prev) => {
        const updated = prev.map((m) => (m.id === aiId ? { ...m, streaming: false } : m))
        persistSession(sessionId, updated)
        return updated
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return

      const errorText =
        err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorText)
      setIsLoading(false)

      // Show error as AI message
      setMessages((prev) => {
        const withoutPlaceholder = prev.filter((m) => m.id !== aiId)
        return [
          ...withoutPlaceholder,
          {
            id: `error-${Date.now()}`,
            role: 'assistant' as const,
            content: `⚠️ Connection error: ${errorText}\n\nMake sure the backend is running at \`${API_BASE}\`.`,
            timestamp: new Date(),
          },
        ]
      })
    } finally {
      abortRef.current = null
      inputRef.current?.focus()
    }
  }, [input, isLoading, provider, sessionId, persistSession])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl gap-4">
      {/* Session History Sidebar */}
      {showHistory && (
        <aside
          className="flex w-64 flex-col rounded-2xl border border-[#1f1f1f] bg-[#111111] overflow-hidden shrink-0 shadow-xl"
        >
          <div className="p-3.5 border-b border-[#1f1f1f] flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-wide">
              <History className="h-4 w-4 text-purple-400" />
              <span>Chat Threads</span>
            </div>
            <button
              onClick={startNewChat}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded-lg transition shadow-sm active:scale-95"
              title="Start a new chat"
            >
              <Plus className="h-3 w-3" />
              <span>New</span>
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingSessions ? (
              <div className="py-8 text-center text-xs text-zinc-500">Loading history...</div>
            ) : sessions.length === 0 ? (
              <div className="py-8 px-4 text-center text-xs text-zinc-500 space-y-1">
                <MessageSquare className="h-6 w-6 text-zinc-700 mx-auto" />
                <p>No prior threads yet.</p>
                <p className="text-[10px] text-zinc-600">Send a prompt to start one!</p>
              </div>
            ) : (
              sessions.map((s) => {
                const isActive = s.sessionId === sessionId
                return (
                  <div
                    key={s.sessionId}
                    onClick={() => selectSession(s)}
                    className={`group relative flex items-center justify-between rounded-xl p-2.5 text-left cursor-pointer transition ${
                      isActive
                        ? 'bg-purple-950/40 border border-purple-500/30 text-white'
                        : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-medium truncate text-white">{s.title || 'Conversation'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500 font-mono">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{new Date(s.lastActiveAt || s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span>{s.interactionCount || 0} msgs</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, s.sessionId)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition"
                      title="Delete thread"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="p-2.5 border-t border-[#1f1f1f] text-[10px] text-zinc-500 text-center font-mono">
            PostgreSQL Distributed SSOT
          </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div
          className="flex items-center justify-between rounded-t-2xl px-5 py-4"
          style={{ backgroundColor: '#111111', border: '1px solid #1f1f1f', borderBottom: 'none' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="p-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:text-white transition"
              title={showHistory ? 'Collapse History' : 'Open History'}
            >
              {showHistory ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: '#7c3aed', boxShadow: '0 0 20px #7c3aed44' }}
            >
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">CineMind AI</p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-[11px] text-[#666]">
                  Online · {provider === 'gemini' ? 'Gemini 2.0 Flash' : 'Groq Qwen 27B LPU'}
                </p>
              </div>
            </div>
          </div>

          {/* Model Switcher & Reset */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-[#1a1a1a] p-1 border border-[#2a2a2a]">
              <button
                onClick={() => setProvider('gemini')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  provider === 'gemini'
                    ? 'bg-[#7c3aed] text-white shadow'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                Gemini 2.0
              </button>
              <button
                onClick={() => setProvider('groq')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  provider === 'groq'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                ⚡ Groq LPU
              </button>
            </div>

            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#666] transition-all hover:bg-[#1a1a1a] hover:text-[#aaa]"
              title="Reset / New Chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Message list */}
        <div
          className="flex-1 space-y-5 overflow-y-auto px-5 py-5"
          style={{ backgroundColor: '#0d0d0d', border: '1px solid #1f1f1f', borderTop: 'none', borderBottom: 'none' }}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && <TypingIndicator />}

          {error && !isLoading && (
            <div
              className="rounded-lg border px-4 py-3 text-sm text-red-400"
              style={{ backgroundColor: '#1a0808', borderColor: '#3a1010' }}
            >
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="rounded-b-2xl px-4 py-4 space-y-2.5"
          style={{ backgroundColor: '#111111', border: '1px solid #1f1f1f', borderTop: 'none' }}
        >
          {/* Quick Suggestion Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              "🎟️ What's showing in IMAX tonight?",
              "🍿 Recommend snacks for Dune 2",
              "⭐ What are critics saying about Oppenheimer?",
              "🏷️ Valid voucher promo codes",
            ].map((promptText) => (
              <button
                key={promptText}
                disabled={isLoading}
                onClick={() => {
                  setInput(promptText)
                  if (inputRef.current) inputRef.current.focus()
                }}
                className="text-[11px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 hover:text-white rounded-lg px-2.5 py-1 shrink-0 transition active:scale-95"
              >
                {promptText}
              </button>
            ))}
          </div>

          <div
            className="flex items-center gap-3 rounded-xl px-4 py-2"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-[#7c3aed]" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about movies, get recommendations..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-white placeholder-[#444] outline-none disabled:cursor-not-allowed"
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              style={{ backgroundColor: input.trim() && !isLoading ? '#7c3aed' : '#2a2a2a' }}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#333]">
            Streaming via SSE · PostgreSQL Session Store Active · Press Enter to send
          </p>
        </div>
      </div>
    </div>
  )
}
