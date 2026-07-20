package com.kaptika.api.events;

import java.time.Instant;
import java.util.UUID;

/**
 * Evento de domínio: sessão de estudo concluída (FR-010 da feature 002).
 * Publicado na transação do fechamento; consumidores (004 Ofensiva,
 * 005 Medalhas) devem escutar com AFTER_COMMIT e deduplicar pela
 * {@link #idempotencyKey()}.
 *
 * @param idempotencyKey chave determinística única ("session:&lt;sessionId&gt;")
 */
public record SessionCompleted(
        UUID profileId,
        UUID sessionId,
        String area,
        int correctCount,
        int wrongCount,
        int totalQuestions,
        Instant completedAt,
        String idempotencyKey) {

    public static String keyFor(UUID sessionId) {
        return "session:" + sessionId;
    }
}
