'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Send, Bot, User, Sparkles, RotateCcw, Ticket, ArrowRight, Film } from 'lucide-react'

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
      <div className={`flex max-w-[70%] flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
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
                    ? '#1a1030'
                    : '#1a1a1a',
                  border: message.streaming
                    ? '1px solid #7c3aed44'
                    : '1px solid #2a2a2a',
                  color: '#e5e5e5',
                  borderBottomLeftRadius: '4px',
                  boxShadow: message.streaming
                    ? '0 0 20px #7c3aed18'
                    : undefined,
                }
          }
        >
          <span className="whitespace-pre-wrap">{message.content}</span>
          {message.streaming && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 align-middle animate-blink"
              style={{ backgroundColor: '#a78bfa' }}
            />
          )}
        </div>

        {/* Model label for AI messages */}
        {!isUser && (
          <div className="flex items-center justify-between gap-3 w-full px-1">
            <div className="flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-[#7c3aed]" />
              <span className="text-[10px] font-medium text-[#777]">
                {message.model || 'gemini-2.0-flash'}
              </span>
            </div>

            {!message.streaming && message.content.length > 25 && (
              <Link
                href="/booking"
                className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition"
              >
                <Ticket className="h-3 w-3" />
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
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const abortRef  = useRef<AbortController | null>(null)

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
          const raw = line.slice(5).trim()
          if (raw === '[DONE]') {
            // Mark streaming finished
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId ? { ...m, streaming: false } : m,
              ),
            )
            return
          }
          if (!raw) continue

          let token = raw
          // Try to parse as JSON {"text": "..."} or plain text
          try {
            const parsed = JSON.parse(raw) as { text?: string; content?: string }
            token = parsed.text ?? parsed.content ?? raw
          } catch {
            // raw is plain text — use as-is
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
      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, streaming: false } : m)),
      )
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
  }, [input, isLoading, provider])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const resetChat = () => {
    abortRef.current?.abort()
    setMessages([WELCOME_MESSAGE])
    setInput('')
    setError(null)
    setIsLoading(false)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      {/* Chat header */}
      <div
        className="flex items-center justify-between rounded-t-2xl px-5 py-4"
        style={{ backgroundColor: '#111111', border: '1px solid #1f1f1f', borderBottom: 'none' }}
      >
        <div className="flex items-center gap-3">
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
            onClick={resetChat}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#666] transition-all hover:bg-[#1a1a1a] hover:text-[#aaa]"
            title="Reset conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
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
          Streaming via SSE · Press Enter to send · ESC to cancel
        </p>
      </div>
    </div>
  )
}
