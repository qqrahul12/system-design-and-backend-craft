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
  getCurrentUser: async (): Promise<UserPersona> => {
    const user = await apiClient.get<UserPersona>('/api/v1/auth/me');
    if (typeof window !== 'undefined' && user?.role) {
      localStorage.setItem('cinemind_role', user.role);
    }
    return user;
  },

  getPersonas: (): Promise<UserPersona[]> => apiClient.get<UserPersona[]>('/api/v1/auth/personas'),

  login: async (email?: string, role?: string, name?: string): Promise<UserPersona> => {
    const user = await apiClient.post<UserPersona>('/api/v1/auth/login', {
      email: email ?? 'alex.vance@cinemind.vip',
      role: role ?? '',
      name: name ?? ''
    });
    if (typeof window !== 'undefined' && user?.role) {
      localStorage.setItem('cinemind_role', user.role);
      window.dispatchEvent(new Event('cinemind-auth-changed'));
    }
    return user;
  },

  logout: async (): Promise<{ message: string; currentUser: UserPersona }> => {
    const res = await apiClient.post<{ message: string; currentUser: UserPersona }>('/api/v1/auth/logout');
    if (typeof window !== 'undefined') {
      localStorage.setItem('cinemind_role', 'ANONYMOUS');
      window.dispatchEvent(new Event('cinemind-auth-changed'));
    }
    return res;
  },

  switchRole: async (role: string): Promise<UserPersona> => {
    const user = await apiClient.post<UserPersona>('/api/v1/auth/switch-role', { role });
    if (typeof window !== 'undefined' && user?.role) {
      localStorage.setItem('cinemind_role', user.role);
      window.dispatchEvent(new Event('cinemind-auth-changed'));
    }
    return user;
  },
};
