package com.skills.ai.persistence.queries;

/**
 * Parameterized SQL Queries for User Profiles & RBAC Personas.
 * Follows Single Responsibility and Zero Hardcoded Values standards.
 */
public final class UserSqlQueries {

    private UserSqlQueries() {}

    public static final String SELECT_ALL_USERS =
            "SELECT user_id, full_name, email, password_hash, role, role_display_name, membership_tier, " +
            "discount_rate, avatar_url, permissions_csv, is_authenticated " +
            "FROM user_profiles ORDER BY user_id ASC";

    public static final String SELECT_USER_BY_ROLE =
            "SELECT user_id, full_name, email, password_hash, role, role_display_name, membership_tier, " +
            "discount_rate, avatar_url, permissions_csv, is_authenticated " +
            "FROM user_profiles WHERE role = ?";

    public static final String SELECT_USER_BY_EMAIL =
            "SELECT user_id, full_name, email, password_hash, role, role_display_name, membership_tier, " +
            "discount_rate, avatar_url, permissions_csv, is_authenticated " +
            "FROM user_profiles WHERE LOWER(email) = LOWER(?)";

    public static final String UPSERT_USER_PROFILE =
            "INSERT INTO user_profiles (" +
            "user_id, full_name, email, password_hash, role, role_display_name, membership_tier, " +
            "discount_rate, avatar_url, permissions_csv, is_authenticated, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) " +
            "ON CONFLICT (user_id) DO UPDATE SET " +
            "full_name = EXCLUDED.full_name, " +
            "email = EXCLUDED.email, " +
            "password_hash = COALESCE(EXCLUDED.password_hash, user_profiles.password_hash), " +
            "role = EXCLUDED.role, " +
            "role_display_name = EXCLUDED.role_display_name, " +
            "membership_tier = EXCLUDED.membership_tier, " +
            "discount_rate = EXCLUDED.discount_rate, " +
            "avatar_url = EXCLUDED.avatar_url, " +
            "permissions_csv = EXCLUDED.permissions_csv, " +
            "is_authenticated = EXCLUDED.is_authenticated, " +
            "updated_at = CURRENT_TIMESTAMP";
}
