package com.kaptika.api.streak;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Dia de atividade com meta cumprida (FR-010). A PK composta
 * (profile_id, local_date) é a chave natural do "incrementa no máximo
 * uma vez por dia" (FR-003/SC-001).
 */
@Entity
@Table(name = "activity_days")
public class ActivityDay {

    @Embeddable
    public record Key(
            @Column(name = "profile_id") UUID profileId,
            @Column(name = "local_date") LocalDate localDate) implements Serializable {
    }

    @EmbeddedId
    private Key key;

    @Column(name = "met", nullable = false)
    private boolean met;

    protected ActivityDay() {
        // JPA
    }

    public ActivityDay(UUID profileId, LocalDate localDate) {
        this.key = new Key(profileId, localDate);
        this.met = true;
    }

    public Key getKey() {
        return key;
    }

    public boolean isMet() {
        return met;
    }
}
