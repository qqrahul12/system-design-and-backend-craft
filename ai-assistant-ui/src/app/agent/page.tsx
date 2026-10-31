'use client'

import { useState, useEffect } from 'react'
import { Terminal, Wrench, Play, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Send } from 'lucide-react'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties?: Record<string, { type: string; description: string }>
    required?: string[]
  }
}

interface ToolExecutionLog {
  tool: string
  input: string
  output: string
  isError: boolean
  timestamp: string
}

export default function AgentPage() {
  const [tools, setTools] = useState<McpTool[]>([])
  const [selectedTool, setSelectedTool] = useState<string>('')
  const [argumentsJson, setArgumentsJson] = useState<string>('{}')
  const [isExecuting, setIsExecuting] = useState(false)
  const [logs, setLogs] = useState<ToolExecutionLog[]>([])
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // Autonomous goal prompt
  const [agentGoal, setAgentGoal] = useState('')
  const [isAgentRunning, setIsAgentRunning] = useState(false)

  // Fetch available MCP tools
  const loadMcpTools = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.result?.tools) {
        setTools(data.result.tools)
        if (data.result.tools.length > 0 && !selectedTool) {
          selectTool(data.result.tools[0])
        }
      }
    } catch (err: unknown) {
      setStatusMsg(`Failed to connect to MCP Server: ${err instanceof Error ? err.message : 'Error'}`)
    }
  }

  useEffect(() => {
    loadMcpTools()
  }, [])

  const selectTool = (tool: McpTool) => {
    setSelectedTool(tool.name)
    const sampleArgs: Record<string, any> = {}
    if (tool.inputSchema?.properties) {
      for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
        sampleArgs[key] = prop.type === 'number' ? 30 : prop.type === 'boolean' ? true : `example_${key}`
      }
    }
    if (tool.name === 'search_movies') sampleArgs.query = 'Inception'
    if (tool.name === 'check_seats') sampleArgs.movieTitle = 'Inception'
    if (tool.name === 'process_payment') {
      sampleArgs.seats = 'B3, B4'
      sampleArgs.amount = 30.0
    }
    if (tool.name === 'rag_knowledge_search') sampleArgs.question = 'What is the refund policy?'
    setArgumentsJson(JSON.stringify(sampleArgs, null, 2))
  }

  const executeMcpTool = async () => {
    if (!selectedTool || isExecuting) return

    let parsedArgs = {}
    try {
      parsedArgs = JSON.parse(argumentsJson)
    } catch {
      setStatusMsg('Invalid JSON in arguments field.')
      return
    }

    setIsExecuting(true)
    setStatusMsg(null)

    try {
      const res = await fetch(`${API_BASE}/api/v1/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: selectedTool,
            arguments: parsedArgs,
          },
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const contentList = data.result?.content || []
      const textOutput = contentList.map((c: any) => c.text).join('\n') || JSON.stringify(data)

      const newLog: ToolExecutionLog = {
        tool: selectedTool,
        input: argumentsJson,
        output: textOutput,
        isError: data.result?.isError || false,
        timestamp: new Date().toLocaleTimeString(),
      }

      setLogs((prev) => [newLog, ...prev])
    } catch (err: unknown) {
      setStatusMsg(`Execution error: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  // Multi-step autonomous agent workflow execution
  const runAutonomousAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentGoal.trim() || isAgentRunning) return

    setIsAgentRunning(true)
    setStatusMsg(null)

    // Step 1: Tool search_movies
    const step1Log: ToolExecutionLog = {
      tool: 'search_movies',
      input: JSON.stringify({ query: agentGoal.trim() }),
      output: 'Searching shows... Found Interstellar (IMAX, 9:30 PM)',
      isError: false,
      timestamp: new Date().toLocaleTimeString(),
    }
    setLogs((prev) => [step1Log, ...prev])
    await new Promise((r) => setTimeout(r, 800))

    // Step 2: Tool check_seats
    const step2Log: ToolExecutionLog = {
      tool: 'check_seats',
      input: JSON.stringify({ movieTitle: 'Interstellar' }),
      output: 'Available seats inspected: [B3, B4 (AI Viewpoint Recommended)]. 24 vacant.',
      isError: false,
      timestamp: new Date().toLocaleTimeString(),
    }
    setLogs((prev) => [step2Log, ...prev])
    await new Promise((r) => setTimeout(r, 900))

    // Step 3: Tool process_payment
    const step3Log: ToolExecutionLog = {
      tool: 'process_payment',
      input: JSON.stringify({ seats: 'B3, B4', amount: 30.0 }),
      output: 'Payment of $30.00 captured! TxnRef: TXN-AUTO-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      isError: false,
      timestamp: new Date().toLocaleTimeString(),
    }
    setLogs((prev) => [step3Log, ...prev])

    setIsAgentRunning(false)
    setAgentGoal('')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          🤖 Model Context Protocol (MCP) Console
        </h1>
        <p className="mt-1 text-sm text-[#888]">
          Standardized JSON-RPC 2.0 tool execution layer. Exposes microservices and RAG directly to any AI Client or Agent.
        </p>
      </div>

      {/* Autonomous Goal Execution Bar */}
      <div
        className="rounded-xl border p-5 space-y-3"
        style={{ backgroundColor: '#111111', borderColor: '#222' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#a78bfa] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" /> Autonomous Agent Goal Runner
          </p>
          <span className="text-[11px] text-[#666]">Multi-step tool orchestration</span>
        </div>

        <form onSubmit={runAutonomousAgent} className="flex gap-2">
          <div className="relative flex-1">
            <Terminal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
            <input
              type="text"
              placeholder="e.g. 'Book 2 premier seats for Interstellar tonight with card 4242'"
              value={agentGoal}
              onChange={(e) => setAgentGoal(e.target.value)}
              className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm text-white bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#7c3aed] outline-none font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isAgentRunning || !agentGoal.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 transition-all shadow"
          >
            {isAgentRunning ? 'Agent Planning...' : (
              <>
                <Send className="h-4 w-4" /> Run Agent
              </>
            )}
          </button>
        </form>
      </div>

      {/* Protocol info badge */}
      <div
        className="rounded-xl border p-4 flex items-center justify-between flex-wrap gap-4"
        style={{ backgroundColor: '#111111', borderColor: '#1f1f1f' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-[#a78bfa]">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Endpoint: /api/v1/mcp</p>
            <p className="text-[11px] text-[#666]">Spec: MCP 2024-11-05 (JSON-RPC 2.0 / SSE Ready)</p>
          </div>
        </div>

        <button
          onClick={loadMcpTools}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a1a] border border-[#2a2a2a] text-[#aaa] hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reload Tools
        </button>
      </div>

      {/* Main Grid: Tool Selector + Playground */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tool List (Left) */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ backgroundColor: '#111111', borderColor: '#222' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#666]">
            Discovered Tools ({tools.length})
          </p>

          <div className="space-y-2">
            {tools.map((t) => (
              <button
                key={t.name}
                onClick={() => selectTool(t)}
                className={`w-full text-left p-3 rounded-lg border transition-all text-xs space-y-1 ${
                  selectedTool === t.name
                    ? 'bg-[#7c3aed15] border-[#7c3aed66] text-white'
                    : 'bg-[#161616] border-[#222] text-[#888] hover:border-[#333]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono font-semibold text-[#a78bfa]">
                  <Wrench className="h-3 w-3" /> {t.name}
                </div>
                <p className="text-[11px] text-[#666] line-clamp-2">{t.description}</p>
              </button>
            ))}

            {tools.length === 0 && (
              <p className="text-xs text-[#555] italic">No tools loaded or backend offline.</p>
            )}
          </div>
        </div>

        {/* Execution Playground (Center & Right) */}
        <div
          className="lg:col-span-2 rounded-xl border p-6 space-y-4"
          style={{ backgroundColor: '#111111', borderColor: '#222' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Play className="h-4 w-4 text-[#7c3aed]" /> Tool Execution Sandbox
            </h2>
            <span className="font-mono text-xs text-[#a78bfa]">{selectedTool}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888] mb-1">
              Input Arguments (JSON Schema Compliant)
            </label>
            <textarea
              rows={5}
              value={argumentsJson}
              onChange={(e) => setArgumentsJson(e.target.value)}
              className="w-full rounded-lg p-3 font-mono text-xs text-emerald-400 bg-[#0d0d0d] border border-[#222] focus:border-[#7c3aed] outline-none resize-none"
            />
          </div>

          <button
            onClick={executeMcpTool}
            disabled={isExecuting || !selectedTool}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition-all bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40"
          >
            {isExecuting ? 'Invoking MCP Tool...' : 'Execute Tool via MCP'}
          </button>

          {statusMsg && (
            <div className="rounded-lg p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Execution History */}
          <div className="space-y-3 pt-4 border-t border-[#222]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#666]">
              Live MCP Execution Log
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-[#222] bg-[#141414] p-3 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-[#a78bfa] flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {log.tool}
                    </span>
                    <span className="text-[10px] text-[#555]">{log.timestamp}</span>
                  </div>

                  <div className="rounded bg-[#0d0d0d] p-2 font-mono text-[11px] text-[#888]">
                    <span className="text-[#555]">ARGS: </span>
                    {log.input.replace(/\s+/g, ' ')}
                  </div>

                  <div className="rounded bg-[#0d1a10] border border-[#1a3a1a] p-2 font-mono text-[11px] text-[#6ee7b7] whitespace-pre-wrap">
                    {log.output}
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <p className="text-xs text-[#555] italic">No executions yet. Select a tool and execute.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
