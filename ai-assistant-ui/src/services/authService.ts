import { apiClient } from './apiClient';

export interface UserPersona {
  role: string;
  name: string;
  email: string;
  avatar: string;
  description: string;
  tier: string;
  badge: string;
  isAuthenticated: boolean;
}

export const authService = {
  getCurrentUser: (): Promise<UserPersona> => apiClient.get<UserPersona>('/api/v1/auth/me'),

  getPersonas: (): Promise<UserPersona[]> => apiClient.get<UserPersona[]>('/api/v1/auth/personas'),

  login: (role: string, email: string, name: string): Promise<UserPersona> =>
    apiClient.post<UserPersona>('/api/v1/auth/login', { role, email, name }),

  logout: (): Promise<{ message: string; currentUser: UserPersona }> =>
    apiClient.post<{ message: string; currentUser: UserPersona }>('/api/v1/auth/logout'),

  switchRole: (role: string): Promise<UserPersona> =>
    apiClient.post<UserPersona>('/api/v1/auth/switch-role', { role }),
};
