package com.kaptika.api.streak;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Dedupe do consumo de eventos (FR-009): a chave determinística do evento
 * ("session:&lt;id&gt;") é PK — reprocessamento é curto-circuitado antes de
 * qualquer lógica de ofensiva.
 */
@Entity
@Table(name = "streak_event_dedupe")
public class StreakEventDedupe {

    @Id
    @Column(name = "idempotency_key", length = 120)
    private String idempotencyKey;

    @Column(name = "profile_id", nullable = false)
    private UUID profileId;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    protected StreakEventDedupe() {
        // JPA
    }

    public StreakEventDedupe(String idempotencyKey, UUID profileId) {
        this.idempotencyKey = idempotencyKey;
        this.profileId = profileId;
        this.processedAt = Instant.now();
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public UUID getProfileId() {
        return profileId;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }
}
