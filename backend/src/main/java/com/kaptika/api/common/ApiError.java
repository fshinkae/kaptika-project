package com.kaptika.api.common;

import org.slf4j.MDC;

/**
 * Formato padronizado de erro da API (FR-012): código estável, mensagem
 * segura (sem detalhes internos) e identificador de correlação.
 */
public record ApiError(String code, String message, String correlationId) {

    public static ApiError of(String code, String message) {
        return new ApiError(code, message, currentCorrelationId());
    }

    public static String currentCorrelationId() {
        String id = MDC.get(CorrelationIdFilter.MDC_KEY);
        return id != null ? id : "n/a";
    }
}
