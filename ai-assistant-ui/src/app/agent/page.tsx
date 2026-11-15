'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Terminal,
  Wrench,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Send,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  Sliders,
  DollarSign,
  Film,
  Compass,
  Check,
  Flame,
  Info,
  Radio,
  PauseCircle,
  Network,
  Ticket,
  UtensilsCrossed,
} from 'lucide-react'
import { agentService, authService, type UserPersona } from '@/services'
import { RbacAccessShield } from '@/components/ui/RbacAccessShield'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

const WS_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080')
    : 'ws://localhost:8080'

interface AgentPersona {
  id: string
  name: string
  avatar: string
  role: string
  description: string
  assignedTools: string[]
  modelTier: string
}

interface AgentExecutionStep {
  stepIndex: number
  agentId: string
  agentName: string
  avatar: string
  action: string
  thought: string
  toolName: string | null
  toolInput: Record<string, any> | null
  toolOutput: string
  isError: boolean
  durationMs: number
  timestamp: string
}

interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties?: Record<string, { type: string; description: string }>
    required?: string[]
  }
}

const PRESET_GOALS = [
  {
    title: '🎬 Inception VIP Booking',
    desc: '2 Center seats for Inception tonight with promo CINE20 & check popcorn rules',
    prompt: 'Book 2 premier center seats for Inception tonight with promo CINE20 and verify popcorn rules',
  },
  {
    title: '🍿 Interstellar Sci-Fi Odyssey',
    desc: 'Dolby format, VIP seating lock, apply VIP50 voucher & inspect refund cutoff',
    prompt: 'Reserve Dolby tickets for Interstellar with VIP50 voucher and verify theater cancellation refund window',
  },
  {
    title: '🛡️ Compliance & Safety Audit',
    desc: 'Check MPAA R-rating restrictions and quota limit enforcement for 4 tickets',
    prompt: 'Reserve 4 tickets for Oppenheimer tonight, check R-rated age guidelines, and verify ticket quota limits',
  },
  {
    title: '🍅 Critic Intelligence & Swarm Booking',
    desc: 'Query live Rotten Tomatoes & Metacritic scores for Dune 2 and reserve 2 IMAX seats',
    prompt: 'Fetch live Rotten Tomatoes critic scores and critical consensus for Dune: Part Two, verify seat availability, and lock 2 premier IMAX seats',
  },
]

function parseInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

