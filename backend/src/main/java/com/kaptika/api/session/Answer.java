package com.kaptika.api.session;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Resposta confirmada de uma questão da sessão. A unicidade
 * (session_id, question_id) no banco garante contabilização única (FR-006).
 */
@Entity
@Table(name = "answers")
public class Answer {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(nullable = false, length = 1)
    private String chosen;

    @Column(nullable = false)
    private boolean correct;

    @Column(name = "answered_at", nullable = false)
    private Instant answeredAt = Instant.now();

    protected Answer() {
        // JPA
    }

    public Answer(UUID sessionId, UUID questionId, String chosen, boolean correct) {
        this.sessionId = sessionId;
        this.questionId = questionId;
        this.chosen = chosen;
        this.correct = correct;
    }

    public UUID getId() {
        return id;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public UUID getQuestionId() {
        return questionId;
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
