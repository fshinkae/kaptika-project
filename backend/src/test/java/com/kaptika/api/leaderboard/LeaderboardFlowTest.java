package com.kaptika.api.leaderboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import com.kaptika.api.xp.XpQueryService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

/**
 * US1 — ranking + posição própria (SC-001, SC-002, SC-006).
 * US2 — recortes por período (SC-005).
 * US3 — paginação estável e validações (SC-004).
 * TTL do cache zerado: cada chamada lê o estado real do banco.
 *
 * Cenário semeado (XP via trilha da 003, saldo consistente com a soma):
 *  - B: 300 XP, todos antes do período vigente (atingiu o total primeiro)
 *  - A: 300 XP, sendo 100 dentro do período (atingiu o total depois)
 *  - C: 100 XP antigos | D: 0 XP (sem linha de saldo)
 * Ordem global esperada: B(1º, empate resolvido por "atingiu primeiro"),
 * A(2º), C(3º), D(4º). Semanal: A(1º com 100); B/C/D com 0.
 */
@TestPropertySource(properties = "kaptika.leaderboard.cache-ttl=0s")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class LeaderboardFlowTest extends IntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    private final String tokenA = TestTokens.valid(UUID.randomUUID(),
            Map.of("user_metadata", Map.of("name", "Aluno A")));
    private final String tokenD = TestTokens.valid(UUID.randomUUID(),
            Map.of("user_metadata", Map.of("name", "Aluno D")));

    private UUID profileA;
    private UUID profileB;
    private UUID profileC;
    private UUID profileD;

    @BeforeAll
    void seed() throws Exception {
        profileA = provision(tokenA);
        profileB = provision(TestTokens.valid(UUID.randomUUID(),
                Map.of("user_metadata", Map.of("name", "Aluno B"))));
        profileC = provision(TestTokens.valid(UUID.randomUUID(),
                Map.of("user_metadata", Map.of("name", "Aluno C"))));
        profileD = provision(tokenD);

        Instant periodStart = XpQueryService.currentPeriodStart();
        Instant old1 = periodStart.minus(3, ChronoUnit.DAYS);
        Instant old2 = periodStart.minus(2, ChronoUnit.DAYS); // B fecha 300 aqui
        Instant inPeriod = periodStart.plus(1, ChronoUnit.MINUTES); // A fecha 300 depois

        grant(profileB, 300, old2);
        grant(profileA, 200, old1);
        grant(profileA, 100, inPeriod);
        grant(profileC, 100, old1);
        balance(profileA, 300, inPeriod);
        balance(profileB, 300, old2);
        balance(profileC, 100, old1);
        // D: sem saldo nem concessões (0 XP)
    }

    @Test
    @DisplayName("global: ordena por XP com desempate 'atingiu primeiro' e inclui 0 XP")
    void globalOrderingAndTieBreak() throws Exception {
        var result = mockMvc.perform(get("/leaderboard")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("global"))
                .andExpect(jsonPath("$.totalStudents").value(4))
                .andExpect(jsonPath("$.entries[0].displayName").value("Aluno B"))
                .andExpect(jsonPath("$.entries[0].rank").value(1))
                .andExpect(jsonPath("$.entries[0].xp").value(300))
                .andExpect(jsonPath("$.entries[1].displayName").value("Aluno A"))
                .andExpect(jsonPath("$.entries[1].xp").value(300))
                .andExpect(jsonPath("$.entries[2].displayName").value("Aluno C"))
                .andExpect(jsonPath("$.entries[3].displayName").value("Aluno D"))
                .andExpect(jsonPath("$.entries[3].xp").value(0))
                .andExpect(jsonPath("$.me.rank").value(2))
                .andExpect(jsonPath("$.me.xp").value(300))
                .andReturn();

        // reproduzível: mesma entrada, mesma ordem (SC-006)
        String first = result.getResponse().getContentAsString();
        String second = mockMvc.perform(get("/leaderboard")
                        .header("Authorization", "Bearer " + tokenA))
                .andReturn().getResponse().getContentAsString();
        assertThat(second).isEqualTo(first);
    }

    @Test
    @DisplayName("semanal: só XP do período conta; reset não altera o acumulado global")
    void weeklyScope() throws Exception {
        mockMvc.perform(get("/leaderboard").param("scope", "weekly")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("weekly"))
                .andExpect(jsonPath("$.periodStart").isNotEmpty())
                .andExpect(jsonPath("$.entries[0].displayName").value("Aluno A"))
                .andExpect(jsonPath("$.entries[0].xp").value(100)) // só o grant do período
                .andExpect(jsonPath("$.me.rank").value(1))
                .andExpect(jsonPath("$.me.xp").value(100));

        // acumulado global permanece intacto (SC-005)
        mockMvc.perform(get("/leaderboard")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(jsonPath("$.entries[1].xp").value(300));
    }

    @Test
    @DisplayName("paginação estável: páginas sem repetição nem lacuna; posição própria fora da página")
    void paginationAndOwnPositionOutsidePage() throws Exception {
        var page0 = mockMvc.perform(get("/leaderboard").param("size", "2")
                        .header("Authorization", "Bearer " + tokenD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries.length()").value(2))
                .andExpect(jsonPath("$.entries[0].rank").value(1))
                .andExpect(jsonPath("$.entries[1].rank").value(2))
                // D está fora da página, mas a posição própria vem mesmo assim (SC-002)
                .andExpect(jsonPath("$.me.rank").value(4))
                .andExpect(jsonPath("$.me.xp").value(0))
                .andReturn();

        var page1 = mockMvc.perform(get("/leaderboard").param("size", "2").param("page", "1")
                        .header("Authorization", "Bearer " + tokenD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries.length()").value(2))
                .andExpect(jsonPath("$.entries[0].rank").value(3))
                .andExpect(jsonPath("$.entries[1].rank").value(4))
                .andReturn();

        // sem repetição entre páginas (SC-004)
        var ids0 = idsOf(page0.getResponse().getContentAsString());
        var ids1 = idsOf(page1.getResponse().getContentAsString());
        assertThat(ids0).doesNotContainAnyElementsOf(ids1);
        assertThat(ids0).hasSize(2);
        assertThat(ids1).hasSize(2);
    }

    @Test
    @DisplayName("parâmetros inválidos → 422 no formato padrão")
    void invalidParameters() throws Exception {
        mockMvc.perform(get("/leaderboard").param("scope", "mensal")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("validation_error"));
        mockMvc.perform(get("/leaderboard").param("page", "-1")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isUnprocessableEntity());
        mockMvc.perform(get("/leaderboard").param("size", "101")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isUnprocessableEntity());
    }

    // ---------- helpers ----------

    private UUID provision(String token) throws Exception {
        String json = mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(json);
        assertThat(m.find()).isTrue();
        return UUID.fromString(m.group(1));
    }

    private void grant(UUID profileId, int amount, Instant at) {
        jdbc.update("""
                insert into xp_grants (profile_id, amount, source, granted_at, idempotency_key)
                values (?, ?, 'seed', ?, ?)
                """, profileId, amount, java.sql.Timestamp.from(at), "seed:" + UUID.randomUUID());
    }

    private void balance(UUID profileId, long total, Instant lastGrantAt) {
        jdbc.update("""
                insert into xp_balances (profile_id, xp_total, updated_at)
                values (?, ?, ?)
                """, profileId, total, java.sql.Timestamp.from(lastGrantAt));
    }

    private java.util.List<String> idsOf(String json) {
        Matcher m = Pattern.compile("\"profileId\":\"([0-9a-f-]{36})\"").matcher(json);
        java.util.List<String> ids = new java.util.ArrayList<>();
        while (m.find()) {
            ids.add(m.group(1));
        }
        return ids;
    }
}
