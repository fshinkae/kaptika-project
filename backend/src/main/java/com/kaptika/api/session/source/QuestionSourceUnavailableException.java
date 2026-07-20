package com.kaptika.api.session.source;

/** Fonte externa de questões indisponível ou instável → 503 (FR-012, SC-005). */
public class QuestionSourceUnavailableException extends RuntimeException {

    public QuestionSourceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }

    public QuestionSourceUnavailableException(String message) {
        super(message);
    }
}
