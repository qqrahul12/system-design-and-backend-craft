package com.authservice.domain;

/**
 * Interface representing tenant-specific password complexity and validation policies.
 */
public interface PasswordPolicy {

    int getMinLength();

    boolean isRequireUppercase();

    boolean isRequireNumbers();

    boolean isRequireSpecialChars();

    int getMaxPasswordAgeDays();

    int getPreventReuseCount();
}
