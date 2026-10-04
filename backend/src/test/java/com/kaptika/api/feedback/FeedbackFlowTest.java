package com.kaptika.api.feedback;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.feedback.FeedbackExceptions.AiUnavailableException;
import com.kaptika.api.session.SessionTestSupport;
import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

/** POST /sessions/{id}/feedback (SC-003). IA substituída por stub — nunca rede. */
@Import({SessionTestSupport.class, FeedbackFlowTest.AiStubConfig.class})
@TestPropertySource(properties = "kaptika.ai.daily-limit=2")
class FeedbackFlowTest extends IntegrationTest {

    private static final Pattern SESSION_ID = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"");
    private static final Pattern QUESTION_ID = Pattern.compile("\"questionId\":\"([^\"]+)\"");

    @Autowired
    private AiStub ai;

    @BeforeEach
    void reset() {
        ai.prompts.clear();
        ai.failing = false;
    }

    @Test
    @DisplayName("sessão encerrada → 200 com texto; repetir reaproveita sem nova chamada à IA")
    void analyzesFinishedSession() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        String sessionId = finishedSession(token, "B");

        feedback(token, sessionId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value(AiStub.TEXT));
        feedback(token, sessionId).andExpect(status().isOk());

        assertThat(ai.prompts).hasSize(1);
        String prompt = ai.prompts.get(0);
        assertThat(prompt)
                .contains("Sessão de Linguagens: 0 certas de 5 (respondidas 1). Ordem: E - - - -.")
                .contains("Linguagens 0/1")
                .doesNotContain("Enunciado", "Distrator", sessionId);
    }

    @Test
    @DisplayName("sessão ativa → 409; sessão de outro estudante → 404; sem token → 401")
    void guardsOwnershipAndState() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        String active = createSession(token);

        feedback(token, active)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("conflict"));
        feedback(TestTokens.valid(UUID.randomUUID()), active)
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/sessions/" + active + "/feedback"))
                .andExpect(status().isUnauthorized());
        assertThat(ai.prompts).isEmpty();
    }

    @Test
    @DisplayName("IA indisponível → 503 ai_unavailable, sem consumir a cota")
    void aiFailureIs503() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        String sessionId = finishedSession(token, "A");
        ai.failing = true;

        for (int i = 0; i < 3; i++) {
            feedback(token, sessionId)
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.code").value("ai_unavailable"))
                    .andExpect(jsonPath("$.correlationId").isNotEmpty());
        }
        ai.failing = false;
        feedback(token, sessionId).andExpect(status().isOk());
    }

    @Test
    @DisplayName("acima do limite diário → 429 rate_limited")
    void dailyLimitIs429() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        feedback(token, finishedSession(token, "A")).andExpect(status().isOk());
        feedback(token, finishedSession(token, "A")).andExpect(status().isOk());

        feedback(token, finishedSession(token, "A"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("rate_limited"));
        assertThat(ai.prompts).hasSize(2);
    }

    // ---------- helpers ----------

    private org.springframework.test.web.servlet.ResultActions feedback(String token,
            String sessionId) throws Exception {
        return mockMvc.perform(post("/sessions/" + sessionId + "/feedback")
                .header("Authorization", "Bearer " + token));
    }

    /** Cria sessão de Linguagens, responde a 1ª questão com a letra dada e encerra. */
    private String finishedSession(String token, String alternative) throws Exception {
        String json = createJson(token);
        String sessionId = firstMatch(SESSION_ID, json);
        mockMvc.perform(post("/sessions/" + sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + firstMatch(QUESTION_ID, json)
                                + "\",\"alternative\":\"" + alternative + "\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/sessions/" + sessionId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        return sessionId;
    }

    private String createSession(String token) throws Exception {
        return firstMatch(SESSION_ID, createJson(token));
    }

    private String createJson(String token) throws Exception {
        return mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"linguagens\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    private static String firstMatch(Pattern pattern, String json) {
        Matcher matcher = pattern.matcher(json);
        assertThat(matcher.find()).as("padrão %s presente no JSON", pattern).isTrue();
        return matcher.group(1);
    }

    /** IA determinística que registra os prompts recebidos e pode simular falha. */
    static class AiStub implements AiFeedbackClient {

        static final String TEXT = "Bom começo. Revise interpretação de texto.";

        final List<String> prompts = new CopyOnWriteArrayList<>();
        volatile boolean failing;

        @Override
        public String complete(String system, String user) {
            if (failing) {
                throw new AiUnavailableException();
            }
            prompts.add(user);
            return TEXT;
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class AiStubConfig {

        @Bean
        @Primary
        AiStub aiStub() {
            return new AiStub();
        }
    }
}
