'use client'

import { useState } from 'react'
import { Upload, Search, Database, FileText, Cpu, MessageSquare, CheckCircle, Clock, Sparkles, BookOpen, FileUp } from 'lucide-react'

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080'

interface Citation {
  source: string
  snippet: string
  relevanceScore: number
}

interface RagResponse {
  answer: string
  citations: Citation[]
  totalIndexedChunks: number
  processingTimeMs: number
}

const SAMPLE_DOCS = [
  {
    title: 'CineMind VIP Membership Benefits',
    content: 'CineMind VIP Members receive 2 complimentary IMAX tickets every month, 20% off all concession snacks, and exclusive access to the Dolby Prime Lounge on Floor 3. VIP parking is complimentary with any reservation.',
  },
  {
    title: 'Refund & Cancellation Policy',
    content: 'Movie bookings can be refunded up to 60 minutes before showtime with zero penalty fees. Refunds are automatically issued to the original payment method within 3 business days. Cancellations within 60 minutes receive a 50% CineMind voucher.',
  },
  {
    title: 'IMAX Laser 3D Technology Guide',
    content: 'CineMind theaters feature dual 4K commercial laser projectors delivering 50% higher brightness and a 12-channel surround sound system. Glasses are sanitized before every screening.',
  },
]

export default function DocumentsPage() {
  const [docTitle, setDocTitle] = useState('')
  const [docContent, setDocContent] = useState('')
  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [isQuerying, setIsQuerying] = useState(false)
  const [ragResult, setRagResult] = useState<RagResponse | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)

  const handleIngest = async (e?: React.FormEvent, customTitle?: string, customContent?: string) => {
    if (e) e.preventDefault()
    const titleToUse = customTitle || docTitle
    const contentToUse = customContent || docContent

    if (!titleToUse.trim() || !contentToUse.trim() || isIngesting) return

    setIsIngesting(true)
    setIngestSuccess(null)

    try {
      const res = await fetch(`${API_BASE}/api/v1/rag/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleToUse.trim(),
          content: contentToUse.trim(),
          chunkSize: 250,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to ingest`)
      const data = await res.json()
      setIngestSuccess(`Indexed "${data.title}" into ${data.chunksIndexed} semantic chunks!`)
      if (!customTitle) {
        setDocTitle('')
        setDocContent('')
      }
    } catch (err: unknown) {
      setIngestSuccess(`Error: ${err instanceof Error ? err.message : 'Ingestion failed'}`)
    } finally {
      setIsIngesting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''))
      setDocContent(text)
    }
    reader.readAsText(file)
  }

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isQuerying) return

    setIsQuerying(true)
    setQueryError(null)

    try {
      const res = await fetch(`${API_BASE}/api/v1/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query.trim(), topK: 3 }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: RAG Query failed`)
      const data: RagResponse = await res.json()
      setRagResult(data)
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setIsQuerying(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          📄 Document Intelligence (RAG Engine)
        </h1>
        <p className="mt-1 text-sm text-[#888]">
          Upload documents or sample policies to generate 768-dimensional vector embeddings with Gemini and query them with semantic citations.
        </p>
      </div>

      {/* RAG Flow Overview */}
      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: '#111111', borderColor: '#1f1f1f' }}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#777]">
          Live Vector RAG Pipeline Execution Flow
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
            <FileText className="h-3.5 w-3.5" /> Text / File
          </span>
          <span className="text-[#555]">→</span>
          <span className="flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
            <Database className="h-3.5 w-3.5" /> Chunking
          </span>
          <span className="text-[#555]">→</span>
          <span className="flex items-center gap-1 text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
            <Cpu className="h-3.5 w-3.5" /> gemini-embedding-001
          </span>
          <span className="text-[#555]">→</span>
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
            <Database className="h-3.5 w-3.5" /> Cosine Top-K Search
          </span>
          <span className="text-[#555]">→</span>
          <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            <MessageSquare className="h-3.5 w-3.5" /> Gemini 3.8 Flash + Citations
          </span>
        </div>
      </div>

      {/* Quick Load Pre-built Knowledge Sample Cards */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#666] flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Quick Ingest Sample Knowledge (1-Click)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {SAMPLE_DOCS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDocTitle(sample.title)
                setDocContent(sample.content)
                handleIngest(undefined, sample.title, sample.content)
              }}
              className="text-left rounded-xl border border-[#222] bg-[#141414] p-3.5 hover:border-[#7c3aed66] transition-all group"
            >
              <p className="text-xs font-semibold text-gray-200 group-hover:text-[#a78bfa] transition-colors">
                {sample.title}
              </p>
              <p className="mt-1 text-[11px] text-[#666] line-clamp-2 leading-relaxed">
                {sample.content}
              </p>
              <span className="mt-2 inline-block text-[10px] text-purple-400 font-medium">
                Click to Auto-Ingest ⚡
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Ingest (Left) and Query (Right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ingest Card */}
        <div
          className="flex flex-col gap-4 rounded-xl border p-6"
          style={{ backgroundColor: '#111111', borderColor: '#222' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4 text-[#7c3aed]" /> Ingest Custom Knowledge
            </h2>
            <label className="cursor-pointer text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300">
              <FileUp className="h-3.5 w-3.5" />
              Upload .txt / .md
              <input type="file" accept=".txt,.md,.json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <form onSubmit={(e) => handleIngest(e)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1">Document Title</label>
              <input
                type="text"
                placeholder="e.g. CineMind Refund Policy"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                required
                className="w-full rounded-lg px-3.5 py-2 text-sm text-white bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#7c3aed] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#888] mb-1">Raw Content Body</label>
              <textarea
                rows={5}
                placeholder="Paste knowledge text, terms, or policies here..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                required
                className="w-full rounded-lg p-3 text-sm text-white bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#7c3aed] outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isIngesting || !docTitle.trim() || !docContent.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition-all bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40"
            >
              {isIngesting ? 'Generating Embeddings & Storing...' : 'Embed & Store in Vector DB'}
            </button>
          </form>

          {ingestSuccess && (
            <div className="rounded-lg p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{ingestSuccess}</span>
            </div>
          )}
        </div>

        {/* Query Card */}
        <div
          className="flex flex-col gap-4 rounded-xl border p-6"
          style={{ backgroundColor: '#111111', borderColor: '#222' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Search className="h-4 w-4 text-cyan-400" /> Semantic RAG Search
            </h2>
            <span className="text-[11px] text-[#666]">Step 2: Retrieval & Citations</span>
          </div>

          <form onSubmit={handleQuery} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. What is the refund policy or VIP lounge benefits?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              className="flex-1 rounded-lg px-3.5 py-2 text-sm text-white bg-[#1a1a1a] border border-[#2a2a2a] focus:border-cyan-500 outline-none"
            />
            <button
              type="submit"
              disabled={isQuerying || !query.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {isQuerying ? 'Searching...' : 'Search'}
            </button>
          </form>

          {queryError && (
            <div className="rounded-lg p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400">
              {queryError}
            </div>
          )}

          {/* RAG Answer Display */}
          {ragResult ? (
            <div className="space-y-4 mt-2">
              <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#777]">
                  <span className="flex items-center gap-1 font-medium text-purple-400">
                    <Sparkles className="h-3.5 w-3.5" /> Synthesized Answer
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {ragResult.processingTimeMs}ms
                  </span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {ragResult.answer}
                </p>
              </div>

              {/* Citations section */}
              {ragResult.citations && ragResult.citations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#666]">
                    Retrieved Vector Contexts ({ragResult.citations.length})
                  </p>
                  <div className="space-y-2">
                    {ragResult.citations.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-[#222] bg-[#141414] p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[#888]">
                          <span className="font-semibold text-gray-300">📌 {c.source}</span>
                          <span className="text-emerald-400 font-mono text-[10px]">
                            Similarity: {(c.relevanceScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-[#888] italic line-clamp-3">
                          "{c.snippet}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-[#555] text-xs border border-dashed border-[#222] rounded-lg p-6 text-center">
              <Database className="h-6 w-6 mb-2 text-[#444]" />
              <p>Type a question above or click a sample card to query your knowledge base.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
