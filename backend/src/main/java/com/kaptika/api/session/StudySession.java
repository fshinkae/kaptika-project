package com.kaptika.api.session;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/** Sessão de estudo (FR-001, FR-009, FR-011). */
@Entity
@Table(name = "study_sessions")
public class StudySession {

    public enum Status { ACTIVE, COMPLETED, EXPIRED }

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "profile_id", nullable = false)
    private UUID profileId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Area area;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Status status = Status.ACTIVE;

    @Column(name = "correct_count", nullable = false)
    private int correctCount;

    @Column(name = "wrong_count", nullable = false)
    private int wrongCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "finished_at")
    private Instant finishedAt;

    protected StudySession() {
        // JPA
    }

    public StudySession(UUID profileId, Area area) {
        this.profileId = profileId;
        this.area = area;
    }

    public void registerAnswer(boolean correct) {
        if (correct) {
            correctCount++;
        } else {
            wrongCount++;
        }
    }

    public void complete(Instant when) {
        this.status = Status.COMPLETED;
        this.finishedAt = when;
    }

    public void expire(Instant when) {
        this.status = Status.EXPIRED;
        this.finishedAt = when;
    }

    public boolean isActive() {
        return status == Status.ACTIVE;
    }

    public UUID getId() {
        return id;
    }

    public UUID getProfileId() {
        return profileId;
    }

    public Area getArea() {
        return area;
    }

    public Status getStatus() {
        return status;
    }

    public int getCorrectCount() {
        return correctCount;
    }

    public int getWrongCount() {
        return wrongCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }
}