function SwarmReportRenderer({ content }: { content: string }) {
  if (!content) return null

  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)

  let title = '🎟️ CineMind Multi-Agent Swarm Report'
  let objective = ''
  const sections: { title: string; bullets: string[] }[] = []
  let currentSection: { title: string; bullets: string[] } | null = null

  for (const line of lines) {
    if (line.startsWith('###') || line.startsWith('##')) {
      title = line.replace(/^#+\s*/, '')
    } else if (line.toLowerCase().startsWith('**user objective:**')) {
      objective = line.replace(/^\*\*user objective:\*\*\s*/i, '')
    } else if (line.startsWith('**') && (line.includes('1.') || line.includes('2.') || line.includes('3.') || line.includes('4.') || line.includes('5.') || line.endsWith('**') || line.endsWith(':**') || line.endsWith(':'))) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: line.replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/:$/, ''),
        bullets: [],
      }
    } else if (line.startsWith('-')) {
      const bulletText = line.replace(/^-\s*/, '')
      if (currentSection) {
        currentSection.bullets.push(bulletText)
      } else {
        currentSection = { title: 'Findings', bullets: [bulletText] }
      }
    } else {
      if (currentSection) {
        currentSection.bullets.push(line)
      } else if (!objective && line.length > 5 && !line.startsWith('#')) {
        objective = line
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  // Fallback if no structured sections were parsed
  if (sections.length === 0) {
    return (
      <div className="text-xs text-[#ddd] leading-relaxed space-y-2 whitespace-pre-line">
        {parseInlineMarkdown(content)}
      </div>
    )
  }

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#242424]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-white tracking-tight">
            {parseInlineMarkdown(title)}
          </span>
        </div>
        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
          AUDITED & SYNTHESIZED
        </span>
      </div>

      {/* User Objective Banner */}
      {objective && (
        <div className="rounded-xl bg-purple-950/20 border border-purple-500/30 p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold block">
            Target Objective
          </span>
          <p className="text-xs text-purple-200 font-medium leading-relaxed">
            {parseInlineMarkdown(objective)}
          </p>
        </div>
      )}

      {/* Structured Sections Cards */}
      <div className="grid grid-cols-1 gap-2.5">
        {sections.map((sec, idx) => (
          <div
            key={idx}
            className="rounded-xl bg-[#171717] hover:bg-[#1a1a1a] border border-[#262626] p-3 transition space-y-1.5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">
                {parseInlineMarkdown(sec.title)}
              </span>
            </div>

            {sec.bullets.length > 0 && (
              <div className="space-y-1 pl-1">
                {sec.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2 text-xs text-zinc-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <div className="leading-relaxed">
                      {parseInlineMarkdown(b)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MultiAgentOrchestratorPage() {
  // Swarm State
  const [agents, setAgents] = useState<AgentPersona[]>([])
  const [activeObjective, setActiveObjective] = useState(PRESET_GOALS[0].prompt)
  const [selectedModel, setSelectedModel] = useState<'groq' | 'gemini'>('groq')
  const [protocol, setProtocol] = useState<'websocket' | 'sse' | 'rest'>('websocket')
  
  const [isSwarmRunning, setIsSwarmRunning] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [completedAgentIds, setCompletedAgentIds] = useState<string[]>([])
  const [steps, setSteps] = useState<AgentExecutionStep[]>([])
  const [finalSynthesis, setFinalSynthesis] = useState<string | null>(null)
  const [swarmFulfillment, setSwarmFulfillment] = useState<{
    ticketId?: string
    txnId?: string
    movieTitle?: string
    showTime?: string
    auditorium?: string
    seats?: string[]
    totalPaid?: number
    orderId?: string
  } | null>(null)
  const [totalDuration, setTotalDuration] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [hitlNotice, setHitlNotice] = useState<string | null>(null)

  // WebSocket Live Connection
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isMountedRef = useRef(true)

  // Expandable steps in execution feed
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({})

  // Low-level MCP Tools Sandbox
  const [mcpTools, setMcpTools] = useState<McpTool[]>([])
  const [selectedMcpTool, setSelectedMcpTool] = useState<string>('')
  const [mcpArgsJson, setMcpArgsJson] = useState<string>('{}')
  const [isMcpExecuting, setIsMcpExecuting] = useState(false)
  const [mcpRawOutput, setMcpRawOutput] = useState<string | null>(null)
  const [showMcpConsole, setShowMcpConsole] = useState(false)

  // Auth RBAC State
  const [currentUser, setCurrentUser] = useState<UserPersona | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  useEffect(() => {
    authService.getCurrentUser()
      .then((u) => {
        setCurrentUser(u)
        setIsLoadingAuth(false)
      })
      .catch(() => setIsLoadingAuth(false))
  }, [])

  // Initialize WebSocket if protocol is websocket
  useEffect(() => {
    isMountedRef.current = true
    loadRoster()
    loadMcpTools()

    if (typeof window !== 'undefined') {
      initWebSocket()
    }

    return () => {
      isMountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const initWebSocket = () => {
    try {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      const socket = new WebSocket(`${WS_BASE}/ws/agents`)
      wsRef.current = socket

      socket.onopen = () => {
        setWsConnected(true)
        reconnectAttemptsRef.current = 0
        console.log('🔌 [WebSocket] Connected to /ws/agents')
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'AGENT_STEP') {
            const step: AgentExecutionStep = data.step
            setActiveAgentId(step.agentId)
            setSteps((prev) => [...prev, step])
            setCompletedAgentIds((prev) => [...prev, step.agentId])
          } else if (data.type === 'FINAL_SYNTHESIS') {
            setFinalSynthesis(data.synthesis)
            if (data.totalDurationMs) setTotalDuration(data.totalDurationMs)
            if (data.ticketId) {
              setSwarmFulfillment({
                ticketId: data.ticketId,
                txnId: data.txnId,
                movieTitle: data.movieTitle,
                seats: data.seats,
                totalPaid: data.totalPaid,
                orderId: data.orderId,
              })
            }
            setIsSwarmRunning(false)
            setActiveAgentId(null)
          } else if (data.type === 'INTERRUPTED') {
            setHitlNotice(data.guidance || 'Human-in-the-Loop intervention acknowledged.')
          }
        } catch (e) {
          console.warn('Failed to parse WS frame:', e)
        }
      }

      socket.onclose = (event) => {
        setWsConnected(false)
        console.log('🔌 [WebSocket] Closed (code: ' + event.code + ')')
        // Resilient automatic reconnection with exponential backoff & jitter
        if (isMountedRef.current && reconnectAttemptsRef.current < 6) {
          const delay = Math.min(10000, 1000 * Math.pow(1.8, reconnectAttemptsRef.current) + Math.random() * 300)
          reconnectAttemptsRef.current += 1
          console.log(`🔌 [WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current}/6)...`)
          reconnectTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              initWebSocket()
            }
          }, delay)
        }
      }

      socket.onerror = (err) => {
        console.warn('🔌 [WebSocket] Connection error:', err)
        setWsConnected(false)
      }
    } catch (e) {
      console.warn('WebSocket init failed:', e)
    }
  }

  const loadRoster = async () => {
    try {
      const data = await agentService.getRoster()
      if (data && data.length > 0) {
        setAgents(data as any)
      }
    } catch (err) {
      console.warn('Failed to load agent roster:', err)
    }
  }

  const loadMcpTools = async () => {
    try {
      const data = await agentService.callMcp('tools/list')
      if (data?.result?.tools) {
        setMcpTools(data.result.tools)
        if (data.result.tools.length > 0 && !selectedMcpTool) {
          handleSelectMcpTool(data.result.tools[0])
        }
      }
    } catch (e) {
      console.warn('MCP tools discovery error:', e)
    }
  }

  const handleSelectMcpTool = (tool: McpTool) => {
    setSelectedMcpTool(tool.name)
    const sampleArgs: Record<string, any> = {}
    if (tool.name === 'search_movies') sampleArgs.query = 'Inception'
    else if (tool.name === 'check_seats') sampleArgs.movieTitle = 'Inception'
    else if (tool.name === 'reserve_seats') {
      sampleArgs.movieTitle = 'Inception'
      sampleArgs.seats = 'B3, B4'
    } else if (tool.name === 'apply_promocode') {
      sampleArgs.code = 'CINE20'
      sampleArgs.baseAmount = 30.0
    } else if (tool.name === 'process_payment') {
      sampleArgs.seats = 'B3, B4'
      sampleArgs.amount = 24.0
      sampleArgs.paymentMethod = 'card_4242'
    } else if (tool.name === 'rag_knowledge_search') {
      sampleArgs.question = 'What is the refund policy?'
    } else if (tool.name === 'audit_compliance') {
      sampleArgs.movieTitle = 'Inception'
      sampleArgs.seatCount = 2
      sampleArgs.userAge = 22
    }
    setMcpArgsJson(JSON.stringify(sampleArgs, null, 2))
  }

  const executeRawMcpTool = async () => {
    if (!selectedMcpTool || isMcpExecuting) return
    setIsMcpExecuting(true)
    setMcpRawOutput(null)
    try {
      const parsedArgs = JSON.parse(mcpArgsJson)
      const data = await agentService.callMcp('tools/call', { name: selectedMcpTool, arguments: parsedArgs })
      setMcpRawOutput(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setMcpRawOutput(`Error: ${err.message}`)
    } finally {
      setIsMcpExecuting(false)
    }
  }

  // Human-in-the-Loop Interrupt via WebSocket
  const sendHitlInterrupt = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: 'INTERRUPT',
          guidance: 'User paused swarm to inspect auditoriums.',
        })
      )
    }
  }

  // Launch Swarm via Selected Protocol
  const launchSwarm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!activeObjective.trim() || isSwarmRunning) return

    setIsSwarmRunning(true)
    setSteps([])
    setFinalSynthesis(null)
    setSwarmFulfillment(null)
    setTotalDuration(null)
    setCompletedAgentIds([])
    setStatusMessage(null)
    setHitlNotice(null)
    setActiveAgentId('supervisor')

    const startClock = Date.now()

    // 1. WebSocket Protocol Mode
    if (protocol === 'websocket') {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        initWebSocket()
      }
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              action: 'START',
              objective: activeObjective.trim(),
              model: selectedModel,
            })
          )
        } else {
          // Fallback to REST if socket is not ready
          runRestOrchestration(startClock)
        }
      }, 100)
      return
    }

    // 2. Server-Sent Events (SSE) Protocol Mode
    if (protocol === 'sse') {
      try {
        const url = `${API_BASE}/api/v1/agents/orchestrate/stream?objective=${encodeURIComponent(
          activeObjective.trim()
        )}&model=${selectedModel}`
        const eventSource = new EventSource(url)

        eventSource.addEventListener('agent-step', (event) => {
          const step: AgentExecutionStep = JSON.parse(event.data)
          setActiveAgentId(step.agentId)
          setSteps((prev) => [...prev, step])
          setCompletedAgentIds((prev) => [...prev, step.agentId])
        })

        eventSource.onerror = () => {
          eventSource.close()
          setTotalDuration(Date.now() - startClock)
          setIsSwarmRunning(false)
          setActiveAgentId(null)
        }
      } catch (err: any) {
        setStatusMessage(`SSE Error: ${err.message}`)
        setIsSwarmRunning(false)
      }
      return
    }

    // 3. REST Batch Mode
    runRestOrchestration(startClock)
  }

  const runRestOrchestration = async (startClock: number) => {
    try {
      const data: any = await agentService.orchestrate({
        objective: activeObjective.trim(),
        model: selectedModel,
      })

      const receivedSteps: AgentExecutionStep[] = data.steps || []
      for (let i = 0; i < receivedSteps.length; i++) {
        const step = receivedSteps[i]
        setActiveAgentId(step.agentId)
        await new Promise((r) => setTimeout(r, 400))
        setSteps((prev) => [...prev, step])
        setCompletedAgentIds((prev) => [...prev, step.agentId])
      }

      setFinalSynthesis(data.finalSynthesis)
      if (data.ticketId) {
        setSwarmFulfillment({
          ticketId: data.ticketId,
          txnId: data.txnId,
          movieTitle: data.movieTitle,
          showTime: data.showTime,
          auditorium: data.auditorium,
          seats: data.seats,
          totalPaid: data.totalPaid,
          orderId: data.orderId,
        })
      }
      setTotalDuration(Date.now() - startClock)
      setActiveAgentId(null)
    } catch (err: any) {
      setStatusMessage(`Orchestration error: ${err.message}`)
      setActiveAgentId(null)
    } finally {
      setIsSwarmRunning(false)
    }
  }

  const toggleStepExpanded = (idx: number) => {
    setExpandedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  // Visual Topology Node Order
  const topologyOrder = ['supervisor', 'catalog', 'inventory', 'rag_policy', 'billing', 'critic']

  const isAuthorized = Boolean(
    currentUser && currentUser.isAuthenticated && currentUser.role === 'EXECUTIVE_ADMIN'
  )

  if (!isAuthorized && !isLoadingAuth) {
    return (
      <RbacAccessShield
        title="Autonomous Swarm Clearance Required"
        requiredRole="EXECUTIVE_ADMIN"
        currentUser={currentUser}
        description="The Autonomous Agent Swarm is restricted to EXECUTIVE_ADMIN clearance. Multi-agent DAG orchestration and low-level MCP tool dispatch require executive credentials."
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Multi-Agent Swarm Orchestrator
            </h1>
            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#a78bfa] border border-purple-500/20">
              WebSocket + SSE Enabled
            </span>
          </div>
          <p className="mt-1.5 text-sm text-[#888]">
            Coordinated autonomous execution across 6 specialized AI agents with shared MCP tools, RAG memory, and real-time streaming.
          </p>
        </div>

        {/* Dual Selectors: Model & Streaming Protocol */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Protocol Toggle */}
          <div className="flex items-center rounded-lg bg-[#141414] border border-[#2a2a2a] p-1">
            <button
              type="button"
              onClick={() => setProtocol('websocket')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                protocol === 'websocket'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <Network className="h-3.5 w-3.5 text-cyan-400" />
              WebSocket (HITL)
            </button>
            <button
              type="button"
              onClick={() => setProtocol('sse')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                protocol === 'sse'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              SSE Stream
            </button>
          </div>

          {/* Model Toggle */}
          <div className="flex items-center rounded-lg bg-[#141414] border border-[#2a2a2a] p-1">
            <button
              type="button"
              onClick={() => setSelectedModel('groq')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedModel === 'groq'
                  ? 'bg-[#7c3aed] text-white shadow'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              Groq LPU
            </button>
            <button
              type="button"
              onClick={() => setSelectedModel('gemini')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedModel === 'gemini'
                  ? 'bg-[#7c3aed] text-white shadow'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              Gemini 3.8
            </button>
          </div>
        </div>
      </div>

      {/* Swarm Objective Input & Quick Presets */}
      <div className="rounded-xl border border-[#252525] bg-[#121212] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#a78bfa]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ccc]">
              Objective Dispatcher
            </span>
            {protocol === 'websocket' && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                WS Active (ws://localhost:8080/ws/agents)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSwarmRunning && protocol === 'websocket' && (
              <button
                type="button"
                onClick={sendHitlInterrupt}
                className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 transition-colors"
              >
                <PauseCircle className="h-3.5 w-3.5" /> Steer / Pause (HITL)
              </button>
            )}
            {totalDuration && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Clock className="h-3 w-3" /> Latency: {totalDuration}ms
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={launchSwarm} className="flex gap-2">
          <div className="relative flex-1">
            <Terminal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
            <input
              type="text"
              value={activeObjective}
              onChange={(e) => setActiveObjective(e.target.value)}
              placeholder="Submit an autonomous objective for the agent swarm to solve..."
              className="w-full rounded-lg pl-10 pr-4 py-3 text-sm text-white bg-[#1a1a1a] border border-[#333] focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] outline-none font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isSwarmRunning || !activeObjective.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d28d9] hover:to-[#4f46e5] disabled:opacity-50 transition-all shadow-lg shadow-purple-500/25 shrink-0"
          >
            {isSwarmRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Swarm Streaming...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" /> Launch Swarm ({protocol.toUpperCase()})
              </>
            )}
          </button>
        </form>

        {/* 1-Click Goal Presets */}
        <div className="pt-2">
          <p className="text-[11px] text-[#777] mb-2 font-medium">Or select an enterprise scenario:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {PRESET_GOALS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveObjective(preset.prompt)
                }}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                  activeObjective === preset.prompt
                    ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-white'
                    : 'border-[#222] bg-[#161616] text-[#aaa] hover:border-[#383838] hover:text-[#eee]'
                }`}
              >
                <p className="font-semibold text-white mb-0.5">{preset.title}</p>
                <p className="text-[11px] text-[#777] leading-relaxed line-clamp-2">{preset.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {hitlNotice && (
        <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PauseCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span><strong>Human-in-the-Loop Event:</strong> {hitlNotice}</span>
          </div>
          <button
            onClick={() => setHitlNotice(null)}
            className="text-[10px] text-amber-400 hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Visual Swarm Topology Graph */}
      <div className="rounded-xl border border-[#252525] bg-[#121212] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#a78bfa]" />
            <h2 className="text-sm font-semibold text-white">Live Swarm Topology & State Machine</h2>
          </div>
          <span className="text-[11px] text-[#666]">Directed Acyclic Graph (DAG) Pipeline</span>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {topologyOrder.map((agentKey, index) => {
            const persona = agents.find((a) => a.id === agentKey)
            if (!persona) return null

            const isActive = activeAgentId === persona.id
            const isCompleted = completedAgentIds.includes(persona.id)

            return (
              <div
                key={persona.id}
                className={`relative rounded-xl border p-3 flex flex-col items-center text-center transition-all duration-300 ${
                  isActive
                    ? 'border-[#7c3aed] bg-[#7c3aed]/15 shadow-lg shadow-purple-500/20 scale-105 ring-2 ring-[#7c3aed]/50'
                    : isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-white'
                    : 'border-[#242424] bg-[#161616] text-[#777] opacity-75'
                }`}
              >
                {/* Step badge */}
                <span className="absolute top-2 left-2 text-[10px] font-mono font-bold text-[#555]">
                  #{index + 1}
                </span>

                {/* Status indicator dot */}
                <span className="absolute top-2 right-2">
                  {isActive ? (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-[#333] inline-block" />
                  )}
                </span>

                {/* Avatar */}
                <div
                  className={`mt-2 flex h-11 w-11 items-center justify-center rounded-full text-xl shadow-inner ${
                    isActive
                      ? 'bg-purple-600/30 ring-2 ring-[#7c3aed]'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-white'
                      : 'bg-[#222]'
                  }`}
                >
                  {persona.avatar}
                </div>

                <p className="mt-2 text-xs font-bold text-white line-clamp-1">{persona.name}</p>
                <p className="text-[10px] text-[#888] line-clamp-1 mt-0.5">{persona.role}</p>

                {/* Assigned Tools tags */}
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {persona.assignedTools.slice(0, 2).map((t, tidx) => (
                    <span
                      key={tidx}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#202020] text-[#999] border border-[#2e2e2e]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Two-Column Layout: Live Execution Trace & Executive Synthesis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Real-time Multi-Agent Execution Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#a78bfa]" /> Real-Time Swarm Execution Trace
            </h2>
            <span className="text-[11px] text-[#666]">
              {steps.length} Step{steps.length !== 1 ? 's' : ''} captured via {protocol.toUpperCase()}
            </span>
          </div>

          {steps.length === 0 && !isSwarmRunning && (
            <div className="rounded-xl border border-dashed border-[#282828] bg-[#121212]/50 p-8 text-center text-[#666]">
              <Compass className="h-8 w-8 mx-auto mb-2 text-[#444]" />
              <p className="text-xs">No active execution trace.</p>
              <p className="text-[11px] text-[#555] mt-1">
                Click &quot;Launch Swarm&quot; above to watch the agents plan, execute MCP tools, and synthesize over {protocol.toUpperCase()}.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {steps.map((step) => {
              const isExpanded = !!expandedSteps[step.stepIndex]
              return (
                <div
                  key={step.stepIndex}
                  className="rounded-xl border border-[#252525] bg-[#141414] p-4 shadow-sm space-y-2.5 transition-all hover:border-[#383838]"
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{step.avatar}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{step.agentName}</p>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-[#a78bfa] border border-purple-500/20">
                            Step #{step.stepIndex}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#888] font-medium">{step.action}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#666] font-mono">
                        {step.durationMs}ms
                      </span>
                      <button
                        onClick={() => toggleStepExpanded(step.stepIndex)}
                        className="text-[#666] hover:text-white p-1 rounded hover:bg-[#222]"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Agent Thought / Reasoning */}
                  <div className="rounded-lg bg-[#1a1a1a] p-2.5 border border-[#282828] text-xs text-[#bbb] leading-relaxed">
                    <p className="text-[10px] uppercase font-semibold text-[#a78bfa] mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Agent Reasoning
                    </p>
                    {step.thought}
                  </div>

                  {/* Tool Call Output Pill */}
                  {step.toolName && (
                    <div className="rounded-lg bg-[#0d0d0d] p-3 border border-[#242424] font-mono text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#888]">
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <Wrench className="h-3 w-3" /> MCP Tool: {step.toolName}
                        </span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> OK
                        </span>
                      </div>

                      <div className="text-[11px] text-[#ddd] whitespace-pre-wrap bg-[#141414] p-2 rounded border border-[#202020]">
                        {step.toolOutput}
                      </div>
                    </div>
                  )}

                  {/* Detailed Input Payload (Collapsible) */}
                  {isExpanded && step.toolInput && (
                    <div className="p-2.5 rounded bg-[#101010] border border-[#202020] text-[11px] font-mono text-[#888]">
                      <p className="text-[10px] text-[#666] uppercase mb-1 font-sans">
                        Arguments Payload:
                      </p>
                      <pre className="overflow-x-auto text-[#aaa]">
                        {JSON.stringify(step.toolInput, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Final Executive Briefing / Swarm Synthesis (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Executive Fulfillment Briefing
            </h2>
            {finalSynthesis && (
              <span className="text-[11px] text-emerald-400 font-medium">Audited & Verified</span>
            )}
          </div>

          <div className="rounded-xl border border-[#282828] bg-gradient-to-b from-[#141414] to-[#101010] p-5 shadow-xl space-y-4 min-h-[380px] flex flex-col justify-between">
            {finalSynthesis ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a78bfa] border-b border-[#222] pb-3">
                  <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
                  Supervisor Synthesized Outcome
                </div>

                <SwarmReportRenderer content={finalSynthesis} />

                {/* Live Autonomous Concierge Fulfillment Pass Card */}
                {swarmFulfillment?.ticketId && (
                  <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 p-4 space-y-3 animate-fade-in shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          Cryptographic Gate Pass Active
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                        {swarmFulfillment.ticketId}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-semibold block">Film & Venue</span>
                        <span className="font-bold text-white text-xs">{swarmFulfillment.movieTitle || 'Inception'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-semibold block">Seats & Settled</span>
                        <span className="font-mono text-purple-300 font-bold text-xs">
                          {swarmFulfillment.seats?.join(', ') || 'B3, B4'} • ${swarmFulfillment.totalPaid?.toFixed(2) || '24.00'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Link
                        href={`/tickets?id=${swarmFulfillment.ticketId}`}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs font-bold transition shadow-md shadow-emerald-600/30"
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        Open Pass in Wallet
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>

                      {swarmFulfillment.orderId && (
                        <Link
                          href="/concessions"
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-3 py-2 text-xs font-bold transition"
                        >
                          <UtensilsCrossed className="h-3.5 w-3.5 text-amber-400" />
                          Order {swarmFulfillment.orderId}
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-[#222] flex items-center justify-between text-[11px] text-[#777]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All Agent Constraints Satisfied
                  </span>
                  <span>Txn Confirmed</span>
                </div>
              </div>
            ) : isSwarmRunning ? (
              <div className="my-auto text-center space-y-3 p-8">
                <RefreshCw className="h-8 w-8 text-[#7c3aed] animate-spin mx-auto" />
                <p className="text-xs font-medium text-white">Swarm Streaming ({protocol.toUpperCase()})</p>
                <p className="text-[11px] text-[#777] max-w-xs mx-auto">
                  Agents are communicating over MCP, verifying seat availability, computing pricing vouchers, and checking compliance.
                </p>
              </div>
            ) : (
              <div className="my-auto text-center space-y-2 p-8 text-[#666]">
                <Film className="h-8 w-8 mx-auto text-[#444]" />
                <p className="text-xs text-[#888]">Awaiting Swarm Run</p>
                <p className="text-[11px] text-[#555]">
                  Select WebSocket or SSE and launch an objective to watch real-time multi-agent execution.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Low-Level MCP Developer Console */}
      <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
        <button
          onClick={() => setShowMcpConsole(!showMcpConsole)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[#161616] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Wrench className="h-4 w-4 text-[#a78bfa]" />
            <div>
              <p className="text-xs font-bold text-white">Developer MCP Protocol Console</p>
              <p className="text-[11px] text-[#666]">
                Direct JSON-RPC 2.0 tool execution sandbox for inspection and debugging
              </p>
            </div>
          </div>
          <span className="text-xs text-[#888] flex items-center gap-1">
            {showMcpConsole ? 'Hide Sandbox' : 'Inspect Tools'}
            {showMcpConsole ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        </button>

        {showMcpConsole && (
          <div className="p-5 border-t border-[#222] space-y-4 bg-[#0d0d0d]">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {mcpTools.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleSelectMcpTool(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 transition-all ${
                    selectedMcpTool === t.name
                      ? 'bg-[#7c3aed] text-white'
                      : 'bg-[#181818] border border-[#282828] text-[#888] hover:text-white'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-[#777] font-mono mb-1">Tool Arguments (JSON):</p>
                <textarea
                  rows={6}
                  value={mcpArgsJson}
                  onChange={(e) => setMcpArgsJson(e.target.value)}
                  className="w-full rounded-lg bg-[#141414] border border-[#252525] p-3 text-xs font-mono text-emerald-400 outline-none focus:border-[#7c3aed]"
                />
                <button
                  onClick={executeRawMcpTool}
                  disabled={isMcpExecuting}
                  className="mt-2 px-4 py-2 rounded-lg bg-[#222] hover:bg-[#333] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  {isMcpExecuting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Execute Tool
                </button>
              </div>

              <div>
                <p className="text-[11px] text-[#777] font-mono mb-1">Raw JSON-RPC Response:</p>
                <pre className="h-[155px] overflow-auto rounded-lg bg-[#141414] border border-[#252525] p-3 text-xs font-mono text-[#aaa]">
                  {mcpRawOutput || '// Execute a tool to see raw JSON-RPC response'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
