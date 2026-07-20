package com.kaptika.api.events;

import java.time.Instant;
import java.util.UUID;

/**
 * Evento de domínio: o estudante acertou uma questão (FR-010 da feature 002).
 * Publicado na transação que persiste a resposta; consumidores (003 XP,
 * 005 Medalhas) devem escutar com AFTER_COMMIT e deduplicar pela
 * {@link #idempotencyKey()}.
 *
 * @param idempotencyKey chave determinística única ("answer:&lt;answerId&gt;")
 */
public record CorrectAnswerRecorded(
        UUID profileId,
        UUID sessionId,
        UUID questionId,
        String area,
        Instant answeredAt,
        String idempotencyKey) {

    public static String keyFor(UUID answerId) {
        return "answer:" + answerId;
    }
}
