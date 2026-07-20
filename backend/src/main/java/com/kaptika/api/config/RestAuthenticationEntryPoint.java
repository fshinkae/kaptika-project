package com.kaptika.api.config;

import com.kaptika.api.common.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * 401 no formato de erro padrão, sem revelar o motivo exato da falha
 * (token ausente, expirado ou adulterado recebem a mesma resposta — FR-003, SC-006).
 * JSON gerado manualmente: o correlationId é sanitizado pelo filtro
 * (alfanumérico/uuid), então não há risco de escaping.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("""
                {"code":"unauthorized","message":"Autenticação necessária.","correlationId":"%s"}"""
                .formatted(ApiError.currentCorrelationId()));
    }
}
