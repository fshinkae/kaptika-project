package com.kaptika.api.xp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.events.CorrectAnswerRecorded;
import com.kaptika.api.profile.ProfileRepository;
import com.kaptika.api.session.SessionTestSupport;
import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import com.kaptika.api.xp.XpDtos.ConsolidatedXp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * US1 — concessão confiável e idempotente (SC-001, SC-002, SC-003).
 * US2 — nível e GET /me/xp (SC-004).
 * US3 — consulta consolidada p/ o placar (SC-001, SC-005).
 *
 * Eventos sintéticos são publicados dentro de TransactionTemplate para
 * simular o commit da 002 (AFTER_COMMIT não dispara fora de transação);
 * o fio completo real usa POST /sessions + resposta correta via stub.
 */
@Import(SessionTestSupport.class)
class XpFlowTest extends IntegrationTest {

    private static final Pattern SESSION_ID = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"");
    private static final Pattern QUESTION_ID =
            Pattern.compile("\"questionId\":\"([0-9a-f-]{36})\"");
    private static final Pattern NEXT_QUESTION_ID =
            Pattern.compile("\"nextQuestionId\":\"([0-9a-f-]{36})\"");

    @Autowired
    private ApplicationEventPublisher publisher;

    @Autowired
    private PlatformTransactionManager txManager;

    @Autowired
    private XpService xpService;

    @Autowired
    private XpQueryService xpQueryService;

    @Autowired
    private XpGrantRepository grants;

    @Autowired
    private XpBalanceRepository balances;

    @Autowired
    private ProfileRepository profiles;

    @Test
    @DisplayName("fio completo da 002: acerto real concede 10 XP; erro não concede (SC-003)")
    void fullWireThroughSessionFlow() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());

        MvcResult created = mockMvc.perform(post("/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"area\":\"linguagens\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String json = created.getResponse().getContentAsString();
        String sessionId = firstMatch(SESSION_ID, json);
        String q1 = firstMatch(QUESTION_ID, json);

        // erro (gabarito de teste é A) → nenhum XP
        mockMvc.perform(post("/sessions/" + sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + q1 + "\",\"alternative\":\"B\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false));
        assertXpSummary(token, 0, 1, 100, 0);

        // acerto → evento AFTER_COMMIT → +10 XP visíveis em GET /me/xp
        MvcResult state = mockMvc.perform(get("/sessions/" + sessionId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String q2 = firstMatch(NEXT_QUESTION_ID, state.getResponse().getContentAsString());
        mockMvc.perform(post("/sessions/" + sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionId\":\"" + q2 + "\",\"alternative\":\"A\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
        assertXpSummary(token, 10, 1, 90, 10);

        // trilha registra origem/valor/chave (FR-010)
        UUID profileId = profileIdOf(token);
        List<XpGrant> trail = grants.findByProfileId(profileId);
        assertThat(trail).hasSize(1);
        assertThat(trail.getFirst().getAmount()).isEqualTo(10);
        assertThat(trail.getFirst().getSource()).startsWith("session:" + sessionId);
        assertThat(trail.getFirst().getIdempotencyKey()).startsWith("answer:");
    }

    @Test
    @DisplayName("reprocessamento do mesmo evento não duplica concessão nem saldo (SC-002)")
    void reprocessingSameEventDoesNotDuplicate() throws Exception {
        UUID profileId = provisionProfile();
        String key = "answer:" + UUID.randomUUID();

        publishCommitted(event(profileId, Instant.now(), key));
        publishCommitted(event(profileId, Instant.now(), key)); // reemissão

        assertThat(grants.findByProfileId(profileId)).hasSize(1);
        assertThat(balanceOf(profileId)).isEqualTo(10);
        assertThat(grants.sumAmountFor(profileId)).isEqualTo(10); // SC-001
    }

    @Test
    @DisplayName("acúmulo cruza limiares de nível e GET /me/xp reflete (SC-004)")
    void levelThresholdCrossing() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        UUID profileId = provisionProfile(token);

        // 10 acertos → 100 XP: exatamente o limiar do nível 2
        publishDistinctEvents(profileId, 10);
        assertXpSummary(token, 100, 2, 200, 100);

        // +20 acertos → 300 XP: limiar do nível 3 (cruzou 2 limiares no acúmulo)
        publishDistinctEvents(profileId, 20);
        assertXpSummary(token, 300, 3, 300, 300);

        assertThat(grants.sumAmountFor(profileId)).isEqualTo(balanceOf(profileId)); // SC-001
    }

    @Test
    @DisplayName("estudante sem progresso: 0 XP, nível 1, faltam 100 (FR-006)")
    void freshStudentSummary() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        assertXpSummary(token, 0, 1, 100, 0);
    }

    @Test
    @DisplayName("consolidado p/ placar: total inclui tudo; período só a semana vigente (FR-007)")
    void consolidatedForLeaderboard() throws Exception {
        UUID profileId = provisionProfile();

        // duas concessões na semana vigente + uma de duas semanas atrás
        publishCommitted(event(profileId, Instant.now(), "answer:" + UUID.randomUUID()));
        publishCommitted(event(profileId, Instant.now(), "answer:" + UUID.randomUUID()));
        publishCommitted(event(profileId, Instant.now().minus(Duration.ofDays(14)),
                "answer:" + UUID.randomUUID()));

        ConsolidatedXp consolidated = xpQueryService.consolidatedFor(profileId);
        assertThat(consolidated.xpTotal()).isEqualTo(30);
        assertThat(consolidated.xpInPeriod()).isEqualTo(20);
        assertThat(consolidated.periodStart()).isEqualTo(XpQueryService.currentPeriodStart());
        assertThat(consolidated.xpTotal()).isEqualTo(grants.sumAmountFor(profileId)); // SC-001
    }

    @Test
    @DisplayName("concorrência: eventos paralelos (com duplicatas simultâneas) sem corrupção (FR-009)")
    void concurrentEventsDoNotCorruptBalance() throws Exception {
        UUID profileId = provisionProfile();
        int distinctEvents = 20;

        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < distinctEvents; i++) {
                CorrectAnswerRecorded evt =
                        event(profileId, Instant.now(), "answer:" + UUID.randomUUID());
                // cada evento disputado por 2 threads ao mesmo tempo (dedupe sob corrida)
                for (int t = 0; t < 2; t++) {
                    futures.add(pool.submit(() -> {
                        start.await();
                        return xpService.grantForCorrectAnswer(evt);
                    }));
                }
            }
            start.countDown();
            for (Future<?> f : futures) {
                f.get(30, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(balanceOf(profileId)).isEqualTo(distinctEvents * 10L);
        assertThat(grants.findByProfileId(profileId)).hasSize(distinctEvents);
        assertThat(grants.sumAmountFor(profileId)).isEqualTo(balanceOf(profileId)); // SC-001
    }

    // ---------- helpers ----------

    private void assertXpSummary(String token, long xpTotal, int level, long xpToNext,
            long xpInPeriod) throws Exception {
        mockMvc.perform(get("/me/xp").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.xpTotal").value(xpTotal))
                .andExpect(jsonPath("$.level").value(level))
                .andExpect(jsonPath("$.xpToNextLevel").value(xpToNext))
                .andExpect(jsonPath("$.xpInPeriod").value(xpInPeriod));
    }

    private UUID provisionProfile() throws Exception {
        return provisionProfile(TestTokens.valid(UUID.randomUUID()));
    }

    /** Garante o perfil via GET /me (filtro de provisionamento da 001). */
    private UUID provisionProfile(String token) throws Exception {
        mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        return profileIdOf(token);
    }

    /** Resolve o id interno do perfil a partir do sub do token (ProfileRepository). */
    private UUID profileIdOf(String token) {
        try {
            UUID subject = UUID.fromString(
                    com.nimbusds.jwt.JWTParser.parse(token).getJWTClaimsSet().getSubject());
            return profiles.findBySupabaseId(subject).orElseThrow().getId();
        } catch (java.text.ParseException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Simula o commit da 002: AFTER_COMMIT só dispara com transação real. */
    private void publishCommitted(CorrectAnswerRecorded event) {
        new TransactionTemplate(txManager).executeWithoutResult(s -> publisher.publishEvent(event));
    }

    private void publishDistinctEvents(UUID profileId, int count) {
        for (int i = 0; i < count; i++) {
            publishCommitted(event(profileId, Instant.now(), "answer:" + UUID.randomUUID()));
        }
    }

    private static CorrectAnswerRecorded event(UUID profileId, Instant answeredAt, String key) {
        return new CorrectAnswerRecorded(profileId, UUID.randomUUID(), UUID.randomUUID(),
                "LINGUAGENS", answeredAt, key);
    }

    private long balanceOf(UUID profileId) {
        return balances.findById(profileId).map(XpBalance::getXpTotal).orElse(0L);
    }

    private static String firstMatch(Pattern pattern, String json) {
        Matcher matcher = pattern.matcher(json);
        assertThat(matcher.find()).as("padrão %s presente no JSON", pattern).isTrue();
        return matcher.group(1);
    }
}
