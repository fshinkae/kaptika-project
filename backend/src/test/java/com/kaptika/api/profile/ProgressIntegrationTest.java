package com.kaptika.api.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.session.SessionTestSupport;
import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;

/**
 * Integração final (FR-005 da 001): o GET /me deixa de servir zeros e passa a
 * compor os agregados reais — XP/nível (003), ofensiva (004) e medalhas (005)
 * — alimentados pelo fio completo de eventos da 002.
 */
@Import(SessionTestSupport.class)
class ProgressIntegrationTest extends IntegrationTest {

    private static final Pattern SESSION_ID = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"");
    private static final Pattern QUESTION_ID =
            Pattern.compile("\"questionId\":\"([^\"]+)\"");

    @Test
    @DisplayName("ciclo completo do produto: sessão com acerto reflete em XP, streak e medalha no GET /me")
    void fullProductLoopReflectsInProfile() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());

        // estudante novo: agregados zerados
        mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progress.xpTotal").value(0))
                .andExpect(jsonPath("$.progress.level").value(1))
                .andExpect(jsonPath("$.progress.streakCurrent").value(0))
                .andExpect(jsonPath("$.progress.badgesCount").value(0));

        // sessão da 002: 1 acerto (gabarito de teste = A) e encerramento
        var created = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"linguagens\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String json = created.getResponse().getContentAsString();
        String sessionId = firstMatch(SESSION_ID, json);
        String questionId = firstMatch(QUESTION_ID, json);

        mockMvc.perform(post("/sessions/" + sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + questionId + "\",\"alternative\":\"A\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));

        mockMvc.perform(post("/sessions/" + sessionId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // GET /me agora compõe os agregados reais das features 003/004/005
        mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progress.xpTotal").value(10)) // 003: 10 XP/acerto
                .andExpect(jsonPath("$.progress.level").value(1))
                .andExpect(jsonPath("$.progress.xpToNextLevel").value(90))
                .andExpect(jsonPath("$.progress.streakCurrent").value(1)) // 004: meta do dia
                .andExpect(jsonPath("$.progress.badgesCount").value(1)); // 005: first-session
    }

    private static String firstMatch(Pattern pattern, String json) {
        Matcher matcher = pattern.matcher(json);
        assertThat(matcher.find()).as("padrão %s presente no JSON", pattern).isTrue();
        return matcher.group(1);
    }
}
