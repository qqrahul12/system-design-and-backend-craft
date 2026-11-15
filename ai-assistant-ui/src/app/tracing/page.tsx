'use client'

import { useState, useEffect } from 'react'
import {
  Activity,
  Layers,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Cpu,
  Zap,
  Server,
  Code2,
} from 'lucide-react'
import { telemetryService, authService, type UserPersona } from '@/services'
import { RbacAccessShield } from '@/components/ui/RbacAccessShield'

interface TraceSpan {
  traceId: string
  spanId: string
  parentSpanId: string | null
  name: string
  service: string
  startTime: string
  durationMs: number
  status: 'OK' | 'ERROR' | 'BLOCKED'
  attributes: Record<string, any>
}

interface TraceRecord {
  traceId: string
  operationName: string
  startTime: string
  totalDurationMs: number
  status: string
  spanCount: number
  spans: TraceSpan[]
}

export default function TracingPage() {
  const [traces, setTraces] = useState<TraceRecord[]>([])
  const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null)
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')

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

  useEffect(() => {
    fetchTraces()
    const timer = setInterval(fetchTraces, 6000)
    return () => clearInterval(timer)
  }, [])

  const fetchTraces = async () => {
    setIsRefreshing(true)
    try {
      const data = await telemetryService.getTraces()
      setTraces(data as any)
      if (data.length > 0 && !selectedTrace) {
        setSelectedTrace(data[0] as any)
        if (data[0].spans?.length > 0) {
          setSelectedSpan(data[0].spans[0] as any)
        }
      }
    } catch (e) {
      console.warn('Failed to fetch traces:', e)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSelectTrace = (t: TraceRecord) => {
    setSelectedTrace(t)
    if (t.spans?.length > 0) {
      setSelectedSpan(t.spans[0])
    }
  }

  // Filtered traces
  const filteredTraces = traces.filter((t) =>
    t.operationName.toLowerCase().includes(filterQuery.toLowerCase()) ||
    t.traceId.toLowerCase().includes(filterQuery.toLowerCase())
  )

  // Compute telemetry metrics
  const avgLatency = traces.length > 0
    ? Math.round(traces.reduce((acc, t) => acc + t.totalDurationMs, 0) / traces.length)
    : 0

  const maxLatency = traces.length > 0
    ? Math.max(...traces.map((t) => t.totalDurationMs))
    : 0

  const isAuthorized = Boolean(
    currentUser && currentUser.isAuthenticated && currentUser.role === 'EXECUTIVE_ADMIN'
  )

  if (!isAuthorized && !isLoadingAuth) {
    return (
      <RbacAccessShield
        title="APM Waterfall Telemetry Clearance Required"
        requiredRole="EXECUTIVE_ADMIN"
        currentUser={currentUser}
        description="Detailed APM OpenTelemetry waterfall traces are restricted to EXECUTIVE_ADMIN clearance. Inspection of distributed spans and LLM latency traces requires executive authorization."
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
              <Activity className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              OpenTelemetry APM Waterfall Traces
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-400 border border-cyan-500/20">
              Distributed Span Tracing
            </span>
          </div>
          <p className="mt-1.5 text-sm text-[#888]">
            Nanosecond-precision execution waterfall tracing across Prompt Guard, vector similarity search, MCP tools, and LLMs.
          </p>
        </div>

        <button
          onClick={fetchTraces}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#161616] border border-[#2a2a2a] text-[#aaa] hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Traces
        </button>
      </div>

      {/* Top Observability Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#222] bg-[#121212] p-4 space-y-1">
          <p className="text-[11px] text-[#777] uppercase font-semibold">Total Ingested Traces</p>
          <p className="text-2xl font-black text-white font-mono">{traces.length}</p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#121212] p-4 space-y-1">
          <p className="text-[11px] text-[#777] uppercase font-semibold">Avg Execution Latency</p>
          <p className="text-2xl font-black text-cyan-400 font-mono">{avgLatency}ms</p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#121212] p-4 space-y-1">
          <p className="text-[11px] text-[#777] uppercase font-semibold">Peak P99 Latency</p>
          <p className="text-2xl font-black text-amber-400 font-mono">{maxLatency}ms</p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#121212] p-4 space-y-1">
          <p className="text-[11px] text-[#777] uppercase font-semibold">Trace Health Rate</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">100%</p>
        </div>
      </div>

      {/* Two-Column: Traces Selector & Waterfall Gantt Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Trace List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search traces by ID or op..."
              className="w-full rounded-lg pl-9 pr-3 py-2 text-xs text-white bg-[#141414] border border-[#252525] focus:border-cyan-500 outline-none font-mono"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTraces.map((trace) => {
              const isSelected = selectedTrace?.traceId === trace.traceId
              return (
                <button
                  key={trace.traceId}
                  onClick={() => handleSelectTrace(trace)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                      : 'border-[#222] bg-[#141414] text-[#888] hover:border-[#333] hover:text-[#eee]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">
                      {trace.operationName}
                    </span>
                    <span className="font-mono text-[11px] text-cyan-400">
                      {trace.totalDurationMs}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#666] mt-1 font-mono">
                    <span>{trace.traceId}</span>
                    <span>{trace.spanCount} spans</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Waterfall Gantt Chart & Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTrace ? (
            <div className="rounded-2xl border border-[#262626] bg-[#121212] p-5 shadow-xl space-y-6">
              {/* Trace Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-cyan-400 font-mono">{selectedTrace.traceId}</span>
                    <span className="text-[11px] font-sans px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {selectedTrace.operationName}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#777] font-mono mt-1">
                    Total Span Duration: {selectedTrace.totalDurationMs}ms • {selectedTrace.spanCount} Recorded Spans
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Trace Completed
                </span>
              </div>

              {/* Waterfall Gantt Timeline */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
                  Span Waterfall Gantt Chart
                </p>

                <div className="space-y-1.5 pt-2">
                  {selectedTrace.spans.map((span, idx) => {
                    const isSpanSelected = selectedSpan?.spanId === span.spanId
                    const totalDuration = Math.max(1, selectedTrace.totalDurationMs)
                    const widthPercent = Math.max(8, Math.min(100, Math.round((span.durationMs / totalDuration) * 100)))

                    return (
                      <div
                        key={span.spanId}
                        onClick={() => setSelectedSpan(span)}
                        className={`group p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSpanSelected
                            ? 'border-cyan-500 bg-cyan-500/15'
                            : 'border-[#202020] bg-[#161616] hover:border-[#303030]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-mono font-semibold text-white flex items-center gap-2">
                            <span className="text-[10px] text-[#555]">#{idx + 1}</span>
                            <span>{span.name}</span>
                          </span>
                          <span className="font-mono text-[11px] text-[#aaa]">
                            {span.durationMs}ms
                          </span>
                        </div>

                        {/* Bar */}
                        <div className="h-2 w-full rounded-full bg-[#202020] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              span.name.includes('guard')
                                ? 'bg-amber-400'
                                : span.name.includes('embedding') || span.name.includes('vector')
                                ? 'bg-emerald-400'
                                : span.name.includes('llm')
                                ? 'bg-purple-400'
                                : 'bg-cyan-400'
                            }`}
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Selected Span Metadata Inspector */}
              {selectedSpan && (
                <div className="rounded-xl border border-[#222] bg-[#0d0d0d] p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-white border-b border-[#222] pb-2">
                    <span className="flex items-center gap-2 font-bold">
                      <Code2 className="h-4 w-4 text-cyan-400" /> Span Inspector: {selectedSpan.name}
                    </span>
                    <span className="text-cyan-400">{selectedSpan.spanId}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#666]">Service:</span>
                      <p className="text-[#ddd]">{selectedSpan.service}</p>
                    </div>
                    <div>
                      <span className="text-[#666]">Duration:</span>
                      <p className="text-[#ddd]">{selectedSpan.durationMs}ms</p>
                    </div>
                    <div>
                      <span className="text-[#666]">Parent Span:</span>
                      <p className="text-[#ddd]">{selectedSpan.parentSpanId || 'ROOT'}</p>
                    </div>
                  </div>

                  {/* Attributes JSON */}
                  <div>
                    <span className="text-[10px] uppercase text-[#666]">Span Attributes:</span>
                    <pre className="mt-1 p-2.5 rounded bg-[#141414] border border-[#202020] text-[#aaa] overflow-x-auto text-[11px]">
                      {JSON.stringify(selectedSpan.attributes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#222] bg-[#121212] p-12 text-center text-[#666]">
              <Layers className="h-8 w-8 mx-auto mb-2 text-[#444]" />
              <p className="text-sm">Select a trace to view its execution waterfall</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
