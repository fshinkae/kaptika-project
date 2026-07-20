package com.kaptika.api.badges;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Medalha do catálogo (FR-006/FR-008). As linhas nascem por migração (seed)
 * ou publicação administrativa — nunca por save() da aplicação; o slug é o
 * identificador estável exposto ao cliente.
 */
@Entity
@Table(name = "badges")
public class Badge {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 40)
    private String slug;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(nullable = false, length = 200)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 30)
    private BadgeCondition conditionType;

    @Column(nullable = false)
    private int threshold;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected Badge() {
        // JPA
    }

    /** Condição satisfeita pelos contadores acumulados do estudante (FR-002). */
    public boolean satisfiedBy(BadgeCounters counters) {
        return conditionType.currentValue(counters) >= threshold;
    }

    public UUID getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public BadgeCondition getConditionType() {
        return conditionType;
    }

    public int getThreshold() {
        return threshold;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
