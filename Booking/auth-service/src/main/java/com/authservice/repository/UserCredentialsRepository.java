package com.authservice.repository;

import com.authservice.domain.UserCredential;

/**
 * Repository interface for User Credentials.
 * Spring dynamically routes queries to the target tenant's database connection via TenantRoutingDataSource.
 */
public interface UserCredentialsRepository {

    UserCredential findByUserId(String userId);

    void save(UserCredential credential);
}
