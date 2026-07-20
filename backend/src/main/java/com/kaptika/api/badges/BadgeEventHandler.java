package com.kaptika.api.badges;

import com.kaptika.api.events.CorrectAnswerRecorded;
import com.kaptika.api.events.SessionCompleted;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Ouvintes dos eventos de domínio da 002 (FR-001). AFTER_COMMIT: só reagem a
 * escritas confirmadas; o processamento roda em transação própria
 * (REQUIRES_NEW no serviço) e falhas aqui jamais afetam a sessão de origem —
 * a idempotência por chave determinística permite reprocesso.
 */
@Component
class BadgeEventHandler {

    private final BadgeService badgeService;

    BadgeEventHandler(BadgeService badgeService) {
        this.badgeService = badgeService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(CorrectAnswerRecorded event) {
        badgeService.onCorrectAnswer(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(SessionCompleted event) {
        badgeService.onSessionCompleted(event);
    }
}
