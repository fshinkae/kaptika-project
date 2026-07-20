package com.kaptika.api.xp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Saldo consolidado de XP por estudante (FR-004). Mantido exclusivamente
 * pelo upsert atômico do repositório na mesma transação da concessão —
 * por construção, sempre igual à soma de xp_grants (SC-001).
 */
@Entity
@Table(name = "xp_balances")
public class XpBalance {

    @Id
    @Column(name = "profile_id")
    private UUID profileId;

    @Column(name = "xp_total", nullable = false)
    private long xpTotal;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected XpBalance() {
        // JPA
    }

    public UUID getProfileId() {
        return profileId;
    }

    public long getXpTotal() {
        return xpTotal;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
