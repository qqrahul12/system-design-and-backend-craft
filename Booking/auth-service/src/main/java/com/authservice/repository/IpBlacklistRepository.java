package com.authservice.repository;

/**
 * Repository interface for dynamically checking tenant-scoped IP blacklists and Geo-IP blocks.
 */
public interface IpBlacklistRepository {

    boolean isIpBlacklisted(String tenantId, String clientIp);

    void addBlacklistedIp(String tenantId, String clientIp, long ttlSeconds);
}
