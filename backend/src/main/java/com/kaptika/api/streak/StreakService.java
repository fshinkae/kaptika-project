package com.kaptika.api.streak;

import com.kaptika.api.events.SessionCompleted;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Autoridade sobre a ofensiva (FR-001..009): consome os eventos da 002 e
 * expõe o estado consolidado. O "dia" é sempre o dia local do servidor no
 * fuso configurado — o relógio do cliente nunca participa (SC-004).
 */
@Service
public class StreakService {

    private static final Logger log = LoggerFactory.getLogger(StreakService.class);

    private final StreakRepository streaks;
    private final ActivityDayRepository activityDays;
    private final StreakEventDedupeRepository processedEvents;
    private final StreakReconciliationService reconciliation;

    public StreakService(StreakRepository streaks, ActivityDayRepository activityDays,
            StreakEventDedupeRepository processedEvents,
            StreakReconciliationService reconciliation) {
        this.streaks = streaks;
        this.activityDays = activityDays;
        this.processedEvents = processedEvents;
        this.reconciliation = reconciliation;
    }

    /**
     * Consome uma conclusão de sessão em transação própria (o commit da 002
     * já aconteceu): dedupe pelo evento (FR-009), meta no máximo 1×/dia pela
     * chave (perfil, dia local) (FR-003/SC-001), reconciliação de dias
     * perdidos antes do incremento e atualização de recorde/freeze bônus.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registerCompletion(SessionCompleted event) {
        if (event.correctCount() + event.wrongCount() <= 0) {
            return; // meta exige ao menos 1 questão respondida (spec, Edge Cases)
        }
        if (processedEvents.existsById(event.idempotencyKey())) {
            return; // evento já consumido (FR-009)
        }
        try {
            processedEvents.saveAndFlush(
                    new StreakEventDedupe(event.idempotencyKey(), event.profileId()));
        } catch (DataIntegrityViolationException e) {
            return; // corrida de reentrega do mesmo evento
        }

        LocalDate today = reconciliation.today();
        UUID profileId = event.profileId();

        Streak streak = streaks.findForUpdate(profileId)
                .orElseGet(() -> streaks.saveAndFlush(new Streak(profileId)));

        if (activityDays.existsById(new ActivityDay.Key(profileId, today))) {
            return; // meta de hoje já cumprida por outra sessão — sem novo incremento
        }
        activityDays.save(new ActivityDay(profileId, today));

        reconciliation.reconcile(streak, today);
        streak.registerMetDay(today);
        streaks.save(streak);
        log.debug("Ofensiva atualizada: profile={} current={} record={}", profileId,
                streak.getCurrentStreak(), streak.getRecordStreak());
    }

    /**
     * Estado para o GET /me/streak (FR-005/007/011): reconcilia sob demanda
     * (detecção lazy de quebra — FR-006), reporta a quebra ocorrida desde o
     * último acesso exatamente uma vez e a marca como reconhecida.
     */
    @Transactional
    public StreakResponse getState(UUID profileId) {
        Optional<Streak> maybe = streaks.findForUpdate(profileId);
        if (maybe.isEmpty()) {
            // estudante sem atividade: estado inicial, sem criar linha
            return new StreakResponse(0, 0, Streak.INITIAL_FREEZES, false, false, null);
        }
        Streak streak = maybe.get();
        LocalDate today = reconciliation.today();
        reconciliation.reconcile(streak, today);

        boolean brokenSinceLastAccess = !streak.isBreakAcknowledged();
        Instant brokenAt = brokenSinceLastAccess ? streak.getBrokenAt() : null;
        boolean metToday = today.equals(streak.getLastMetDate());

        streak.acknowledgeBreak();
        streaks.save(streak);

        return new StreakResponse(streak.getCurrentStreak(), streak.getRecordStreak(),
                streak.getFreezes(), metToday, brokenSinceLastAccess, brokenAt);
    }
}
