import { apiClient } from './apiClient';

export interface Ticket {
  ticketId: string;
  movieTitle: string;
  format: string;
  auditorium: string;
  seats: string[];
  totalPrice: number;
  qrCodeSignature: string;
  digitalSignature: string;
  paymentMethod: string;
  status: string;
  issuedAt: string;
  showtime: string;
}

export interface SeatLockResponse {
  lockId: string;
  movieTitle: string;
  seats: string[];
  expiresInSeconds: number;
  success: boolean;
  message?: string;
}

export const ticketService = {
  getTickets: (): Promise<Ticket[]> => apiClient.get<Ticket[]>('/api/v1/tickets'),

  getTicket: (id: string): Promise<Ticket> => apiClient.get<Ticket>(`/api/v1/tickets/${id}`),

  lockSeats: (payload: { movieTitle: string; seats: string[]; userId: string }): Promise<SeatLockResponse> =>
    apiClient.post<SeatLockResponse>('/api/v1/tickets/lock', payload),

  unlockSeats: (payload: { movieTitle: string; seats: string[]; lockId?: string }): Promise<void> =>
    apiClient.post<void>('/api/v1/tickets/unlock', payload),

  getLockedSeats: (movieTitle: string): Promise<{ lockedSeats: string[] }> =>
    apiClient.get<{ lockedSeats: string[] }>(`/api/v1/tickets/seats?movieTitle=${encodeURIComponent(movieTitle)}`),

  issueTicket: (payload: {
    movieTitle: string;
    format: string;
    auditorium: string;
    seats: string[];
    pricePerTicket: number;
    paymentMethod: string;
    showtime: string;
    lockId?: string;
  }): Promise<Ticket> => apiClient.post<Ticket>('/api/v1/tickets/issue', payload),

  validateTicket: (ticketId: string, qrToken: string): Promise<{ valid: boolean; code?: string; message: string; ticket?: any }> =>
    apiClient.post('/api/v1/tickets/validate', { ticketId, qrToken }),

  cancelTicket: (ticketId: string): Promise<void> =>
    apiClient.delete(`/api/v1/tickets/${ticketId}`),

  refundTicket: (ticketId: string, reason?: string): Promise<{ message: string; ticket: Ticket }> =>
    apiClient.post(`/api/v1/tickets/${ticketId}/refund`, { reason }),
};
