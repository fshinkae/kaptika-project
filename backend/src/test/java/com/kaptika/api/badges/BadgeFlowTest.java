package com.kaptika.api.badges;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.events.CorrectAnswerRecorded;
import com.kaptika.api.events.SessionCompleted;
import com.kaptika.api.profile.ProfileRepository;
import com.kaptika.api.session.SessionTestSupport;
import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

/**
 * US1 — concessão automática e idempotente (SC-001, SC-002).
 * US2 — coleção com estados, datas e progresso (SC-003, SC-004).
 * US3 — catálogo extensível com backfill retroativo (FR-006, FR-007).
 *
 * Ordem determinística da coleção (sort_order do seed V500):
 * [0] first-session, [1] streak-7, [2] correct-100, [3] explorer, [4] level-5.
 */
@Import(SessionTestSupport.class)
class BadgeFlowTest extends IntegrationTest {

    private static final Pattern QUESTION_ID =
            Pattern.compile("\"questionId\":\"([^\"]+)\"");
    private static final Pattern SESSION_ID = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"");

    @Autowired
    private BadgeService badgeService;
    @Autowired
    private BadgeBackfillService backfillService;
    @Autowired
    private ProfileRepository profiles;
    @Autowired
    private BadgeCountersRepository countersRepository;
    @Autowired
    private BadgeAwardRepository awardRepository;
    @Autowired
    private ProcessedBadgeEventRepository processedEventRepository;
    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void removeTestOnlyBadges() {
        // medalhas fictícias criadas no teste de backfill não vazam para os demais
        jdbc.update("delete from badge_awards where badge_id in "
                + "(select id from badges where slug like 'test-%')");
        jdbc.update("delete from badges where slug like 'test-%'");
    }

    @Test
    @DisplayName("fio real da 002: concluir a 1ª sessão concede first-session (SC-001)")
    void firstSessionAwardedThroughRealFlow() throws Exception {
        Student student = newStudent();

        // acervo de matemática do stub: 3 questões — sessão curta e determinística
        MvcResult created = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + student.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"matematica\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String json = created.getResponse().getContentAsString();
        String sessionId = firstMatch(SESSION_ID, json);

        // responde tudo certo (gabarito de teste = A); a última resposta encerra a sessão
        for (String questionId : allMatches(QUESTION_ID, json)) {
            mockMvc.perform(post("/sessions/" + sessionId + "/answers")
                            .header("Authorization", "Bearer " + student.token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"questionId\":\"" + questionId + "\",\"alternative\":\"A\"}"))
                    .andExpect(status().isOk());
        }

        // AFTER_COMMIT já processou: medalha concedida com data (SC-001/SC-003)
        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + student.token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.badges[0].slug").value("first-session"))
                .andExpect(jsonPath("$.badges[0].achieved").value(true))
                .andExpect(jsonPath("$.badges[0].awardedAt").isNotEmpty())
                .andExpect(jsonPath("$.badges[0].progress.current").value(1))
                .andExpect(jsonPath("$.badges[0].progress.target").value(1))
                // 3 acertos alimentaram os contadores próprios (SC-004)
                .andExpect(jsonPath("$.badges[2].slug").value("correct-100"))
                .andExpect(jsonPath("$.badges[2].achieved").value(false))
                .andExpect(jsonPath("$.badges[2].progress.current").value(3))
                .andExpect(jsonPath("$.achievedCount").value(1));

        assertThat(badgeService.countFor(student.profileId)).isEqualTo(1); // FR-010
    }

    @Test
    @DisplayName("coleção inicial: 5 medalhas bloqueadas com objetivo e progresso zerado (SC-003)")
    void emptyCollectionShowsAllLockedBadges() throws Exception {
        Student student = newStudent();

        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + student.token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(5))
                .andExpect(jsonPath("$.achievedCount").value(0))
                .andExpect(jsonPath("$.badges[0].slug").value("first-session"))
                .andExpect(jsonPath("$.badges[1].slug").value("streak-7"))
                .andExpect(jsonPath("$.badges[2].slug").value("correct-100"))
                .andExpect(jsonPath("$.badges[3].slug").value("explorer"))
                .andExpect(jsonPath("$.badges[4].slug").value("level-5"))
                .andExpect(jsonPath("$.badges[2].name").value("Centurião"))
                .andExpect(jsonPath("$.badges[2].description").isNotEmpty())
                .andExpect(jsonPath("$.badges[2].achieved").value(false))
                .andExpect(jsonPath("$.badges[2].awardedAt").isEmpty())
                .andExpect(jsonPath("$.badges[2].progress.current").value(0))
                .andExpect(jsonPath("$.badges[2].progress.target").value(100))
                .andExpect(jsonPath("$.badges[4].progress.target").value(1000));

        mockMvc.perform(get("/me/badges")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("correct-100 com progresso 99→100 e level-5 aos 1000 XP (SC-001, SC-004)")
    void cumulativeCenturionAndLevelFive() throws Exception {
        Student student = newStudent();

        for (int i = 0; i < 99; i++) {
            badgeService.onCorrectAnswer(correctAnswer(student.profileId));
        }
        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + student.token))
                .andExpect(jsonPath("$.badges[2].achieved").value(false))
                .andExpect(jsonPath("$.badges[2].progress.current").value(99))
                .andExpect(jsonPath("$.badges[4].achieved").value(false))
                .andExpect(jsonPath("$.badges[4].progress.current").value(990)); // 99 × 10 XP

        badgeService.onCorrectAnswer(correctAnswer(student.profileId));

        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + student.token))
                .andExpect(jsonPath("$.badges[2].achieved").value(true))
                .andExpect(jsonPath("$.badges[2].awardedAt").isNotEmpty())
                .andExpect(jsonPath("$.badges[2].progress.current").value(100))
                // 100 acertos × 10 XP = 1000 XP = nível 5 (curva 100×N)
                .andExpect(jsonPath("$.badges[4].achieved").value(true))
                .andExpect(jsonPath("$.badges[4].progress.current").value(1000))
                .andExpect(jsonPath("$.achievedCount").value(2));
    }

    @Test
    @DisplayName("explorer: sessão concluída nas 4 áreas; área desconhecida é ignorada (SC-001)")
    void explorerRequiresAllFourAreas() throws Exception {
        Student student = newStudent();
        Instant now = Instant.now();

        badgeService.onSessionCompleted(sessionCompleted(student.profileId, "LINGUAGENS", now));
        badgeService.onSessionCompleted(sessionCompleted(student.profileId, "CIENCIAS_HUMANAS", now));
        badgeService.onSessionCompleted(sessionCompleted(student.profileId, "CIENCIAS_NATUREZA", now));
        // área desconhecida não conta para o explorer nem quebra o processamento
        badgeService.onSessionCompleted(sessionCompleted(student.profileId, "ASTROLOGIA", now));

        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + student.token))
                .andExpect(jsonPath("$.badges[3].achieved").value(false))
                .andExpect(jsonPath("$.badges[3].progress.current").value(3))
                .andExpect(jsonPath("$.badges[3].progress.target").value(4));

        badgeService.onSessionCompleted(sessionCompleted(student.profileId, "MATEMATICA", now));

        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + student.token))
                .andExpect(jsonPath("$.badges[3].achieved").value(true))
                .andExpect(jsonPath("$.badges[3].awardedAt").isNotEmpty())
                // 5 sessões concluídas no total; first-session veio junto (SC-001)
                .andExpect(jsonPath("$.badges[0].achieved").value(true));

        assertThat(countersRepository.findById(student.profileId).orElseThrow()
                .getSessionsCompleted()).isEqualTo(5);
    }

    @Test
    @DisplayName("streak-7: 7 dias locais consecutivos; lacuna recomeça; fora de ordem não regride")
    void streakSevenConsecutiveLocalDays() throws Exception {
        Student student = newStudent();
        LocalDate start = LocalDate.of(2026, 6, 1);

        for (int day = 0; day < 6; day++) {
            badgeService.onSessionCompleted(
                    sessionCompleted(student.profileId, "LINGUAGENS", atNoon(start.plusDays(day))));
        }
        // duas sessões no mesmo dia não contam dois dias
        badgeService.onSessionCompleted(
                sessionCompleted(student.profileId, "LINGUAGENS", atNoon(start.plusDays(5))));
        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + student.token))
                .andExpect(jsonPath("$.badges[1].achieved").value(false))
                .andExpect(jsonPath("$.badges[1].progress.current").value(6));

        badgeService.onSessionCompleted(
                sessionCompleted(student.profileId, "LINGUAGENS", atNoon(start.plusDays(6))));
        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + student.token))
                .andExpect(jsonPath("$.badges[1].achieved").value(true))
                .andExpect(jsonPath("$.badges[1].progress.current").value(7));

        // lacuna: streak corrente recomeça, mas o melhor histórico (e a medalha) permanecem
        badgeService.onSessionCompleted(
                sessionCompleted(student.profileId, "LINGUAGENS", atNoon(start.plusDays(9))));
        BadgeCounters counters = countersRepository.findById(student.profileId).orElseThrow();
        assertThat(counters.getStreakCurrent()).isEqualTo(1);
        assertThat(counters.getStreakBest()).isEqualTo(7);

        // evento fora de ordem (dia anterior ao último) não regride o estado
        badgeService.onSessionCompleted(
                sessionCompleted(student.profileId, "LINGUAGENS", atNoon(start.plusDays(8))));
        counters = countersRepository.findById(student.profileId).orElseThrow();
        assertThat(counters.getStreakCurrent()).isEqualTo(1);
        assertThat(counters.getLastSessionDate()).isEqualTo(start.plusDays(9));
    }

    @Test
    @DisplayName("reprocessar o mesmo evento não duplica progresso nem concessão (SC-002)")
    void reprocessingSameEventIsNoOp() throws Exception {
        Student student = newStudent();

        CorrectAnswerRecorded answer = correctAnswer(student.profileId);
        badgeService.onCorrectAnswer(answer);
        badgeService.onCorrectAnswer(answer);
        assertThat(countersRepository.findById(student.profileId).orElseThrow()
                .getCorrectTotal()).isEqualTo(1);

        SessionCompleted completion = sessionCompleted(student.profileId, "LINGUAGENS", Instant.now());
        badgeService.onSessionCompleted(completion);
        badgeService.onSessionCompleted(completion);

        BadgeCounters counters = countersRepository.findById(student.profileId).orElseThrow();
        assertThat(counters.getSessionsCompleted()).isEqualTo(1);
        assertThat(badgeService.countFor(student.profileId)).isEqualTo(1); // só first-session
        assertThat(processedEventRepository.count()).isGreaterThanOrEqualTo(2);
    }

    @Test
    @DisplayName("eventos concorrentes satisfazendo a mesma condição → 1 concessão (SC-002)")
    void concurrentEventsGrantSingleAward() throws Exception {
        Student student = newStudent();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    badgeService.onSessionCompleted(
                            sessionCompleted(student.profileId, "LINGUAGENS", Instant.now()));
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> future : futures) {
                future.get();
            }
        } finally {
            pool.shutdown();
        }

        // ambos os eventos contabilizados; concessão de first-session única
        assertThat(countersRepository.findById(student.profileId).orElseThrow()
                .getSessionsCompleted()).isEqualTo(2);
        assertThat(awardRepository.findByProfileId(student.profileId)).hasSize(1);
    }

    @Test
    @DisplayName("backfill retroativo: medalha nova concedida aos já elegíveis (FR-007)")
    void backfillGrantsRetroactively() throws Exception {
        Student eligible = newStudent();
        Student notEligible = newStudent();

        badgeService.onCorrectAnswer(correctAnswer(eligible.profileId));
        badgeService.onCorrectAnswer(correctAnswer(eligible.profileId));
        badgeService.onCorrectAnswer(correctAnswer(notEligible.profileId));

        // publicação de medalha fictícia (2 acertos) sem redefinir as existentes (FR-006)
        jdbc.update("""
                insert into badges (slug, name, description, condition_type, threshold, sort_order)
                values ('test-correct-2', 'Dupla de Teste', 'Acerte 2 questões (fictícia)',
                        'CORRECT_ANSWERS', 2, 99)
                """);

        // ≥1: estudantes de outros testes desta classe (banco compartilhado)
        // também podem ser elegíveis; o essencial é elegível sim / inelegível não
        assertThat(backfillService.backfill("test-correct-2")).isGreaterThanOrEqualTo(1);

        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + eligible.token))
                .andExpect(jsonPath("$.badges[5].slug").value("test-correct-2"))
                .andExpect(jsonPath("$.badges[5].achieved").value(true))
                .andExpect(jsonPath("$.badges[5].awardedAt").isNotEmpty());
        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + notEligible.token))
                .andExpect(jsonPath("$.badges[5].achieved").value(false))
                .andExpect(jsonPath("$.badges[5].progress.current").value(1))
                .andExpect(jsonPath("$.badges[5].progress.target").value(2));

        // idempotente: repetir o backfill não duplica (SC-002)
        assertThat(backfillService.backfill("test-correct-2")).isZero();

        // quem cruza a meta depois da publicação é coberto pelo fluxo normal
        badgeService.onCorrectAnswer(correctAnswer(notEligible.profileId));
        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + notEligible.token))
                .andExpect(jsonPath("$.badges[5].achieved").value(true));

        assertThatThrownBy(() -> backfillService.backfill("nao-existe"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ---------- helpers ----------

    private record Student(String token, UUID profileId) {
    }

    /** Provisiona o perfil pelo fio real (filtro da 001) e resolve o id interno. */
    private Student newStudent() throws Exception {
        UUID subject = UUID.randomUUID();
        String token = TestTokens.valid(subject);
        mockMvc.perform(get("/me/badges").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        UUID profileId = profiles.findBySupabaseId(subject).orElseThrow().getId();
        return new Student(token, profileId);
    }

    private static CorrectAnswerRecorded correctAnswer(UUID profileId) {
        return new CorrectAnswerRecorded(profileId, UUID.randomUUID(), "2020-1",
                "LINGUAGENS", Instant.now(), CorrectAnswerRecorded.keyFor(UUID.randomUUID()));
    }

    private static SessionCompleted sessionCompleted(UUID profileId, String area, Instant at) {
        UUID sessionId = UUID.randomUUID();
        return new SessionCompleted(profileId, sessionId, area, 3, 0, 3, at,
                SessionCompleted.keyFor(sessionId));
    }

    private static Instant atNoon(LocalDate day) {
        return ZonedDateTime.of(day, LocalTime.NOON, BadgeService.BADGE_TIME_ZONE).toInstant();
    }

    private static String firstMatch(Pattern pattern, String json) {
        Matcher matcher = pattern.matcher(json);
        assertThat(matcher.find()).as("padrão %s presente no JSON", pattern).isTrue();
        return matcher.group(1);
    }

    private static List<String> allMatches(Pattern pattern, String json) {
        List<String> matches = new ArrayList<>();
        Matcher matcher = pattern.matcher(json);
        while (matcher.find()) {
            String value = matcher.group(1);
            if (!matches.contains(value)) {
                matches.add(value);
            }
        }
        return matches;
    }
}
