package com.promoservice.domain.impl;

import com.promoservice.domain.ActionDefinition;
import com.promoservice.domain.ConditionNode;
import com.promoservice.domain.PromotionDefinition;

import java.time.Instant;
import java.util.List;

import jakarta.persistence.*;
import jdk.jfr.Enabled;
import lombok.*;

/**
 * Entity implementation of PromotionDefinition interface.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "promotions")
public class DefaultPromotionDefinition implements PromotionDefinition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    String promotionId;

    @Column(length = 100, nullable = false)
    String tenantId;

    @Column(length = 1000, nullable = false)
    String name;

    @Column(length = 100, nullable = false)
    String promoType;

    @Column(length = 100, nullable = false)
    String code;

    int priority;
    boolean isExclusive;
    String stackingGroup;
    @Transient
    ConditionNode conditionRoot;

    @Transient
    List<ActionDefinition> actions;

    Instant startTime;
    Instant endTime;

    @Column(length = 100, nullable = false)
    boolean active;

    @Override
    public boolean isActive() {
        return active;
    }
}
