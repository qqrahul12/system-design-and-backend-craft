import { apiClient } from './apiClient';

export interface ConcessionItem {
  id: string;
  name: string;
  category: string;
  price: number;
  calories: number;
  icon: string;
  dietaryTags?: string[];
  dietary?: string[];
  genrePairing?: string[];
  genrePairings?: string[];
  description: string;
  inStock?: boolean;
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

  recommendCombos: (genre = 'Sci-Fi', partySize = 2): Promise<ConcessionCombo[]> =>
    apiClient.post<ConcessionCombo[]>('/api/v1/concessions/recommend', { genre, partySize }),

  placeOrder: (payload: {
    items: Array<{ name: string; quantity: number; price: number }>;
    deliverySeat: string;
    total: number;
    createdAt?: string;
  }): Promise<ConcessionOrder> =>
    apiClient.post<ConcessionOrder>('/api/v1/concessions/order', payload),

  updateOrderStatus: (orderId: string, status: string): Promise<ConcessionOrder> =>
    apiClient.post<ConcessionOrder>(`/api/v1/concessions/orders/${orderId}/status`, { status }),

  saveItem: (item: Partial<ConcessionItem>): Promise<ConcessionItem> =>
    apiClient.post<ConcessionItem>('/api/v1/concessions/items', item),

  seedItems: (items: Partial<ConcessionItem>[]): Promise<ConcessionItem[]> =>
    apiClient.post<ConcessionItem[]>('/api/v1/concessions/seed', items),

  toggleStock: (id: string, inStock: boolean): Promise<ConcessionItem> =>
    apiClient.patch<ConcessionItem>(`/api/v1/concessions/items/${id}/stock`, { inStock }),

  deleteItem: (id: string): Promise<void> =>
    apiClient.delete<void>(`/api/v1/concessions/items/${id}`),
};
