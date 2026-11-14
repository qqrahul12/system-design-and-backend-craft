import { apiClient } from './apiClient';

export interface SplitUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  name?: string;
  fullName?: string;
}

export interface SplitGroup {
  id: string;
  name: string;
  description: string;
  members: SplitUser[];
  createdAt: string;
}

export interface UserShare {
  userId: string;
  userName: string;
  shareAmount: number;
  paid: boolean;
  paymentMethod?: string;
  settledAt?: string;
}

export interface SplitExpense {
  id: string;
  name: string;
  totalAmount: number;
  paidByUserId: string;
  paidByUserName: string;
  expenseType: string;
  groupId: string;
  referenceType?: string;
  referenceId?: string;
  shares: UserShare[];
  createdAt: string;
}

export interface SplitBalanceSummary {
  userId: string;
  totalPaidForOthers: number;
  totalOwedToOthers: number;
  netBalance: number;
  balancesWithFriends: Record<string, number>;
}

export const splitService = {
  getUsers: (): Promise<SplitUser[]> => apiClient.get<SplitUser[]>('/api/v1/split/users'),

  getGroups: (): Promise<SplitGroup[]> => apiClient.get<SplitGroup[]>('/api/v1/split/groups'),

  getExpenses: (): Promise<SplitExpense[]> => apiClient.get<SplitExpense[]>('/api/v1/split/expenses'),

  getBalances: (userId = 'usr-marcus'): Promise<SplitBalanceSummary> =>
    apiClient.get<SplitBalanceSummary>(`/api/v1/split/balances?userId=${encodeURIComponent(userId)}`),

  createSplit: (payload: {
    name: string;
    totalAmount: number;
    paidByUserId: string;
    memberUserIds: string[];
    referenceType?: string;
    referenceId?: string;
  }): Promise<SplitExpense> => apiClient.post<SplitExpense>('/api/v1/split/create', payload),

  settleShare: (payload: {
    expenseId: string;
    debtorUserId: string;
    paymentMethod: string;
  }): Promise<UserShare> => apiClient.post<UserShare>('/api/v1/split/settle', payload),
};
