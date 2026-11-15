import { apiClient } from './apiClient';

export interface SessionSummary {
  sessionId: string;
  title: string;
  type: string;
  createdAt: string;
  lastActiveAt: string;
  interactionCount: number;
  lastPreview?: string;
  events?: Array<Record<string, any>>;
}

export const sessionService = {
  listSessions: (): Promise<SessionSummary[]> =>
    apiClient.get<SessionSummary[]>('/api/v1/sessions'),

  getSession: (id: string): Promise<SessionSummary> =>
    apiClient.get<SessionSummary>(`/api/v1/sessions/${id}`),

  saveSession: (session: SessionSummary): Promise<SessionSummary> =>
    apiClient.post<SessionSummary>('/api/v1/sessions', session),

  deleteSession: (id: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/api/v1/sessions/${id}`),
};
