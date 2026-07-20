package com.kaptika.api.badges;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Contadores acumulados PRÓPRIOS da feature 005, derivados só dos eventos da
 * 002 — isolamento total das features 003 (XP) e 004 (streak), desenvolvidas
 * em paralelo. A linha nasce por {@code INSERT ... ON CONFLICT DO NOTHING} e
 * é travada ({@code FOR UPDATE}) durante o processamento de cada evento, o
 * que serializa eventos concorrentes do mesmo estudante.
 */
@Entity
@Table(name = "badge_counters")
public class BadgeCounters {

    @Id
    @Column(name = "profile_id")
    private UUID profileId;

    @Column(name = "correct_total", nullable = false)
    private long correctTotal;

    @Column(name = "sessions_completed", nullable = false)
    private long sessionsCompleted;

    @Column(name = "xp_total", nullable = false)
    private long xpTotal;

    @Column(name = "areas_mask", nullable = false)
    private int areasMask;

    @Column(name = "streak_current", nullable = false)
    private int streakCurrent;

    @Column(name = "streak_best", nullable = false)
    private int streakBest;

    @Column(name = "last_session_date")
    private LocalDate lastSessionDate;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected BadgeCounters() {
        // JPA
    }

    /** Acerto registrado: +1 questão correta e +XP fixo (curva própria da 005). */
    public void applyCorrectAnswer(int xpPerAnswer) {
        correctTotal++;
        xpTotal += xpPerAnswer;
        touch();
    }

    /**
     * Sessão concluída: total, bit da área e streak de dias locais consecutivos.
     *
     * @param areaBit bit da área do ENEM (0 = área desconhecida, ignorada)
     * @param day     dia local (America/Sao_Paulo) da conclusão
     */
    public void applySessionCompleted(int areaBit, LocalDate day) {
        sessionsCompleted++;
        areasMask |= areaBit;
        applyStreak(day);
        touch();
    }

    private void applyStreak(LocalDate day) {
        if (lastSessionDate == null) {
            streakCurrent = 1;
            lastSessionDate = day;
        } else if (day.isEqual(lastSessionDate.plusDays(1))) {
            streakCurrent++;
            lastSessionDate = day;
        } else if (day.isAfter(lastSessionDate)) {
            // lacuna de mais de um dia: recomeça
            streakCurrent = 1;
            lastSessionDate = day;
        }
        // mesmo dia: inalterado; dia anterior (evento fora de ordem): não regride
        streakBest = Math.max(streakBest, streakCurrent);
    }

    private void touch() {
        updatedAt = Instant.now();
    }

    public UUID getProfileId() {
        return profileId;
    }

    public long getCorrectTotal() {
        return correctTotal;
    }

    public long getSessionsCompleted() {
        return sessionsCompleted;
    }

    public long getXpTotal() {
        return xpTotal;
    }

    public int getAreasMask() {
        return areasMask;
    }

    public int getStreakCurrent() {
        return streakCurrent;
    }

    public int getStreakBest() {
        return streakBest;
    }

    public LocalDate getLastSessionDate() {
        return lastSessionDate;
    }
}
