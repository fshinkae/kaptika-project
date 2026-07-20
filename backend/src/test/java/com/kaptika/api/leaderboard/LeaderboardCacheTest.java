package com.kaptika.api.leaderboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * FR-009 — política de atualização periódica: a página fica cacheada dentro
 * do TTL (60 s padrão deste contexto), mas a posição própria é sempre fresca.
 */
class LeaderboardCacheTest extends IntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("página respeita o TTL (stale dentro da janela); posição própria é sempre fresca")
    void pageIsCachedButOwnPositionIsFresh() throws Exception {
        String token = TestTokens.valid(UUID.randomUUID());
        String json = mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(json);
        m.find();
        UUID profileId = UUID.fromString(m.group(1));

        seedXp(profileId, 50);

        // primeira chamada popula o cache da página
        mockMvc.perform(get("/leaderboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[0].xp").value(50))
                .andExpect(jsonPath("$.me.xp").value(50));

        // novo XP dentro do TTL: página segue stale, mas o "me" reflete na hora
        seedXp(profileId, 50);
        mockMvc.perform(get("/leaderboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[0].xp").value(50)) // cacheado (FR-009)
                .andExpect(jsonPath("$.me.xp").value(100)); // fresco (FR-003)
    }

    private void seedXp(UUID profileId, int amount) {
        Instant now = Instant.now();
        jdbc.update("""
                insert into xp_grants (profile_id, amount, source, granted_at, idempotency_key)
                values (?, ?, 'seed', ?, ?)
                """, profileId, amount, java.sql.Timestamp.from(now), "seed:" + UUID.randomUUID());
        jdbc.update("""
                insert into xp_balances (profile_id, xp_total, updated_at) values (?, ?, ?)
                on conflict (profile_id) do update
                    set xp_total = xp_balances.xp_total + excluded.xp_total, updated_at = excluded.updated_at
                """, profileId, amount, java.sql.Timestamp.from(now));
    }
}
