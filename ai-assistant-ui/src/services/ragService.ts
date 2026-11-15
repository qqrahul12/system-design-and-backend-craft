import { apiClient } from './apiClient';

export interface RagIngestResult {
  title: string;
  chunksIndexed: number;
  message: string;
  status: string;
}

export interface RagResponse {
  answer: string;
  sources?: Array<{
    documentTitle: string;
    chunkIndex: number;
    text: string;
    score: number;
  }>;
  retrievedChunks?: string[];
  totalChunksSearched?: number;
}

export const ragService = {
  ingest: (payload: { title: string; content: string; chunkSize?: number }): Promise<RagIngestResult> =>
    apiClient.post<RagIngestResult>('/api/v1/rag/ingest', { chunkSize: payload.chunkSize ?? 250, ...payload }),

  query: (payload: { question: string; topK?: number }): Promise<RagResponse> =>
    apiClient.post<RagResponse>('/api/v1/rag/query', { topK: payload.topK ?? 3, ...payload }),
};
