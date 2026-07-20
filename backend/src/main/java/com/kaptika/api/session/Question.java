package com.kaptika.api.session;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Questão normalizada da enem.dev, cacheada localmente (FR-003).
 * O gabarito (correctAlternative) é de uso interno e nunca sai em DTOs de
 * sessão (FR-004).
 */
@Entity
@Table(name = "questions")
public class Question {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "source_id", nullable = false, unique = true, length = 80)
    private String sourceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Area area;

    @Column(nullable = false)
    private String statement;

    private String context;

    @Column(name = "correct_alternative", nullable = false, length = 1)
    private String correctAlternative;

    @Column(name = "origin_year", nullable = false)
    private int originYear;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "question_alternatives", joinColumns = @JoinColumn(name = "question_id"))
    @OrderBy("letter")
    private List<Alternative> alternatives;

    protected Question() {
        // JPA
    }

    public Question(String sourceId, Area area, String statement, String context,
            String correctAlternative, int originYear, List<Alternative> alternatives) {
        this.sourceId = sourceId;
        this.area = area;
        this.statement = statement;
        this.context = context;
        this.correctAlternative = correctAlternative;
        this.originYear = originYear;
        this.alternatives = alternatives;
    }

    @Embeddable
    public record Alternative(
            @Column(nullable = false, length = 1) String letter,
            @Column(nullable = false) String text) {
    }

    public UUID getId() {
        return id;
    }

    public String getSourceId() {
        return sourceId;
    }

    public Area getArea() {
        return area;
    }

    public String getStatement() {
        return statement;
    }

    public String getContext() {
        return context;
    }

    public String getCorrectAlternative() {
        return correctAlternative;
    }

    public int getOriginYear() {
        return originYear;
    }

    public List<Alternative> getAlternatives() {
        return alternatives;
    }
}
