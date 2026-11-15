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

export interface SeatLock {
  lockToken: string;
  movieTitle: string;
  showTime: string;
  seats: string[];
  expiresAt: string;
}

export interface AuditoriumSeatsData {
  movieTitle: string;
  showTime: string;
  totalSeats: number;
  rows: string[];
  cols: number[];
  occupiedSeats: string[];
  lockedSeats: string[];
  tierCatalog?: Record<string, any>;
}

export const ticketService = {
  getTickets: (): Promise<Ticket[]> => apiClient.get<Ticket[]>('/api/v1/tickets'),

  getTicket: (id: string): Promise<Ticket> => apiClient.get<Ticket>(`/api/v1/tickets/${id}`),

  getAuditoriumSeats: (
    movieTitle: string,
    showtime?: string,
    format?: string,
    auditorium?: string,
    date?: string
  ): Promise<AuditoriumSeatsData> => {
    const params = new URLSearchParams();
    if (movieTitle) params.set('movie', movieTitle);
    if (showtime) params.set('showtime', showtime);
    if (format) params.set('format', format);
    if (auditorium) params.set('auditorium', auditorium);
    if (date) params.set('date', date);
    return apiClient.get<AuditoriumSeatsData>(`/api/v1/tickets/seats?${params.toString()}`);
  },

  getLockedSeats: (movieTitle: string, showtime?: string): Promise<{ lockedSeats: string[] }> => {
    const qMovie = encodeURIComponent(movieTitle || '');
    const qShow = encodeURIComponent(showtime || '');
    return apiClient.get<{ lockedSeats: string[] }>(`/api/v1/tickets/seats?movie=${qMovie}&showtime=${qShow}`);
  },

  lockSeats: (payload: { movieTitle: string; showTime?: string; seats: string[] }): Promise<SeatLock> =>
    apiClient.post<SeatLock>('/api/v1/tickets/lock', payload),

  unlockSeats: (payload: { lockToken: string }): Promise<{ released: boolean; lockToken: string }> =>
    apiClient.post<{ released: boolean; lockToken: string }>('/api/v1/tickets/unlock', payload),

  issueTicket: (payload: {
    movieTitle: string;
    showTime: string;
    format: string;
    auditorium: string;
    seats: string[];
    totalPaid: number;
    paymentMethod?: string;
  }): Promise<Ticket> => apiClient.post<Ticket>('/api/v1/tickets/issue', payload),

  validateTicket: (ticketId: string, qrToken: string): Promise<{ valid: boolean; code?: string; message: string; ticket?: any }> =>
    apiClient.post('/api/v1/tickets/validate', { ticketId, qrToken }),

  cancelTicket: (ticketId: string): Promise<{ success: boolean; message: string; refundedAmount?: number }> =>
    apiClient.delete(`/api/v1/tickets/${ticketId}`),

  refundTicket: (ticketId: string, reason?: string): Promise<{ message: string; ticket: Ticket }> =>
    apiClient.post(`/api/v1/tickets/${ticketId}/refund`, { reason }),
};
