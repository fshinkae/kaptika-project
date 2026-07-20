package com.kaptika.api.xp;

import com.kaptika.api.events.CorrectAnswerRecorded;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Caminho de escrita do XP (FR-001, FR-003, FR-004): registra a concessão
 * com dedupe no banco e, somente quando ela entra, incrementa o saldo —
 * tudo numa transação própria (REQUIRES_NEW), pois o processamento ocorre
 * após o commit da 002. Regra fixada na spec: 10 XP por acerto.
 */
@Service
public class XpService {

    public static final int XP_PER_CORRECT_ANSWER = 10;

    private final XpGrantRepository grants;
    private final XpBalanceRepository balances;

    public XpService(XpGrantRepository grants, XpBalanceRepository balances) {
        this.grants = grants;
        this.balances = balances;
    }

    /**
     * Concede o XP do acerto exatamente uma vez (SC-002): a chave única de
     * idempotência decide no banco; concessão e incremento do saldo saem na
     * mesma transação, mantendo saldo = soma das concessões (SC-001).
     *
     * @return true se o XP foi concedido agora; false se o evento já havia
     *         sido processado (reprocessamento seguro).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean grantForCorrectAnswer(CorrectAnswerRecorded event) {
        int inserted = grants.insertIfAbsent(event.profileId(), XP_PER_CORRECT_ANSWER,
                sourceOf(event.sessionId(), event.questionId()), event.answeredAt(),
                event.idempotencyKey());
        if (inserted == 0) {
            return false;
        }
        balances.addXp(event.profileId(), XP_PER_CORRECT_ANSWER);
        return true;
    }

    private static String sourceOf(UUID sessionId, UUID questionId) {
        return "session:" + sessionId + ":question:" + questionId;
    }
}
