package com.skills.ai.wallet;

import java.time.Instant;
import java.util.List;

/**
 * Interface contract for CineMind's Fintech Digital Wallet (CineCash).
 * Defines operations for querying balances, reloading funds, atomic debits, and issuing refunds.
 * Adheres to Dependency Inversion (DIP) and Interface Segregation (ISP).
 */
public interface WalletService {

    record WalletTransaction(
            String txnId,
            String type, // "INITIAL_GRANT", "TOP_UP", "TICKET_PAYMENT", "CONCESSIONS_PAYMENT", "REFUND"
            double amount,
            double balanceAfter,
            String description,
            Instant timestamp
    ) {}

    record WalletSummary(
            String walletId,
            String currency,
            double balance,
            int transactionCount,
            List<WalletTransaction> recentTransactions
    ) {}

    /**
     * Retrieves the current wallet summary for the active user.
     */
    WalletSummary getWalletSummary();

    /**
     * Retrieves the wallet summary for a specific wallet identifier.
     */
    WalletSummary getWalletSummary(String walletId);

    /**
     * Tops up active user's wallet balance via registered payment gateway.
     */
    WalletTransaction topUp(double amount, String paymentMethod);

    /**
     * Tops up a specific wallet balance.
     */
    WalletTransaction topUp(String walletId, double amount, String paymentMethod);

    /**
     * Atomically debits funds from the active user's wallet.
     */
    WalletTransaction debit(double amount, String type, String description);

    /**
     * Atomically debits funds from a specific wallet.
     */
    WalletTransaction debit(String walletId, double amount, String type, String description);

    /**
     * Credits a refund back to the customer's wallet.
     */
    WalletTransaction creditRefund(double amount, String reason);

    /**
     * Credits a refund back to a specific wallet.
     */
    WalletTransaction creditRefund(String walletId, double amount, String reason);
}
