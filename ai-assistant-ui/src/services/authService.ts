import { apiClient } from './apiClient';

export interface UserPersona {
  role: string;
  name?: string;
  fullName?: string;
  userId?: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  description?: string;
  tier?: string;
  membershipTier?: string;
  badge?: string;
  roleDisplayName?: string;
  permissions?: string[];
  isAuthenticated: boolean;
}

// RFC 5322-compatible email format validator (client-side guard)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateLoginInput(email: string, password: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.push({ field: 'email', message: 'Email address is required.' });
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address (e.g. name@domain.com).' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters.' });
  }

  return errors;
}

export function validateRegisterInput(fullName: string, email: string, password: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const trimmedName = fullName.trim();

  if (!trimmedName) {
    errors.push({ field: 'fullName', message: 'Full name is required.' });
  } else if (trimmedName.length < 2) {
    errors.push({ field: 'fullName', message: 'Full name must be at least 2 characters.' });
  }

  return [...errors, ...validateLoginInput(email, password)];
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

  /**
   * Authenticates by email + role. Callers MUST validate inputs via
   * validateLoginInput() before invoking this method. Empty email/role
   * will be rejected with a 400 by the backend.
   */
  login: async (email: string, role: string, name?: string): Promise<UserPersona> => {
    if (!email.trim()) throw new Error('Email is required before calling authService.login().');
    const user = await apiClient.post<UserPersona>('/api/v1/auth/login', {
      email: email.trim().toLowerCase(),
      role: role.trim(),
      name: (name ?? '').trim(),
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

  hasRole: (user: UserPersona | null, ...roles: string[]): boolean => {
    if (!user || !user.isAuthenticated || user.role === 'ANONYMOUS') return false;
    return roles.includes(user.role);
  },

  hasPermission: (user: UserPersona | null, permission: string): boolean => {
    if (!user || !user.isAuthenticated || user.role === 'ANONYMOUS' || !user.permissions) return false;
    return user.permissions.includes(permission);
  },
};
