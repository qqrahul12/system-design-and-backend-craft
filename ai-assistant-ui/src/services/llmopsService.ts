import { apiClient } from './apiClient';

export interface LlmOpsMetrics {
  totalRequests: number;
  blockedAttacks: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatioPercent: number;
  averageLatencyMs: number;
  activeModel: string;
}

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080';

export const llmopsService = {
  getMetrics: (): Promise<LlmOpsMetrics> =>
    apiClient.get<LlmOpsMetrics>('/api/v1/llmops/metrics'),

  clearCache: (): Promise<{ message: string; clearedEntries: number }> =>
    apiClient.post('/api/v1/llmops/cache/clear'),

  sendChatMessage: (payload: { message: string; provider?: string }): Promise<any> =>
    apiClient.post('/api/v1/chat', payload),

  streamChatMessage: (message: string, provider = 'groq', signal?: AbortSignal): Promise<Response> =>
    fetch(
      `${API_BASE}/api/v1/chat/stream?message=${encodeURIComponent(message)}&provider=${encodeURIComponent(provider)}`,
      { signal }
    ),
};
