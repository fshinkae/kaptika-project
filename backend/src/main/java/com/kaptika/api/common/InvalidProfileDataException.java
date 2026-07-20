package com.kaptika.api.common;

/** Violação de regra de validação detectada na camada de serviço → 422. */
public class InvalidProfileDataException extends RuntimeException {

    public InvalidProfileDataException(String message) {
        super(message);
    }
}
