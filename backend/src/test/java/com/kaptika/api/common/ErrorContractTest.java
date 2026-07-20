package com.kaptika.api.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * Contrato de erro padronizado (FR-012): todo erro tem code, message e
 * correlationId, sem vazar detalhes internos (SC-006).
 */
class ErrorContractTest extends IntegrationTest {

    @Test
    @DisplayName("corpo JSON malformado → 400 malformed_request")
    void malformedBodyReturns400() throws Exception {
        mockMvc.perform(patch("/me")
                        .header("Authorization", "Bearer " + TestTokens.valid(UUID.randomUUID()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{displayName: sem-aspas"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("malformed_request"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    @DisplayName("rota inexistente autenticada → 404 not_found")
    void unknownRouteReturns404() throws Exception {
        mockMvc.perform(get("/rota-que-nao-existe")
                        .header("Authorization", "Bearer " + TestTokens.valid(UUID.randomUUID())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("not_found"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    @DisplayName("método não suportado → 405 method_not_allowed")
    void unsupportedMethodReturns405() throws Exception {
        mockMvc.perform(post("/me")
                        .header("Authorization", "Bearer " + TestTokens.valid(UUID.randomUUID())))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("method_not_allowed"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }
}
