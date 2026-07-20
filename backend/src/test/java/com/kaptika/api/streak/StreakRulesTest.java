package com.kaptika.api.streak;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.events.SessionCompleted;
import com.kaptika.api.profile.ProfileRepository;
import com.kaptika.api.session.SessionTestSupport;
import com.kaptika.api.streak.StreakTestSupport.MutableClock;
import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;

/**
 * Regras da ofensiva com relógio controlado (sem sleep):
 * US1 — incremento 1×/dia, dedupe de evento, fuso America/Sao_Paulo
 * (SC-001, SC-004); US2 — quebra lazy/por job com recorde preservado
 * (SC-002, SC-003); US3 — freezes (SC-005, FR-008).
 */
@Import({SessionTestSupport.class, StreakTestSupport.class})
class StreakRulesTest extends IntegrationTest {

    @Autowired
    private StreakService streakService;

    @Autowired
    private StreakReconciliationService reconciliationService;

    @Autowired
    private StreakReconciliationJob job;

    @Autowired
    private StreakRepository streaks;

    @Autowired
    private ProfileRepository profiles;

    @Autowired
    private MutableClock clock;

    @BeforeEach
    void resetClock() {
        clock.set(StreakTestSupport.DEFAULT_NOW); // 2026-03-10 12:00 em São Paulo
    }

    @Test
    @DisplayName("SC-001: duas sessões concluídas no mesmo dia incrementam a ofensiva uma única vez")
    void twoSessionsSameDayIncrementOnce() throws Exception {
        Student student = newStudent();
        meetGoal(student.profileId);
        meetGoal(student.profileId); // segunda sessão, mesmo dia

        Streak streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(1);
        assertThat(streak.getRecordStreak()).isEqualTo(1);
        assertThat(streak.getFreezes()).isEqualTo(Streak.INITIAL_FREEZES);
        assertThat(streak.getLastMetDate()).isEqualTo(LocalDate.of(2026, 3, 10));
    }

    @Test
    @DisplayName("FR-009: reentrega do mesmo evento (mesma idempotencyKey) nunca duplica — nem em outro dia")
    void replayedEventIsDeduplicated() throws Exception {
        Student student = newStudent();
        SessionCompleted event = completion(student.profileId);

        streakService.registerCompletion(event);
        streakService.registerCompletion(event); // reentrega no mesmo dia
        clock.advanceDays(1);
        streakService.registerCompletion(event); // reentrega atrasada, dia seguinte

        Streak streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(1);
        assertThat(streak.getLastMetDate()).isEqualTo(LocalDate.of(2026, 3, 10));
    }

    @Test
    @DisplayName("dias consecutivos incrementam e atualizam o recorde")
    void consecutiveDaysIncrement() throws Exception {
        Student student = newStudent();
        meetGoal(student.profileId);
        clock.advanceDays(1);
        meetGoal(student.profileId);
        clock.advanceDays(1);
        meetGoal(student.profileId);

        Streak streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(3);
        assertThat(streak.getRecordStreak()).isEqualTo(3);
    }

    @Test
    @DisplayName("SC-004: a virada do dia é do fuso America/Sao_Paulo — 23h59 e 00h01 locais são dias distintos")
    void dayBoundaryFollowsSaoPauloZone() throws Exception {
        Student student = newStudent();

        clock.set(Instant.parse("2026-03-11T02:59:00Z")); // 10/03 23:59 em São Paulo
        meetGoal(student.profileId);
        Streak streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getLastMetDate()).isEqualTo(LocalDate.of(2026, 3, 10));

