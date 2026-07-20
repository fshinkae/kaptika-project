package com.kaptika.api.streak;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regra única de detecção de quebra (FR-004/FR-006): aplicada tanto sob
 * demanda (GET /me/streak) quanto pela verificação temporal periódica —
 * os dois caminhos convergem para o mesmo estado (SC-002).
 */
@Service
public class StreakReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(StreakReconciliationService.class);

    private final StreakRepository streaks;
    private final StreakProperties properties;
    private final Clock clock;

    public StreakReconciliationService(StreakRepository streaks, StreakProperties properties,
            Clock clock) {
        this.streaks = streaks;
        this.properties = properties;
        this.clock = clock;
    }

    /** Dia local corrente segundo o relógio do servidor (FR-002/SC-004). */
    public LocalDate today() {
        return Instant.now(clock).atZone(properties.zoneId()).toLocalDate();
    }

    /**
     * Varredura periódica (job diário): quebra ou preserva via freeze todas
     * as ofensivas ativas com meta vencida. Devolve quantas foram ajustadas.
     */
    @Transactional
    public int reconcileAll() {
        LocalDate today = today();
        List<Streak> candidates = streaks.findExpiredCandidates(today.minusDays(1));
        int changed = 0;
        for (Streak streak : candidates) {
            if (reconcile(streak, today)) {
                streaks.save(streak);
                changed++;
            }
        }
        if (changed > 0) {
            log.info("Reconciliação de ofensivas: {} de {} candidatas ajustadas", changed,
                    candidates.size());
        }
        return changed;
    }

    /**
     * Aplica a regra de dias perdidos a uma ofensiva já carregada (e travada
     * pelo chamador quando necessário):
     * consome 1 freeze por dia perdido enquanto houver estoque — preservando
     * sem incrementar (FR-008) — ou quebra (zera) registrando o momento em
     * que o primeiro dia sem meta se completou (FR-004/FR-007). O recorde
     * nunca é alterado aqui (SC-003).
     *
     * @return true se o estado mudou (freeze consumido ou quebra)
     */
    public boolean reconcile(Streak streak, LocalDate today) {
        if (streak.getCurrentStreak() == 0 || streak.getLastMetDate() == null) {
            return false; // nada a preservar ou quebrar
        }
        long missed = ChronoUnit.DAYS.between(streak.getLastMetDate(), today) - 1;
        if (missed <= 0) {
            return false; // meta cumprida hoje ou ontem — ofensiva viva
        }
        if (streak.getFreezes() >= missed) {
            streak.coverMissedDaysWithFreezes((int) missed);
            return true;
        }
        // Sem estoque para cobrir: quebra no instante em que o primeiro dia
        // inteiro sem meta se completou (meia-noite local após o dia perdido).
        Instant brokenAt = streak.getLastMetDate().plusDays(2)
                .atStartOfDay(properties.zoneId()).toInstant();
        streak.breakStreak(brokenAt);
        return true;
    }
}
