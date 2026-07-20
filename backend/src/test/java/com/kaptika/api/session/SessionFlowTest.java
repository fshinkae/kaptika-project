package com.kaptika.api.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.session.SessionTestSupport.EventProbe;
import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * US1 — ciclo de vida e correção (SC-001, SC-006).
 * US2 — idempotência, retomada e integridade (SC-002, SC-003).
 */
@Import(SessionTestSupport.class)
class SessionFlowTest extends IntegrationTest {

    private static final Pattern SESSION_ID = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"");
    private static final Pattern QUESTION_ID =
            Pattern.compile("\"questionId\":\"([0-9a-f-]{36})\"");

    @Autowired
    private EventProbe probe;

    @BeforeEach
    void resetProbe() {
        probe.clear();
    }

    @Test
    @DisplayName("ciclo completo: criar (máx. 20, sem gabarito) → responder → encerrar com resumo")
    void fullLifecycle() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());

        MvcResult created = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"linguagens\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.totalQuestions").value(20)) // SC-001
                .andExpect(jsonPath("$.answeredCount").value(0))
                .andExpect(jsonPath("$.nextQuestionId").isNotEmpty())
                .andReturn();

        String createdJson = created.getResponse().getContentAsString();
        // SC-006/FR-004: gabarito jamais aparece no payload da sessão
        assertThat(createdJson).doesNotContain("correctAlternative");

        String sessionId = firstMatch(SESSION_ID, createdJson);
        String q1 = firstMatch(QUESTION_ID, createdJson);

        // resposta errada (gabarito de teste é sempre A)
        mockMvc.perform(post("/sessions/" + sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + q1 + "\",\"alternative\":\"B\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false))
                .andExpect(jsonPath("$.correctAlternative").value("A"))
                .andExpect(jsonPath("$.answeredCount").value(1));

        // estado para retomada (FR-008): próxima pendente difere da respondida
        MvcResult state = mockMvc.perform(get("/sessions/" + sessionId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answeredCount").value(1))
                .andExpect(jsonPath("$.nextQuestionId").isNotEmpty())
                .andReturn();
        assertThat(state.getResponse().getContentAsString()).doesNotContain("correctAlternative");
        String q2 = firstMatch(Pattern.compile("\"nextQuestionId\":\"([0-9a-f-]{36})\""),
                state.getResponse().getContentAsString());
        assertThat(q2).isNotEqualTo(q1);

        // resposta correta → evento emitido
        mockMvc.perform(post("/sessions/" + sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + q2 + "\",\"alternative\":\"a\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
        assertThat(probe.correctAnswers).hasSize(1);

        // encerramento a pedido com resumo (FR-009)
        mockMvc.perform(post("/sessions/" + sessionId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.correctCount").value(1))
                .andExpect(jsonPath("$.wrongCount").value(1))
                .andExpect(jsonPath("$.totalQuestions").value(20))
                .andExpect(jsonPath("$.answeredCount").value(2));
        assertThat(probe.completedSessions).hasSize(1);

        // finish repetido: mesmo resumo, sem novo evento (idempotente)
        mockMvc.perform(post("/sessions/" + sessionId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
        assertThat(probe.completedSessions).hasSize(1); // SC-003
    }

    @Test
    @DisplayName("reenvio idempotente; alteração recusada (409); sem evento duplicado")
    void answerIdempotency() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        Created c = createSession(token, "ciencias-natureza");

        String body = "{\"questionId\":\"" + c.firstQuestionId + "\",\"alternative\":\"A\"}";
        mockMvc.perform(post("/sessions/" + c.sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));

        // mesmo envio → mesmo resultado, contagem inalterada (SC-002)
        mockMvc.perform(post("/sessions/" + c.sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answeredCount").value(1));
        assertThat(probe.correctAnswers).hasSize(1); // SC-003

        // tentar mudar a alternativa → 409 (FR-007)
        mockMvc.perform(post("/sessions/" + c.sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + c.firstQuestionId + "\",\"alternative\":\"B\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("conflict"));
    }

    @Test
    @DisplayName("uma sessão ativa por estudante: POST repetido devolve a mesma (200)")
    void singleActiveSession() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        Created first = createSession(token, "linguagens");

        MvcResult again = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"linguagens\"}"))
                .andExpect(status().isOk()) // não cria outra (FR-011)
                .andReturn();
        assertThat(firstMatch(SESSION_ID, again.getResponse().getContentAsString()))
                .isEqualTo(first.sessionId);
    }

    @Test
    @DisplayName("acervo insuficiente: sessão conduzida com as questões disponíveis (FR-013)")
    void insufficientStock() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"matematica\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalQuestions").value(3));
    }

    @Test
    @DisplayName("sessão de outro estudante → 404 sem vazar existência")
    void otherStudentsSessionIs404() throws Exception {
        Created mine = createSession(TestTokens.valid(UUID.randomUUID()), "linguagens");
        String other = TestTokens.valid(UUID.randomUUID());
        mockMvc.perform(get("/sessions/" + mine.sessionId)
                        .header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("not_found"));
    }

    @Test
    @DisplayName("responder questão de fora da sessão → 409; sessão encerrada → 409; área inválida → 422")
    void answerValidationRules() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        Created c = createSession(token, "ciencias-humanas");

        mockMvc.perform(post("/sessions/" + c.sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + UUID.randomUUID() + "\",\"alternative\":\"A\"}"))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/sessions/" + c.sessionId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(post("/sessions/" + c.sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + c.firstQuestionId + "\",\"alternative\":\"A\"}"))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"astrologia\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("validation_error"));
    }

    @Test
    @DisplayName("não-repetição: questão acertada não volta na próxima sessão (30 dias)")
    void nonRepetitionOfCorrectAnswers() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        // acervo de ciencias-humanas: 21 questões; sessão 1 usa 20
        Created s1 = createSession(token, "ciencias-humanas");
        mockMvc.perform(post("/sessions/" + s1.sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + s1.firstQuestionId + "\",\"alternative\":\"A\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/sessions/" + s1.sessionId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // sessão 2: a questão acertada não deve reaparecer
        MvcResult s2 = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"ciencias-humanas\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        assertThat(s2.getResponse().getContentAsString()).doesNotContain(s1.firstQuestionId);
    }

    // ---------- helpers ----------

    private record Created(String sessionId, String firstQuestionId) {
    }

    private Created createSession(String token, String area) throws Exception {
        MvcResult result = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"" + area + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String json = result.getResponse().getContentAsString();
        return new Created(firstMatch(SESSION_ID, json), firstMatch(QUESTION_ID, json));
    }

    private static String firstMatch(Pattern pattern, String json) {
        Matcher matcher = pattern.matcher(json);
        assertThat(matcher.find()).as("padrão %s presente no JSON", pattern).isTrue();
        return matcher.group(1);
    }
}
