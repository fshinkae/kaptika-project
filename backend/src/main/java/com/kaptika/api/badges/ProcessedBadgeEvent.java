package com.kaptika.api.badges;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Marca de evento de domínio já consumido pela 005 (SC-002). A chave primária
 * é a idempotencyKey determinística do evento ("answer:&lt;id&gt;",
 * "session:&lt;id&gt;"); a inserção com ON CONFLICT DO NOTHING é o primeiro
 * passo do processamento — 0 linhas afetadas significa reprocesso (no-op).
 */
@Entity
@Table(name = "processed_badge_events")
public class ProcessedBadgeEvent {

    @Id
    @Column(name = "idempotency_key", length = 80)
    private String idempotencyKey;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    protected ProcessedBadgeEvent() {
        // JPA
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }
}
