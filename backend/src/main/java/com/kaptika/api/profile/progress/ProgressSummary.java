package com.kaptika.api.profile.progress;

/** Agregados de progresso exibidos no perfil (FR-005). */
public record ProgressSummary(long xpTotal, int level, long xpToNextLevel,
        int streakCurrent, int badgesCount) {

    /** Estado inicial de um estudante sem progresso (nível 1; próximo nível aos 100 XP). */
    public static ProgressSummary empty() {
        return new ProgressSummary(0, 1, 100, 0, 0);
    }
}
