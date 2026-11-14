package com.skills.ai.split;

/**
 * Patron / User model representing a moviegoer in the SplitMoney group expense ledger.
 */
public record SplitUser(
        String id,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        String avatarUrl
) {
    public String getFullName() {
        return firstName + " " + lastName;
    }

    public String getName() {
        return firstName + " " + lastName;
    }
}
