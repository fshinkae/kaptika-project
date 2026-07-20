package com.kaptika.api.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Atribui um identificador de correlação a cada requisição (FR-012).
 * Aceita um X-Correlation-Id vindo do cliente (limitado a caracteres seguros)
 * ou gera um UUID. O id fica no MDC para logs e volta no header da resposta.
 * Roda antes da cadeia de segurança para cobrir também as respostas 401.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String MDC_KEY = "correlationId";
    public static final String HEADER = "X-Correlation-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String incoming = request.getHeader(HEADER);
        String correlationId = isSafe(incoming) ? incoming : UUID.randomUUID().toString();
        MDC.put(MDC_KEY, correlationId);
        response.setHeader(HEADER, correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    private boolean isSafe(String value) {
        return value != null && !value.isBlank() && value.length() <= 64
                && value.matches("[A-Za-z0-9_-]+");
    }
}
