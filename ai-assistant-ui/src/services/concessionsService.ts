import { apiClient } from './apiClient';

export interface ConcessionItem {
  id: string;
  name: string;
  category: string;
  price: number;
  calories: number;
  icon: string;
  dietaryTags: string[];
  genrePairing: string[];
  description: string;
}

export interface ConcessionCombo {
  id: string;
  title: string;
  items: ConcessionItem[];
  originalPrice: number;
  comboPrice: number;
  savings: number;
  curatorNote: string;
  genre: string;
}

export interface ConcessionOrder {
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  deliverySeat: string;
  status: string;
  estimatedMinutes: number;
  createdAt: string;
}

export const concessionsService = {
  getMenu: (): Promise<ConcessionItem[]> =>
    apiClient.get<ConcessionItem[]>('/api/v1/concessions/menu'),

  getOrders: (): Promise<ConcessionOrder[]> =>
    apiClient.get<ConcessionOrder[]>('/api/v1/concessions/orders'),

  recommendCombos: (movieGenre = 'Sci-Fi', partySize = 2): Promise<ConcessionCombo[]> =>
    apiClient.get<ConcessionCombo[]>(
      `/api/v1/concessions/recommend?movieGenre=${encodeURIComponent(movieGenre)}&partySize=${partySize}`
    ),

  placeOrder: (payload: {
    items: Array<{ name: string; quantity: number; price: number }>;
    deliverySeat: string;
    total: number;
  }): Promise<ConcessionOrder> =>
    apiClient.post<ConcessionOrder>('/api/v1/concessions/order', payload),

  updateOrderStatus: (orderId: string, status: string): Promise<ConcessionOrder> =>
    apiClient.put<ConcessionOrder>(`/api/v1/concessions/orders/${orderId}/status`, { status }),
};
