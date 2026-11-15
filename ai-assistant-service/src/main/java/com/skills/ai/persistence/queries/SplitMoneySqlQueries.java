package com.skills.ai.persistence.queries;

/**
 * Static immutable SQL queries for Squad Bill-Splitting & Multi-Gateway Share Settlement.
 * Isolates persistence syntax away from domain business logic (SRP).
 */
public final class SplitMoneySqlQueries {

    private SplitMoneySqlQueries() {}

    public static final String COUNT_USERS =
            "SELECT COUNT(*) FROM split_users";

    public static final String INSERT_USER_IF_NOT_EXISTS =
            "INSERT INTO split_users (id, first_name, last_name, email, phone, avatar_url) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING";

    public static final String SELECT_ALL_USERS =
            "SELECT id, first_name, last_name, email, phone, avatar_url FROM split_users";

    public static final String SELECT_USER_BY_ID =
            "SELECT id, first_name, last_name, email, phone, avatar_url FROM split_users WHERE id = ?";

    public static final String INSERT_GROUP_IF_NOT_EXISTS =
            "INSERT INTO split_groups (id, name, description, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING";

    public static final String INSERT_GROUP =
            "INSERT INTO split_groups (id, name, description, created_at) VALUES (?, ?, ?, ?)";

    public static final String INSERT_GROUP_MEMBER_IF_NOT_EXISTS =
            "INSERT INTO split_group_members (group_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING";

    public static final String SELECT_ALL_GROUPS =
            "SELECT id, name, description, created_at FROM split_groups";

    public static final String SELECT_GROUP_BY_ID =
            "SELECT id, name, description, created_at FROM split_groups WHERE id = ?";

    public static final String SELECT_GROUP_MEMBERS =
            "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url FROM split_users u " +
            "JOIN split_group_members m ON u.id = m.user_id WHERE m.group_id = ?";

    public static final String INSERT_EXPENSE = """
            INSERT INTO split_expenses (
                id, group_id, name, total_amount, paid_by_user_id, paid_by_user_name,
                expense_type, reference_type, reference_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    public static final String INSERT_SHARE = """
            INSERT INTO split_shares (
                id, expense_id, user_id, user_name, share_amount, is_paid, payment_method, paid_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

    public static final String SELECT_ALL_EXPENSES =
            "SELECT id, group_id, name, total_amount, paid_by_user_id, paid_by_user_name, expense_type, reference_type, reference_id, created_at " +
            "FROM split_expenses ORDER BY created_at DESC";

    public static final String SELECT_EXPENSE_BY_ID =
            "SELECT id, group_id, name, total_amount, paid_by_user_id, paid_by_user_name, expense_type, reference_type, reference_id, created_at " +
            "FROM split_expenses WHERE id = ?";

    public static final String SELECT_SHARES_BY_EXPENSE_ID =
            "SELECT user_id, user_name, share_amount, is_paid, payment_method, paid_at FROM split_shares WHERE expense_id = ?";

    public static final String SELECT_ALL_SHARES =
            "SELECT expense_id, user_id, user_name, share_amount, is_paid, payment_method, paid_at FROM split_shares";

    public static final String UPDATE_SHARE_SETTLED =
            "UPDATE split_shares SET is_paid = TRUE, payment_method = ?, paid_at = ? WHERE expense_id = ? AND user_id = ?";
}
