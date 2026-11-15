import { apiClient } from './apiClient';

export interface AdminAnalytics {
  totalRevenue: number;
  totalTicketsSold: number;
  occupancyRatePercent: number;
  activeScreeningsCount: number;
  concessionsRevenue: number;
  topGrossingMovieTitle: string;
  vipReclinerAdmissions: number;
  circuitBreakerTripped: boolean;
  boxOfficeByFormat: Record<string, number>;
  occupancyByAuditorium: Record<string, number>;
}

export interface ExecutiveBriefing {
  briefingId: string;
  timestamp: string;
  provider: string;
  summary: string;
  keyInsights: string[];
  recommendations: string[];
}

export interface CircuitBreakerStatus {
  circuitBreaker: string;
  state: string; // CLOSED, OPEN, HALF_OPEN
  simulatedFailureActive: boolean;
  failureRateThresholdPercent: number;
  slowCallRateThresholdPercent: number;
  bufferedCalls: number;
  failedCalls: number;
}

export const adminService = {
  getAnalytics: (): Promise<AdminAnalytics> =>
    apiClient.get<AdminAnalytics>('/api/v1/admin/analytics'),

  generateBriefing: (): Promise<ExecutiveBriefing> =>
    apiClient.post<ExecutiveBriefing>('/api/v1/admin/briefing'),

  getCircuitBreakerStatus: (): Promise<CircuitBreakerStatus> =>
    apiClient.get<CircuitBreakerStatus>('/api/v1/admin/circuit-breaker/status'),

  toggleStripeFailure: (): Promise<{ simulatedFailureActive: boolean; message: string }> =>
    apiClient.post('/api/v1/admin/circuit-breaker/toggle-stripe-failure'),
};
