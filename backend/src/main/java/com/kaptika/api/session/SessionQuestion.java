package com.kaptika.api.session;

import com.kaptika.api.session.source.SourcedQuestion;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;

/**
 * Referência posicionada de uma questão dentro de uma sessão (ordem estável
 * para retomada — FR-008). Guarda apenas a REFERÊNCIA (source_id/ano/índice)
 * para reconsultar a enem.dev; nenhum conteúdo/gabarito é persistido.
 */
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

    @Column(name = "source_id", nullable = false, length = 80)
    private String sourceId;

    @Column(name = "origin_year", nullable = false)
    private int originYear;

    @Column(name = "question_index", nullable = false)
    private int questionIndex;

    protected SessionQuestion() {
        // JPA
    }

    public SessionQuestion(UUID sessionId, int position, SourcedQuestion question) {
        this.key = new Key(sessionId, position);
        this.sourceId = question.sourceId();
        this.originYear = question.originYear();
        this.questionIndex = question.index();
    }

    public int getPosition() {
        return key.position();
    }

    public String getSourceId() {
        return sourceId;
    }

    public int getOriginYear() {
        return originYear;
    }

    public int getQuestionIndex() {
        return questionIndex;
    }
}
