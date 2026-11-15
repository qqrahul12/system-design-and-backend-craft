import { apiClient } from './apiClient';

export interface TraceSpan {
  spanId: string;
  name: string;
  component: string;
  durationMs: number;
  status: string;
  attributes: Record<string, any>;
}

export interface TraceRecord {
  traceId: string;
  operationName: string;
  startTime: string;
  durationMs: number;
  status: string;
  spans: TraceSpan[];
}

export const telemetryService = {
  getTraces: (): Promise<TraceRecord[]> =>
    apiClient.get<TraceRecord[]>('/api/v1/telemetry/traces'),

  getTraceById: (id: string): Promise<TraceRecord> =>
    apiClient.get<TraceRecord>(`/api/v1/telemetry/traces/${id}`),
};
