import { apiClient } from './apiClient';

export interface WalletTransaction {
  txnId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  timestamp: string;
}

export interface WalletSummary {
  walletId: string;
  currency: string;
  balance: number;
  transactionCount: number;
  recentTransactions: WalletTransaction[];
}

export const walletService = {
  getWalletSummary: (): Promise<WalletSummary> => apiClient.get<WalletSummary>('/api/v1/wallet'),

  topUp: (amount: number, paymentMethod: string): Promise<WalletTransaction> =>
    apiClient.post<WalletTransaction>('/api/v1/wallet/topup', { amount, paymentMethod }),

  pay: (amount: number, description: string): Promise<WalletTransaction> =>
    apiClient.post<WalletTransaction>('/api/v1/wallet/pay', { amount, description }),
};
