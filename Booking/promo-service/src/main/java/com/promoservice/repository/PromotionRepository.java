package com.promoservice.repository;

import com.promoservice.domain.PromotionDefinition;
import com.promoservice.domain.impl.DefaultPromotionDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromotionRepository extends JpaRepository<DefaultPromotionDefinition, String> {

    List<PromotionDefinition> findActivePromotionsByTenantId(String tenantId);

    PromotionDefinition findByTenantIdAndCode(String tenantId, String code);
}
