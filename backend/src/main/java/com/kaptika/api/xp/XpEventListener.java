package com.kaptika.api.xp;

import com.kaptika.api.events.CorrectAnswerRecorded;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Consumidor dos eventos de acerto da 002 (FR-001). AFTER_COMMIT: só reage
 * a acertos efetivamente persistidos; a falha aqui não afeta a resposta da
 * sessão. A 002 não emite evento para erro, então nenhum XP é concedido a
 * erros por construção (FR-002, SC-003).
 */
@Component
public class XpEventListener {

    private static final Logger log = LoggerFactory.getLogger(XpEventListener.class);

    private final XpService xpService;

    public XpEventListener(XpService xpService) {
        this.xpService = xpService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCorrectAnswer(CorrectAnswerRecorded event) {
        try {
            xpService.grantForCorrectAnswer(event);
        } catch (RuntimeException e) {
            // Sem broker/retry no MVP: loga com a chave determinística para
            // permitir reprocesso administrativo seguro (dedupe garante).
            log.error("Falha ao conceder XP [idempotencyKey={}]", event.idempotencyKey(), e);
        }
    }
}