        clock.set(Instant.parse("2026-03-11T03:01:00Z")); // 11/03 00:01 em São Paulo (mesmo dia UTC!)
        meetGoal(student.profileId);
        streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(2); // dois dias locais distintos
        assertThat(streak.getLastMetDate()).isEqualTo(LocalDate.of(2026, 3, 11));
    }

    @Test
    @DisplayName("SC-003: quebra sem freeze suficiente zera a ofensiva, preserva o recorde e não consome o estoque")
    void breakWithoutEnoughFreezesPreservesRecord() throws Exception {
        Student student = newStudent();
        meetGoal(student.profileId); // 10/03
        for (int i = 0; i < 4; i++) { // 11..14/03 → current = 5
            clock.advanceDays(1);
            meetGoal(student.profileId);
        }

        clock.advanceDays(4); // 18/03 — perdidos 15,16,17 (3 dias) > 2 freezes
        meetGoal(student.profileId);

        Streak streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(1); // recomeçou hoje
        assertThat(streak.getRecordStreak()).isEqualTo(5); // recorde nunca diminui
        assertThat(streak.getFreezes()).isEqualTo(2); // estoque não desperdiçado na quebra
        // quebra consumada à meia-noite local após o primeiro dia perdido (16/03 00:00 -03:00)
        assertThat(streak.getBrokenAt()).isEqualTo(Instant.parse("2026-03-16T03:00:00Z"));
        assertThat(streak.isBreakAcknowledged()).isFalse();
    }

    @Test
    @DisplayName("SC-005: dia perdido com freeze disponível consome exatamente 1 e preserva a ofensiva")
    void freezePreservesStreakConsumingExactlyOne() throws Exception {
        Student student = newStudent();
        meetGoal(student.profileId); // 10/03
        clock.advanceDays(1);
        meetGoal(student.profileId); // 11/03
        clock.advanceDays(1);
        meetGoal(student.profileId); // 12/03 → current = 3

        clock.advanceDays(2); // 14/03 — perdido só 13/03
        meetGoal(student.profileId);

        Streak streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(4); // preservada + incremento de hoje
        assertThat(streak.getRecordStreak()).isEqualTo(4);
        assertThat(streak.getFreezes()).isEqualTo(1); // exatamente 1 consumido
        assertThat(streak.getBrokenAt()).isNull();
        assertThat(streak.isBreakAcknowledged()).isTrue();
    }

    @Test
    @DisplayName("FR-008: +1 freeze no incremento múltiplo de 7, respeitando o teto de 2")
    void freezeBonusEverySeventhDayCappedAtTwo() throws Exception {
        Student student = newStudent();
        meetGoal(student.profileId); // 10/03
        clock.advanceDays(1);
        meetGoal(student.profileId); // 11/03
        clock.advanceDays(1);
        meetGoal(student.profileId); // 12/03 → current = 3, freezes = 2

        clock.advanceDays(2); // 13/03 perdido → freeze consumido
        meetGoal(student.profileId); // 14/03 → current = 4, freezes = 1
        assertThat(streaks.findById(student.profileId).orElseThrow().getFreezes()).isEqualTo(1);

        for (int i = 0; i < 3; i++) { // 15..17/03 → current = 7
            clock.advanceDays(1);
            meetGoal(student.profileId);
        }
        Streak streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(7);
        assertThat(streak.getFreezes()).isEqualTo(2); // bônus do múltiplo de 7

        for (int i = 0; i < 7; i++) { // 18..24/03 → current = 14
            clock.advanceDays(1);
            meetGoal(student.profileId);
        }
        streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(14);
        assertThat(streak.getFreezes()).isEqualTo(2); // teto: bônus do 14 não acumula
    }

    @Test
    @DisplayName("SC-002: o job de reconciliação detecta a quebra sem acesso do estudante; o GET reporta uma única vez")
    void reconciliationJobDetectsBreak() throws Exception {
        Student student = newStudent();
        meetGoal(student.profileId); // 10/03
        clock.advanceDays(1);
        meetGoal(student.profileId); // 11/03 → current = 2

        clock.advanceDays(4); // 15/03 — perdidos 12,13,14 (3 dias) > 2 freezes
        job.run(); // verificação temporal, sem nenhum acesso do estudante

        Streak streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isZero();
        assertThat(streak.getRecordStreak()).isEqualTo(2);
        assertThat(streak.getBrokenAt()).isEqualTo(Instant.parse("2026-03-13T03:00:00Z"));
        assertThat(streak.isBreakAcknowledged()).isFalse();

        // FR-007: a quebra desde o último acesso é reportada uma única vez
        mockMvc.perform(get("/me/streak").header("Authorization", "Bearer " + student.token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").value(0))
                .andExpect(jsonPath("$.record").value(2))
                .andExpect(jsonPath("$.brokenSinceLastAccess").value(true))
                .andExpect(jsonPath("$.brokenAt").value("2026-03-13T03:00:00Z"));

        mockMvc.perform(get("/me/streak").header("Authorization", "Bearer " + student.token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.brokenSinceLastAccess").value(false))
                .andExpect(jsonPath("$.brokenAt").isEmpty());
    }

    @Test
    @DisplayName("job com freeze disponível preserva a ofensiva; segunda varredura é no-op")
    void reconciliationJobConsumesFreezeWhenAvailable() throws Exception {
        Student student = newStudent();
        meetGoal(student.profileId); // 10/03
        clock.advanceDays(1);
        meetGoal(student.profileId); // 11/03 → current = 2

        clock.advanceDays(2); // 13/03 — perdido só 12/03
        reconciliationService.reconcileAll();

        Streak streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(2); // preservada
        assertThat(streak.getFreezes()).isEqualTo(1);
        assertThat(streak.getLastMetDate()).isEqualTo(LocalDate.of(2026, 3, 12)); // dia coberto
        assertThat(streak.getBrokenAt()).isNull();

        // já reconciliada: nova varredura não muda nada
        reconciliationService.reconcileAll();
        streak = streaks.findById(student.profileId).orElseThrow();
        assertThat(streak.getCurrentStreak()).isEqualTo(2);
        assertThat(streak.getFreezes()).isEqualTo(1);
        assertThat(streak.getLastMetDate()).isEqualTo(LocalDate.of(2026, 3, 12));

        meetGoal(student.profileId); // meta de hoje segue valendo
        assertThat(streaks.findById(student.profileId).orElseThrow().getCurrentStreak()).isEqualTo(3);
    }

    @Test
    @DisplayName("SC-002: detecção lazy no GET — consome freeze quando dá e quebra quando o estoque acaba")
    void lazyReconciliationOnGet() throws Exception {
        Student student = newStudent();
        meetGoal(student.profileId); // 10/03 → current = 1

        clock.advanceDays(2); // 12/03 — perdido 11/03 → freeze cobre
        mockMvc.perform(get("/me/streak").header("Authorization", "Bearer " + student.token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").value(1))
                .andExpect(jsonPath("$.freezes").value(1))
                .andExpect(jsonPath("$.metToday").value(false))
                .andExpect(jsonPath("$.brokenSinceLastAccess").value(false));

        clock.advanceDays(2); // 14/03 — perdidos 12 e 13/03 (2) > 1 freeze → quebra
        mockMvc.perform(get("/me/streak").header("Authorization", "Bearer " + student.token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current").value(0))
                .andExpect(jsonPath("$.record").value(1))
                .andExpect(jsonPath("$.brokenSinceLastAccess").value(true))
                .andExpect(jsonPath("$.brokenAt").value("2026-03-13T03:00:00Z"));

        mockMvc.perform(get("/me/streak").header("Authorization", "Bearer " + student.token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.brokenSinceLastAccess").value(false));
    }

    // ---------- helpers ----------

    private record Student(UUID profileId, String token) {
    }

    /** Provisiona o perfil via requisição autenticada real e resolve o id interno. */
    private Student newStudent() throws Exception {
        UUID subject = UUID.randomUUID();
        String token = TestTokens.valid(subject);
        mockMvc.perform(get("/me/streak").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        UUID profileId = profiles.findBySupabaseId(subject).orElseThrow().getId();
        return new Student(profileId, token);
    }

    private SessionCompleted completion(UUID profileId) {
        UUID sessionId = UUID.randomUUID();
        return new SessionCompleted(profileId, sessionId, "LINGUAGENS", 2, 1, 3,
                clock.instant(), SessionCompleted.keyFor(sessionId));
    }

    /** Cumpre a meta do dia corrente processando uma conclusão de sessão. */
    private void meetGoal(UUID profileId) {
        streakService.registerCompletion(completion(profileId));
    }
}
