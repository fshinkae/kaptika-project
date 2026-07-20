package com.kaptika.api.streak;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Estado agregado da ofensiva de um estudante (FR-005/FR-008/FR-010).
 * As transições de estado ficam encapsuladas aqui; o serviço decide
 * QUANDO aplicá-las a partir do dia local do servidor.
 */
@Entity
@Table(name = "streaks")
public class Streak {

    /** FR-008: estoque inicial e teto de congelamentos. */
    public static final int INITIAL_FREEZES = 2;
    public static final int MAX_FREEZES = 2;
    private static final int FREEZE_BONUS_INTERVAL = 7;

    @Id
    @Column(name = "profile_id")
    private UUID profileId;

    @Column(name = "current_streak", nullable = false)
    private int currentStreak;

    @Column(name = "record_streak", nullable = false)
    private int recordStreak;

    @Column(name = "last_met_date")
    private LocalDate lastMetDate;

    @Column(name = "freezes", nullable = false)
    private int freezes;

    @Column(name = "broken_at")
    private Instant brokenAt;

    @Column(name = "break_acknowledged", nullable = false)
    private boolean breakAcknowledged;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Streak() {
        // JPA
    }

    public Streak(UUID profileId) {
        this.profileId = profileId;
        this.currentStreak = 0;
        this.recordStreak = 0;
        this.freezes = INITIAL_FREEZES;
        this.breakAcknowledged = true;
        this.updatedAt = Instant.now();
    }

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    /**
     * Primeiro cumprimento da meta no dia: incrementa, atualiza o recorde
     * (que nunca diminui — FR-005) e concede o freeze bônus nos múltiplos
     * de 7, respeitando o teto (FR-008).
     */
    public void registerMetDay(LocalDate today) {
        currentStreak++;
        recordStreak = Math.max(recordStreak, currentStreak);
        lastMetDate = today;
        if (currentStreak % FREEZE_BONUS_INTERVAL == 0) {
            freezes = Math.min(MAX_FREEZES, freezes + 1);
        }
    }

    /**
     * Consome 1 freeze por dia perdido, "cobrindo" os dias e preservando a
     * ofensiva sem incrementá-la (FR-008). Pré-condição: freezes >= dias.
     */
    public void coverMissedDaysWithFreezes(int missedDays) {
        freezes -= missedDays;
        lastMetDate = lastMetDate.plusDays(missedDays);
    }

    /** Quebra (zera) a ofensiva preservando recorde e estoque de freezes (FR-004/FR-007). */
    public void breakStreak(Instant at) {
        currentStreak = 0;
        brokenAt = at;
        breakAcknowledged = false;
    }

    /** A quebra foi reportada ao estudante no GET (FR-007). */
    public void acknowledgeBreak() {
        breakAcknowledged = true;
    }

    public UUID getProfileId() {
        return profileId;
    }

    public int getCurrentStreak() {
        return currentStreak;
    }

    public int getRecordStreak() {
        return recordStreak;
    }

    public LocalDate getLastMetDate() {
        return lastMetDate;
    }

    public int getFreezes() {
        return freezes;
    }

    public Instant getBrokenAt() {
        return brokenAt;
    }

    public boolean isBreakAcknowledged() {
        return breakAcknowledged;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
