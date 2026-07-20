package com.kaptika.api.xp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Concessão de XP — trilha de auditoria (FR-010) e registro de dedupe:
 * a chave única de idempotência faz de cada evento da 002 no máximo uma
 * concessão (FR-003, SC-002). Linhas são criadas apenas pelo insert nativo
 * {@code ON CONFLICT DO NOTHING} do repositório, nunca por save().
 */
@Entity
@Table(name = "xp_grants")
public class XpGrant {

    @Id
    private UUID id;

    @Column(name = "profile_id", nullable = false)
    private UUID profileId;

    @Column(nullable = false)
    private int amount;

    @Column(nullable = false, length = 120)
    private String source;

    /** Instante do fato gerador (answeredAt do evento), não do processamento. */
    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 120)
    private String idempotencyKey;

    protected XpGrant() {
        // JPA
    }

    public UUID getId() {
        return id;
    }

    public UUID getProfileId() {
        return profileId;
    }

    public int getAmount() {
        return amount;
    }

    public String getSource() {
        return source;
    }

    public Instant getGrantedAt() {
        return grantedAt;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }
}
