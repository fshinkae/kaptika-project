package com.kaptika.api.profile;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

/** Unidade: derivação do nome de exibição inicial a partir das claims. */
class DisplayNamesTest {

    @Test
    @DisplayName("prefere user_metadata.name")
    void prefersMetadataName() {
        Jwt jwt = jwt(Map.of("user_metadata", Map.of("name", "Maria Clara")));
        assertThat(DisplayNames.initialFrom(jwt)).isEqualTo("Maria Clara");
    }

    @Test
    @DisplayName("usa full_name quando name está ausente ou em branco")
    void fallsBackToFullName() {
        Jwt jwt = jwt(Map.of("user_metadata", Map.of("name", "  ", "full_name", "M. Clara")));
        assertThat(DisplayNames.initialFrom(jwt)).isEqualTo("M. Clara");
    }

    @Test
    @DisplayName("sem metadata usa a parte local do e-mail")
    void fallsBackToEmailLocalPart() {
        Jwt jwt = jwt(Map.of("email", "joao.pedro@escola.br"));
        assertThat(DisplayNames.initialFrom(jwt)).isEqualTo("joao.pedro");
    }

    @Test
    @DisplayName("nome longo é truncado em 40 caracteres")
    void truncatesLongNames() {
        String longName = "A".repeat(60);
        Jwt jwt = jwt(Map.of("user_metadata", Map.of("name", longName)));
        assertThat(DisplayNames.initialFrom(jwt)).hasSize(40);
    }

    @Test
    @DisplayName("sem claims utilizáveis cai no fallback 'Estudante'")
    void fallsBackToDefault() {
        assertThat(DisplayNames.initialFrom(jwt(Map.of()))).isEqualTo("Estudante");
        assertThat(DisplayNames.initialFrom(jwt(Map.of("email", "a@x.com"))))
                .isEqualTo("Estudante");
        assertThat(DisplayNames.initialFrom(jwt(Map.of("email", "sem-arroba"))))
                .isEqualTo("Estudante");
    }

    private Jwt jwt(Map<String, Object> claims) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject("00000000-0000-0000-0000-000000000001");
        claims.forEach(builder::claim);
        return builder.build();
    }
}
