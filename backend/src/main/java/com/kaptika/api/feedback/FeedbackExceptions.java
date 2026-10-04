package com.kaptika.api.feedback;

/** Exceções da análise de IA da sessão (008). */
public final class FeedbackExceptions {

    private FeedbackExceptions() {
    }

    /** Provedor fora, sem chave ou timeout → 503 (FR-008). */
    public static class AiUnavailableException extends RuntimeException {
        public AiUnavailableException() {
            super("Análise indisponível no momento.");
        }
    }

    /** Limite diário de análises do estudante excedido → 429 (FR-007). */
    public static class FeedbackRateLimitedException extends RuntimeException {
        public FeedbackRateLimitedException() {
            super("Limite diário de análises atingido. Tente amanhã.");
        }
    }

    /** Análise pedida para sessão ainda ativa → 409 (FR-003). */
    public static class SessionNotFinishedException extends RuntimeException {
        public SessionNotFinishedException() {
            super("A sessão ainda está em andamento.");
        }
    }
}
