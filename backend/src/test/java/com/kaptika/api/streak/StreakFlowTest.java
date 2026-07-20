package com.kaptika.api.streak;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.session.SessionTestSupport;
import com.kaptika.api.streak.StreakTestSupport.MutableClock;
import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.util.LinkedHashSet;
import java.util.Set;
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
 * Fio real da feature: o fluxo HTTP da 002 (criar → responder → concluir)
 * alimenta a ofensiva via SessionCompleted AFTER_COMMIT — sem chamada direta
 * ao serviço (FR-001, SC-001) — e o contrato do GET /me/streak (FR-011).
 */
@Import({SessionTestSupport.class, StreakTestSupport.class})
class StreakFlowTest extends IntegrationTest {

    private static final Pattern SESSION_ID = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"");
    private static final Pattern QUESTION_ID =
            Pattern.compile("\"questionId\":\"([0-9a-f-]{36})\"");

    @Autowired
    private MutableClock clock;

    @BeforeEach
    void resetClock() {
        clock.set(StreakTestSupport.DEFAULT_NOW);
    }

    @Test
    @DisplayName("contrato do GET para estudante sem atividade: estado inicial completo")
    void freshStudentContract() throws Exception {
        mockMvc.perform(get("/me/streak")
                        .header("Authorization", "Bearer " + TestTokens.valid(UUID.randomUUID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").value(0))
                .andExpect(jsonPath("$.record").value(0))
                .andExpect(jsonPath("$.freezes").value(2))
                .andExpect(jsonPath("$.metToday").value(false))
                .andExpect(jsonPath("$.brokenSinceLastAccess").value(false))
                .andExpect(jsonPath("$.brokenAt").isEmpty());
    }

    @Test
    @DisplayName("fio real 002→004: sessão concluída via HTTP incrementa a ofensiva; segunda sessão no dia não (SC-001)")
    void completedSessionFeedsStreakThroughRealEvent() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());

        // matematica tem acervo de 3 questões no stub — sessão curta completável
        MvcResult created = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"matematica\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalQuestions").value(3))
                .andReturn();
        String json = created.getResponse().getContentAsString();
        String sessionId = firstMatch(SESSION_ID, json);

        for (String questionId : allMatches(QUESTION_ID, json)) {
            mockMvc.perform(post("/sessions/" + sessionId + "/answers")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"questionId\":\"" + questionId + "\",\"alternative\":\"A\"}"))
                    .andExpect(status().isOk());
        }
        // última resposta concluiu a sessão → SessionCompleted após o commit

        mockMvc.perform(get("/me/streak").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").value(1))
                .andExpect(jsonPath("$.record").value(1))
                .andExpect(jsonPath("$.freezes").value(2))
                .andExpect(jsonPath("$.metToday").value(true))
                .andExpect(jsonPath("$.brokenSinceLastAccess").value(false));

        // segunda sessão concluída no mesmo dia (outra área) não incrementa de novo
        MvcResult second = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"linguagens\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String secondJson = second.getResponse().getContentAsString();
        String secondId = firstMatch(SESSION_ID, secondJson);
        String firstQuestion = firstMatch(QUESTION_ID, secondJson);
        mockMvc.perform(post("/sessions/" + secondId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + firstQuestion + "\",\"alternative\":\"B\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/sessions/" + secondId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mockMvc.perform(get("/me/streak").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").value(1)); // SC-001 pelo fio real
    }

    @Test
    @DisplayName("sessão encerrada sem nenhuma resposta não cumpre a meta diária")
    void emptySessionDoesNotMeetGoal() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());

        MvcResult created = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"linguagens\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String sessionId = firstMatch(SESSION_ID, created.getResponse().getContentAsString());

        mockMvc.perform(post("/sessions/" + sessionId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mockMvc.perform(get("/me/streak").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").value(0))
                .andExpect(jsonPath("$.metToday").value(false));
    }

    // ---------- helpers ----------

    private static String firstMatch(Pattern pattern, String json) {
        Matcher matcher = pattern.matcher(json);
        assertThat(matcher.find()).as("padrão %s presente no JSON", pattern).isTrue();
        return matcher.group(1);
    }

    private static Set<String> allMatches(Pattern pattern, String json) {
        Set<String> matches = new LinkedHashSet<>();
        Matcher matcher = pattern.matcher(json);
        while (matcher.find()) {
            matches.add(matcher.group(1));
        }
        return matches;
    }
}
