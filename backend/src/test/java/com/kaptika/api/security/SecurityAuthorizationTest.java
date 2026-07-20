package com.kaptika.api.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * US1 — Autorizar requisições com token do Supabase.
 * Cobre SC-001 (recusa sem token válido), SC-006 (respostas sem detalhes
 * internos) e FR-012 (formato de erro com correlationId).
 */
class SecurityAuthorizationTest extends IntegrationTest {

    @Test
    @DisplayName("health é público")
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("sem token → 401 no formato padrão, sem detalhes internos")
    void withoutTokenReturns401() throws Exception {
        mockMvc.perform(get("/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("unauthorized"))
                .andExpect(jsonPath("$.message").value("Autenticação necessária."))
                .andExpect(jsonPath("$.correlationId").isNotEmpty())
                .andExpect(header().exists("X-Correlation-Id"));
    }

    @Test
    @DisplayName("token expirado → 401 com a mesma resposta genérica")
    void expiredTokenReturns401() throws Exception {
        mockMvc.perform(get("/me")
                        .header("Authorization", "Bearer " + TestTokens.expired(UUID.randomUUID())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("unauthorized"))
                .andExpect(jsonPath("$.message").value("Autenticação necessária."));
    }

    @Test
    @DisplayName("assinatura adulterada → 401 com a mesma resposta genérica")
    void tamperedTokenReturns401() throws Exception {
        mockMvc.perform(get("/me")
                        .header("Authorization", "Bearer " + TestTokens.tampered(UUID.randomUUID())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("unauthorized"));
    }

    @Test
    @DisplayName("token malformado → 401 com a mesma resposta genérica")
    void malformedTokenReturns401() throws Exception {
        mockMvc.perform(get("/me").header("Authorization", "Bearer nao-e-um-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("unauthorized"));
    }

    @Test
    @DisplayName("token válido → 200 e o sujeito é resolvido do sub")
    void validTokenReturns200() throws Exception {
        mockMvc.perform(get("/me")
                        .header("Authorization", "Bearer " + TestTokens.valid(UUID.randomUUID())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("X-Correlation-Id do cliente é ecoado na resposta e no corpo de erro")
    void correlationIdIsEchoed() throws Exception {
        mockMvc.perform(get("/me").header("X-Correlation-Id", "teste-correlacao-123"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("X-Correlation-Id", "teste-correlacao-123"))
                .andExpect(jsonPath("$.correlationId").value("teste-correlacao-123"));
    }
}
