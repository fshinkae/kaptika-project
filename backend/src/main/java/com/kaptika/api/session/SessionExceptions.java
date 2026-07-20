package com.kaptika.api.session;

/** Exceções de negócio do ciclo de vida da sessão. */
public final class SessionExceptions {

    private SessionExceptions() {
    }

    /** Sessão inexistente ou de outro estudante → 404 sem vazar existência (FR-007 da 001). */
    public static class SessionNotFoundException extends RuntimeException {
        public SessionNotFoundException() {
            super("Sessão não encontrada.");
        }
    }

    /** Tentativa de alterar resposta confirmada ou responder fora da sessão → 409 (FR-007). */
    public static class AnswerConflictException extends RuntimeException {
        public AnswerConflictException(String message) {
            super(message);
        }
    }

    /** Operação sobre sessão já encerrada → 409. */
    public static class SessionClosedException extends RuntimeException {
        public SessionClosedException() {
            super("A sessão já foi encerrada.");
        }
    }
}
