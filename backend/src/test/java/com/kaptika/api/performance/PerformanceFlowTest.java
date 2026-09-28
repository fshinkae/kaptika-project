package com.kaptika.api.performance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.session.SessionTestSupport;
import com.kaptika.api.streak.StreakTestSupport;
import com.kaptika.api.streak.StreakTestSupport.MutableClock;
import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * GET /me/performance (SC-001, SC-003, SC-004, SC-005).
 *
 * "Hoje" = 2026-03-10 (clock em 12:00 de São Paulo). Cenário do estudante P:
 *  - Matemática, COMPLETED: 10 respostas (4 certas) hoje; outra sessão com
 *    2 respostas (1 certa) há 40 dias e 1 errada há 100 dias
 *  - Linguagens, EXPIRED: 12 respostas (9 certas) em 2026-03-05
 *  - Humanas, ACTIVE: 2 certas às 23h50 de 2026-03-08 (02h50 UTC do dia 9)
 *    e 1 certa em 2026-03-09
 *  - Natureza: nada
 *  - XP: 40 às 23h50 de 2026-03-08 e 30 hoje; meta cumprida em 03-08 e 03-10
 */
@Import({SessionTestSupport.class, StreakTestSupport.class})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PerformanceFlowTest extends IntegrationTest {

    private static final Instant TODAY_MORNING = Instant.parse("2026-03-10T13:00:00Z");
    private static final Instant LATE_NIGHT_MARCH_8 = Instant.parse("2026-03-09T02:50:00Z");

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private MutableClock clock;

    private final String tokenP = TestTokens.valid(UUID.randomUUID());
    private final String tokenHeavy = TestTokens.valid(UUID.randomUUID());

    @BeforeAll
    void seed() throws Exception {
        clock.set(StreakTestSupport.DEFAULT_NOW);
        UUID p = provision(tokenP);

        UUID math = session(p, "MATEMATICA", "COMPLETED");
        for (int i = 0; i < 10; i++) {
            answer(math, i < 4, TODAY_MORNING);
        }
        UUID oldMath = session(p, "MATEMATICA", "COMPLETED");
        answer(oldMath, true, TODAY_MORNING.minus(40, ChronoUnit.DAYS));
        answer(oldMath, false, TODAY_MORNING.minus(40, ChronoUnit.DAYS));
        answer(oldMath, false, TODAY_MORNING.minus(100, ChronoUnit.DAYS));

        UUID lang = session(p, "LINGUAGENS", "EXPIRED");
        for (int i = 0; i < 12; i++) {
            answer(lang, i < 9, Instant.parse("2026-03-05T18:00:00Z"));
        }

        UUID humanities = session(p, "CIENCIAS_HUMANAS", "ACTIVE");
        answer(humanities, true, LATE_NIGHT_MARCH_8);
        answer(humanities, true, LATE_NIGHT_MARCH_8);
        answer(humanities, true, Instant.parse("2026-03-09T15:00:00Z"));

        grant(p, 40, LATE_NIGHT_MARCH_8);
        grant(p, 30, TODAY_MORNING);
        activeDay(p, LocalDate.parse("2026-03-08"));
        activeDay(p, LocalDate.parse("2026-03-10"));

        seedHeavyHistory(provision(tokenHeavy));
    }

    @BeforeEach
    void resetClock() {
        clock.set(StreakTestSupport.DEFAULT_NOW);
    }

    @Test
    @DisplayName("30 dias (padrão): contagens por área, área sem respostas com accuracy nula, totais e recomendação")
    void areasTotalsAndRecommendation() throws Exception {
        mockMvc.perform(get("/me/performance").header("Authorization", "Bearer " + tokenP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.windowDays").value(30))
                .andExpect(jsonPath("$.from").value("2026-02-09"))
                .andExpect(jsonPath("$.to").value("2026-03-10"))
                .andExpect(jsonPath("$.areas.length()").value(4))
                .andExpect(jsonPath("$.areas[0].area").value("linguagens"))
                .andExpect(jsonPath("$.areas[0].answered").value(12))
                .andExpect(jsonPath("$.areas[0].correct").value(9))
                .andExpect(jsonPath("$.areas[0].wrong").value(3))
                .andExpect(jsonPath("$.areas[0].accuracy").value(0.75))
                .andExpect(jsonPath("$.areas[1].area").value("ciencias-humanas"))
                .andExpect(jsonPath("$.areas[1].answered").value(3))
                .andExpect(jsonPath("$.areas[1].accuracy").value(1.0))
                .andExpect(jsonPath("$.areas[2].area").value("ciencias-natureza"))
                .andExpect(jsonPath("$.areas[2].answered").value(0))
                .andExpect(jsonPath("$.areas[2].accuracy").value(nullValue()))
                .andExpect(jsonPath("$.areas[3].area").value("matematica"))
                .andExpect(jsonPath("$.areas[3].answered").value(10)) // antigas fora da janela
                .andExpect(jsonPath("$.areas[3].correct").value(4))
                .andExpect(jsonPath("$.totals.answered").value(25))
                .andExpect(jsonPath("$.totals.correct").value(16))
                .andExpect(jsonPath("$.totals.wrong").value(9))
                .andExpect(jsonPath("$.totals.accuracy").value(0.64))
                .andExpect(jsonPath("$.recommendation.area").value("ciencias-natureza"))
                .andExpect(jsonPath("$.recommendation.reason").value("NOT_PRACTICED"));
    }

    @Test
    @DisplayName("série diária: pontos contíguos, dia local de São Paulo na virada da meia-noite, activeDay")
    void dailySeries() throws Exception {
        mockMvc.perform(get("/me/performance").header("Authorization", "Bearer " + tokenP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.daily.length()").value(30))
                .andExpect(jsonPath("$.daily[0].date").value("2026-02-09"))
                .andExpect(jsonPath("$.daily[0].xp").value(0))
                .andExpect(jsonPath("$.daily[0].activeDay").value(false))
                .andExpect(jsonPath("$.daily[24].date").value("2026-03-05"))
                .andExpect(jsonPath("$.daily[24].answered").value(12))
                .andExpect(jsonPath("$.daily[24].correct").value(9))
                // 23h50 de 03-08 em São Paulo = 02h50 UTC de 03-09 → conta em 03-08
                .andExpect(jsonPath("$.daily[27].date").value("2026-03-08"))
                .andExpect(jsonPath("$.daily[27].answered").value(2))
                .andExpect(jsonPath("$.daily[27].xp").value(40))
                .andExpect(jsonPath("$.daily[27].activeDay").value(true))
                .andExpect(jsonPath("$.daily[28].date").value("2026-03-09"))
                .andExpect(jsonPath("$.daily[28].answered").value(1))
                .andExpect(jsonPath("$.daily[28].xp").value(0))
                .andExpect(jsonPath("$.daily[28].activeDay").value(false))
                .andExpect(jsonPath("$.daily[29].date").value("2026-03-10"))
                .andExpect(jsonPath("$.daily[29].answered").value(10))
                .andExpect(jsonPath("$.daily[29].correct").value(4))
                .andExpect(jsonPath("$.daily[29].xp").value(30))
                .andExpect(jsonPath("$.daily[29].activeDay").value(true));
    }

    @Test
    @DisplayName("janelas de 7 e 90 dias: tamanho da série e respostas antigas conforme a janela")
    void otherWindows() throws Exception {
        mockMvc.perform(get("/me/performance").param("days", "7")
                        .header("Authorization", "Bearer " + tokenP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.windowDays").value(7))
                .andExpect(jsonPath("$.from").value("2026-03-04"))
                .andExpect(jsonPath("$.daily.length()").value(7))
                .andExpect(jsonPath("$.totals.answered").value(25));

        mockMvc.perform(get("/me/performance").param("days", "90")
                        .header("Authorization", "Bearer " + tokenP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.daily.length()").value(90))
                .andExpect(jsonPath("$.areas[3].answered").value(12)) // +2 de 40 dias; 100 dias fica fora
                .andExpect(jsonPath("$.areas[3].correct").value(5));
    }

    @Test
    @DisplayName("virada do dia pelo clock do servidor: às 00h10 de 03-11 a janela avança")
    void windowFollowsServerDay() throws Exception {
        clock.set(Instant.parse("2026-03-11T03:10:00Z")); // 00h10 em São Paulo
        mockMvc.perform(get("/me/performance").param("days", "7")
                        .header("Authorization", "Bearer " + tokenP))
                .andExpect(jsonPath("$.to").value("2026-03-11"))
                .andExpect(jsonPath("$.daily[6].date").value("2026-03-11"))
                .andExpect(jsonPath("$.daily[6].answered").value(0))
                .andExpect(jsonPath("$.daily[5].answered").value(10));
    }

    @Test
    @DisplayName("estudante novo: 200 com tudo zerado e INSUFFICIENT_DATA; não vê dados de outro (SC-005)")
    void freshStudentIsolated() throws Exception {
        mockMvc.perform(get("/me/performance")
                        .header("Authorization", "Bearer " + TestTokens.valid(UUID.randomUUID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.answered").value(0))
                .andExpect(jsonPath("$.totals.accuracy").value(nullValue()))
                .andExpect(jsonPath("$.areas[3].answered").value(0))
                .andExpect(jsonPath("$.daily[29].xp").value(0))
                .andExpect(jsonPath("$.daily[29].activeDay").value(false))
                .andExpect(jsonPath("$.recommendation.area").value(nullValue()))
                .andExpect(jsonPath("$.recommendation.reason").value("INSUFFICIENT_DATA"));
    }

    @Test
    @DisplayName("days fora da lista → 422 no formato padrão; sem token → 401")
    void validationAndAuth() throws Exception {
        for (String days : List.of("15", "abc", "0")) {
            mockMvc.perform(get("/me/performance").param("days", days)
                            .header("Authorization", "Bearer " + tokenP))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.code").value("validation_error"));
        }
        mockMvc.perform(get("/me/performance")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("SC-004: 90 dias de histórico intenso respondem em menos de 500 ms")
    void heavyHistoryIsFast() throws Exception {
        mockMvc.perform(get("/me/performance").param("days", "90")
                .header("Authorization", "Bearer " + tokenHeavy)); // aquece caminho e planos

        long startedAt = System.nanoTime();
        mockMvc.perform(get("/me/performance").param("days", "90")
                        .header("Authorization", "Bearer " + tokenHeavy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.answered").value(90 * 20));
        Duration elapsed = Duration.ofNanos(System.nanoTime() - startedAt);

        assertThat(elapsed).isLessThan(Duration.ofMillis(500));
    }

    // ---------- helpers ----------

    /** 90 dias × 20 respostas + 1 concessão de XP e meta cumprida por dia. */
    private void seedHeavyHistory(UUID profileId) {
        String[] areas = {"LINGUAGENS", "CIENCIAS_HUMANAS", "CIENCIAS_NATUREZA", "MATEMATICA"};
        List<Object[]> answers = new ArrayList<>();
        for (int d = 0; d < 90; d++) {
            Instant at = TODAY_MORNING.minus(d, ChronoUnit.DAYS);
            UUID s = session(profileId, areas[d % 4], "COMPLETED");
            for (int i = 0; i < 20; i++) {
                answers.add(new Object[] {s, "heavy-" + i, "A", i % 3 != 0, Timestamp.from(at)});
            }
            grant(profileId, 50, at);
            activeDay(profileId, LocalDate.parse("2026-03-10").minusDays(d));
        }
        jdbc.batchUpdate("""
                insert into answers (session_id, source_id, chosen, correct, answered_at)
                values (?, ?, ?, ?, ?)
                """, answers);
    }

    private UUID provision(String token) throws Exception {
        String json = mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(json);
        assertThat(m.find()).isTrue();
        return UUID.fromString(m.group(1));
    }

    private UUID session(UUID profileId, String area, String status) {
        return jdbc.queryForObject("""
                insert into study_sessions (profile_id, area, status) values (?, ?, ?)
                returning id
                """, UUID.class, profileId, area, status);
    }

    private void answer(UUID sessionId, boolean correct, Instant at) {
        jdbc.update("""
                insert into answers (session_id, source_id, chosen, correct, answered_at)
                values (?, ?, 'A', ?, ?)
                """, sessionId, "seed-" + UUID.randomUUID(), correct, Timestamp.from(at));
    }

    private void grant(UUID profileId, int amount, Instant at) {
        jdbc.update("""
                insert into xp_grants (profile_id, amount, source, granted_at, idempotency_key)
                values (?, ?, 'seed', ?, ?)
                """, profileId, amount, Timestamp.from(at), "seed:" + UUID.randomUUID());
    }

    private void activeDay(UUID profileId, LocalDate day) {
        jdbc.update("insert into activity_days (profile_id, local_date, met) values (?, ?, true)",
                profileId, Date.valueOf(day));
    }
}
