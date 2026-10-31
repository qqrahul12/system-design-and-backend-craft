// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string
  conversationId?: string
}

export interface ChatResponse {
  id: string
  message: string
  model: string
  conversationId: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  createdAt: string
}

export interface StreamChunk {
  text?: string
  content?: string
  done?: boolean
}

export interface Movie {
  id: string
  title: string
  genre: string
  rating: number
  year: number
  synopsis: string
}

export interface BookingRequest {
  movieId: string
  seatIds: string[]
  userId: string
}

export interface BookingResponse {
  bookingId: string
  status: 'confirmed' | 'pending' | 'failed'
  seats: string[]
  totalPrice: number
}

export interface ApiError {
  error: string
  status: number
  message: string
}

// ── API base ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${body || res.statusText}`)
  }
  return res.json() as Promise<T>
}

// ── Chat ──────────────────────────────────────────────────────────────────────

/**
 * Send a one-shot chat message and await the full response.
 */
export async function chat(
  message: string,
  conversationId?: string,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId } satisfies ChatRequest),
  })
  return handleResponse<ChatResponse>(res)
}

/**
 * Returns an EventSource connected to the streaming chat endpoint.
 * The caller is responsible for closing it.
 */
export function streamChat(message: string): EventSource {
  return new EventSource(
    `${API_BASE}/api/v1/chat/stream?message=${encodeURIComponent(message)}`,
  )
}

/**
 * Streaming chat via fetch + ReadableStream — returns an async generator
 * that yields text tokens. Handles both JSON `{ text }` and plain-text SSE data.
 */
export async function* streamChatFetch(
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch(
    `${API_BASE}/api/v1/chat/stream?message=${encodeURIComponent(message)}`,
    { signal },
  )

  if (!res.ok) throw new Error(`Stream error ${res.status}`)

  const reader  = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const raw = line.slice(5).trim()
      if (raw === '[DONE]' || !raw) continue

      try {
        const parsed = JSON.parse(raw) as StreamChunk
        yield parsed.text ?? parsed.content ?? ''
      } catch {
        yield raw
      }
    }
  }
}

// ── Movies ────────────────────────────────────────────────────────────────────

export async function getMovies(): Promise<Movie[]> {
  const res = await fetch(`${API_BASE}/api/v1/movies`)
  return handleResponse<Movie[]>(res)
}

export async function getMovie(id: string): Promise<Movie> {
  const res = await fetch(`${API_BASE}/api/v1/movies/${id}`)
  return handleResponse<Movie>(res)
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function createBooking(
  payload: BookingRequest,
): Promise<BookingResponse> {
  const res = await fetch(`${API_BASE}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<BookingResponse>(res)
}
