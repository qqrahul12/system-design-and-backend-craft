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

export const llmopsService = {
  getMetrics: (): Promise<LlmOpsMetrics> =>
    apiClient.get<LlmOpsMetrics>('/api/v1/llmops/metrics'),

  clearCache: (): Promise<{ message: string; clearedEntries: number }> =>
    apiClient.post('/api/v1/llmops/cache/clear'),

  sendChatMessage: (payload: { message: string; provider?: string }): Promise<any> =>
    apiClient.post('/api/v1/chat', payload),
};
