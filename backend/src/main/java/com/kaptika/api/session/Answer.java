package com.kaptika.api.session;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Resultado confirmado de uma questão da sessão — o único dado da questão que
 * persistimos (letra escolhida + acerto), referenciando a questão só pelo
 * {@code source_id} da enem.dev. A unicidade (session_id, source_id) garante
 * contabilização única (FR-006).
 */
@Entity
@Table(name = "answers")
public class Answer {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "source_id", nullable = false, length = 80)
    private String sourceId;

    @Column(nullable = false, length = 1)
    private String chosen;

    @Column(nullable = false)
    private boolean correct;

    @Column(name = "answered_at", nullable = false)
    private Instant answeredAt = Instant.now();

    protected Answer() {
        // JPA
    }

    public Answer(UUID sessionId, String sourceId, String chosen, boolean correct) {
        this.sessionId = sessionId;
        this.sourceId = sourceId;
        this.chosen = chosen;
        this.correct = correct;
    }

    public UUID getId() {
        return id;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public String getSourceId() {
        return sourceId;
    }

    public String getChosen() {
        return chosen;
    }

    public boolean isCorrect() {
        return correct;
    }

    public Instant getAnsweredAt() {
        return answeredAt;
    }
}
