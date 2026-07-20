package com.kaptika.api.session;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;

/** Questão posicionada dentro de uma sessão (ordem estável para retomada — FR-008). */
@Entity
@Table(name = "session_questions")
public class SessionQuestion {

    @Embeddable
    public record Key(
            @Column(name = "session_id") UUID sessionId,
            @Column(name = "position") int position) implements Serializable {
    }

    @EmbeddedId
    private Key key;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    protected SessionQuestion() {
        // JPA
    }

    public SessionQuestion(UUID sessionId, int position, Question question) {
        this.key = new Key(sessionId, position);
        this.question = question;
    }

    public int getPosition() {
        return key.position();
    }

    public Question getQuestion() {
        return question;
    }
}
