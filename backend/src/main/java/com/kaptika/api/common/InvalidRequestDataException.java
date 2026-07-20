package com.kaptika.api.common;

/** Violação de regra de validação detectada em qualquer camada de serviço → 422. */
public class InvalidRequestDataException extends RuntimeException {

    public InvalidRequestDataException(String message) {
        super(message);
    }
}
