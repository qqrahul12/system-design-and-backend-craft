package com.skills.ai.persistence.queries;

/**
 * Static immutable SQL queries for CineMind Digital Wallet & Double-Entry Ledger operations.
 * Isolates persistence syntax away from domain business logic (SRP).
 */
public final class WalletSqlQueries {

    private WalletSqlQueries() {}

    public static final String COUNT_WALLET_BY_ID =
            "SELECT COUNT(*) FROM wallets WHERE wallet_id = ?";

    public static final String INSERT_INITIAL_WALLET =
            "INSERT INTO wallets (wallet_id, currency, balance, updated_at) VALUES (?, 'USD', 150.00, CURRENT_TIMESTAMP)";

    public static final String INSERT_INITIAL_TRANSACTION =
            "INSERT INTO wallet_transactions (transaction_id, wallet_id, type, amount, balance_after, description, created_at) " +
            "VALUES (?, ?, 'INITIAL_GRANT', 150.00, 150.00, 'CineMind VIP Welcome Bonus & Stored Value Grant', CURRENT_TIMESTAMP)";

    public static final String SELECT_BALANCE_BY_ID =
            "SELECT balance FROM wallets WHERE wallet_id = ?";

    public static final String SELECT_BALANCE_FOR_UPDATE =
            "SELECT balance FROM wallets WHERE wallet_id = ? FOR UPDATE";

    public static final String SELECT_RECENT_TRANSACTIONS =
            "SELECT transaction_id, type, amount, balance_after, description, created_at " +
            "FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 50";

    public static final String UPDATE_WALLET_BALANCE =
            "UPDATE wallets SET balance = ?, updated_at = ? WHERE wallet_id = ?";

    public static final String INSERT_WALLET_TRANSACTION =
            "INSERT INTO wallet_transactions (transaction_id, wallet_id, type, amount, balance_after, description, created_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)";
}
