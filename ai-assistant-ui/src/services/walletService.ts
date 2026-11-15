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
  currencySymbol?: string;
  balance: number;
  transactionCount: number;
  recentTransactions: WalletTransaction[];
}

export function getCurrencySymbol(currency = 'USD'): string {
  switch (currency?.toUpperCase()?.trim()) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'CAD': return 'CA$';
    case 'AUD': return 'A$';
    case 'JPY': return '¥';
    default: return '$';
  }
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
}

export const walletService = {
  getWalletSummary: (): Promise<WalletSummary> => apiClient.get<WalletSummary>('/api/v1/wallet'),

  topUp: (amount: number, paymentMethod: string): Promise<WalletTransaction> =>
    apiClient.post<WalletTransaction>('/api/v1/wallet/topup', { amount, paymentMethod }),

  pay: (amount: number, description: string): Promise<WalletTransaction> =>
    apiClient.post<WalletTransaction>('/api/v1/wallet/pay', { amount, description }),

  setCurrency: (currency: string): Promise<WalletSummary> =>
    apiClient.post<WalletSummary>('/api/v1/wallet/currency', { currency }),

  formatCurrency,
  getCurrencySymbol,
};
