package com.kaptika.api.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kaptika.api.support.IntegrationTest;
import com.kaptika.api.support.TestTokens;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * US2 — Provisionar e servir o perfil interno (SC-002, SC-003).
 * US3 — Atualizar dados do perfil (422 e posse).
 */
class ProfileFlowTest extends IntegrationTest {

    @Autowired
    private ProfileService profileService;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("primeiro acesso provisiona exatamente um perfil com nome do user_metadata")
    void firstAccessProvisionsProfile() throws Exception {
        UUID sub = UUID.randomUUID();
        String token = TestTokens.valid(sub, Map.of("user_metadata", Map.of("name", "João Silva")));

        mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.displayName").value("João Silva"))
                .andExpect(jsonPath("$.avatarUrl").isEmpty())
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.progress.xpTotal").value(0))
                .andExpect(jsonPath("$.progress.level").value(1))
                .andExpect(jsonPath("$.progress.xpToNextLevel").value(100))
                .andExpect(jsonPath("$.progress.streakCurrent").value(0))
                .andExpect(jsonPath("$.progress.badgesCount").value(0));

        assertThat(countProfiles(sub)).isEqualTo(1);

        // segundo acesso: não duplica e atualiza o último acesso (FR-009)
        Instant firstAccess = lastAccessAt(sub);
        Thread.sleep(30);
        mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        assertThat(countProfiles(sub)).isEqualTo(1);
        assertThat(lastAccessAt(sub)).isAfter(firstAccess);
    }

    @Test
    @DisplayName("provisionamento concorrente cria um único perfil (SC-003)")
    void concurrentProvisioningCreatesSingleProfile() throws Exception {
        UUID sub = UUID.randomUUID();
        int threads = 8;
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger failures = new AtomicInteger();

        try (ExecutorService executor = Executors.newFixedThreadPool(threads)) {
            for (int i = 0; i < threads; i++) {
                executor.submit(() -> {
                    try {
                        start.await();
                        profileService.ensureProfile(sub, "Concorrente");
                    } catch (Exception e) {
                        failures.incrementAndGet();
                    }
                });
            }
            start.countDown();
            executor.shutdown();
            assertThat(executor.awaitTermination(30, TimeUnit.SECONDS)).isTrue();
        }

        assertThat(failures.get()).isZero();
        assertThat(countProfiles(sub)).isEqualTo(1);
    }

    @Test
    @DisplayName("sem user_metadata usa a parte local do e-mail; sem nada usável, 'Estudante'")
    void displayNameFallbacks() throws Exception {
        UUID withEmail = UUID.randomUUID();
        mockMvc.perform(get("/me").header("Authorization",
                        "Bearer " + TestTokens.valid(withEmail, Map.of("email", "maria@escola.br"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("maria"));

        UUID withShortEmail = UUID.randomUUID();
        mockMvc.perform(get("/me").header("Authorization",
                        "Bearer " + TestTokens.valid(withShortEmail, Map.of("email", "a@x.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Estudante"));
    }

    @Test
    @DisplayName("PATCH /me atualiza nome (com trim) e avatar do próprio estudante")
    void patchUpdatesOwnProfile() throws Exception {
        UUID sub = UUID.randomUUID();
        String token = TestTokens.valid(sub);

        mockMvc.perform(patch("/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"  Ana Estudos  ",
                                 "avatarUrl":"https://cdn.exemplo.com/a.png"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Ana Estudos"))
                .andExpect(jsonPath("$.avatarUrl").value("https://cdn.exemplo.com/a.png"));

        mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.displayName").value("Ana Estudos"))
                .andExpect(jsonPath("$.avatarUrl").value("https://cdn.exemplo.com/a.png"));
    }

    @Test
    @DisplayName("PATCH parcial: campos ausentes preservam os valores atuais")
    void patchPartialKeepsValues() throws Exception {
        UUID sub = UUID.randomUUID();
        String token = TestTokens.valid(sub, Map.of("user_metadata", Map.of("name", "Original")));

        mockMvc.perform(get("/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Original"));
    }

    @Test
    @DisplayName("nome inválido → 422 com a regra violada (curto, longo e só espaços)")
    void patchRejectsInvalidNames() throws Exception {
        UUID sub = UUID.randomUUID();
        String token = TestTokens.valid(sub);
        List<String> invalidNames = List.of("\"x\"", "\"" + "a".repeat(41) + "\"", "\"   \"");

        for (String name : invalidNames) {
            mockMvc.perform(patch("/me")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"displayName\":" + name + "}"))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.code").value("validation_error"))
                    .andExpect(jsonPath("$.message").isNotEmpty())
                    .andExpect(jsonPath("$.correlationId").isNotEmpty());
        }
    }

    @Test
    @DisplayName("avatar que não é URL http(s) → 422")
    void patchRejectsInvalidAvatar() throws Exception {
        mockMvc.perform(patch("/me")
                        .header("Authorization", "Bearer " + TestTokens.valid(UUID.randomUUID()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarUrl\":\"ftp://cdn.exemplo.com/a.png\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("validation_error"));
    }

    @Test
    @DisplayName("cada estudante só enxerga e altera o próprio perfil (SC-002)")
    void studentsAreIsolated() throws Exception {
        UUID subA = UUID.randomUUID();
        UUID subB = UUID.randomUUID();
        String tokenA = TestTokens.valid(subA, Map.of("user_metadata", Map.of("name", "Aluno A")));
        String tokenB = TestTokens.valid(subB, Map.of("user_metadata", Map.of("name", "Aluno B")));

        mockMvc.perform(get("/me").header("Authorization", "Bearer " + tokenA))
                .andExpect(jsonPath("$.displayName").value("Aluno A"));
        mockMvc.perform(get("/me").header("Authorization", "Bearer " + tokenB))
                .andExpect(jsonPath("$.displayName").value("Aluno B"));

        // A altera o próprio nome; B permanece intacto
        mockMvc.perform(patch("/me")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"A Renomeado\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/me").header("Authorization", "Bearer " + tokenB))
                .andExpect(jsonPath("$.displayName").value("Aluno B"));

        // nomes repetidos são permitidos; ids internos desambiguam (FR-008)
        mockMvc.perform(patch("/me")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"A Renomeado\"}"))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject(
                "select count(distinct id) from profiles where display_name = 'A Renomeado'",
                Long.class)).isEqualTo(2);
    }

    private long countProfiles(UUID sub) {
        Long count = jdbc.queryForObject(
                "select count(*) from profiles where supabase_id = ?", Long.class, sub);
        return count != null ? count : -1;
    }

    private Instant lastAccessAt(UUID sub) {
        return jdbc.queryForObject(
                "select last_access_at from profiles where supabase_id = ?",
                java.sql.Timestamp.class, sub).toInstant();
    }
}
