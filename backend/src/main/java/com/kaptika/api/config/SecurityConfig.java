package com.kaptika.api.config;

import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * API stateless protegida como OAuth2 Resource Server (FR-001..003).
 * O Supabase Auth é o emissor; a API só valida assinatura (JWKS) e
 * janelas temporais, com tolerância de 60s para relógios dessincronizados.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(SupabaseProperties.class)
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
            RestAuthenticationEntryPoint entryPoint) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint(entryPoint))
                .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint));
        return http.build();
    }

    /**
     * CORS para o frontend (SPA em origem distinta). Habilita o preflight
     * OPTIONS — que não carrega o Bearer — a passar sem 401. Origens vêm de
     * {@code kaptika.cors.allowed-origins} (lista separada por vírgula).
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${kaptika.cors.allowed-origins:http://localhost:5173}") List<String> allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Correlation-Id"));
        config.setExposedHeaders(List.of("X-Correlation-Id"));
        config.setMaxAge(Duration.ofHours(1));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Decoder com JWKS do Supabase: o cache/refresh interno do Nimbus absorve a
     * rotação de chaves sem indisponibilidade (FR-010, SC-005).
     * Substituído nos testes por um decoder de chave local.
     *
     * O Supabase assina os JWT com ES256 (chaves de assinatura assimétricas
     * atuais); RS256 fica declarado para resiliência caso a chave do projeto
     * seja rotacionada para RSA. Sem isso, o Nimbus assume só RS256 e rejeita
     * os tokens ES256 do Supabase com 401.
     */
    @Bean
    JwtDecoder jwtDecoder(SupabaseProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(properties.jwksUri())
                .jwsAlgorithm(SignatureAlgorithm.ES256)
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<Jwt>(
                new JwtTimestampValidator(Duration.ofSeconds(60))));
        return decoder;
    }
}
