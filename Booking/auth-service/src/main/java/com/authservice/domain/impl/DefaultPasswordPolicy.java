package com.authservice.domain.impl;

import com.authservice.domain.PasswordPolicy;

/**
 * Java 21 Record implementation of PasswordPolicy interface.
 */
public record DefaultPasswordPolicy(
        int minLength,
        boolean requireUppercase,
        boolean requireNumbers,
        boolean requireSpecialChars,
        int maxPasswordAgeDays,
        int preventReuseCount
) implements PasswordPolicy {

    @Override
    public int getMinLength() {
        return minLength;
    }

    @Override
    public boolean isRequireUppercase() {
        return requireUppercase;
    }

    @Override
    public boolean isRequireNumbers() {
        return requireNumbers;
    }

    @Override
    public boolean isRequireSpecialChars() {
        return requireSpecialChars;
    }

    @Override
    public int getMaxPasswordAgeDays() {
        return maxPasswordAgeDays;
    }

    @Override
    public int getPreventReuseCount() {
        return preventReuseCount;
    }
}
