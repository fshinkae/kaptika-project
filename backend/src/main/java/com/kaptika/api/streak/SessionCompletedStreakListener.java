package com.kaptika.api.streak;

import com.kaptika.api.events.SessionCompleted;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Ponte entre a feature 002 e a ofensiva (FR-001): consome SessionCompleted
 * somente após o commit da sessão; o processamento roda em transação própria
 * (REQUIRES_NEW no serviço). Falha aqui não afeta a sessão já persistida —
 * o dedupe determinístico permite reprocesso e a reconciliação converge.
 */
@Component
public class SessionCompletedStreakListener {

    private static final Logger log = LoggerFactory.getLogger(SessionCompletedStreakListener.class);

    private final StreakService streakService;

    public SessionCompletedStreakListener(StreakService streakService) {
        this.streakService = streakService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(SessionCompleted event) {
        try {
            streakService.registerCompletion(event);
        } catch (RuntimeException e) {
            log.error("Falha ao processar {} para a ofensiva", event.idempotencyKey(), e);
        }
    }
}
