import { apiClient } from './apiClient';

export interface AgentPersona {
  role: string;
  name: string;
  specialty: string;
  avatar: string;
  status: string;
  color: string;
  description: string;
}

export interface OrchestrationStep {
  agentRole: string;
  action: string;
  toolUsed?: string;
  input?: any;
  toolOutput?: string;
  timestamp: string;
}

export interface OrchestrationResult {
  runId: string;
  objective: string;
  status: string;
  steps: OrchestrationStep[];
  finalAnswer: string;
  totalLatencyMs: number;
}

export const agentService = {
  getRoster: (): Promise<AgentPersona[]> =>
    apiClient.get<AgentPersona[]>('/api/v1/agents/roster'),

  orchestrate: (payload: { objective: string; model?: string }): Promise<OrchestrationResult> =>
    apiClient.post<OrchestrationResult>('/api/v1/agents/orchestrate', payload),

  callMcp: (
    methodOrPayload: string | { jsonrpc?: string; id?: number | string; method: string; params?: any },
    params?: any
  ): Promise<any> => {
    if (typeof methodOrPayload === 'string') {
      return apiClient.post<any>('/api/v1/mcp', {
        jsonrpc: '2.0',
        id: Date.now(),
        method: methodOrPayload,
        params,
      });
    }
    return apiClient.post<any>('/api/v1/mcp', {
      jsonrpc: '2.0',
      id: methodOrPayload.id ?? Date.now(),
      ...methodOrPayload,
    });
  },
};
