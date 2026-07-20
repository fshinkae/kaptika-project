package com.kaptika.api.session.source;

import com.kaptika.api.session.Area;
import com.kaptika.api.session.Question;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Adaptador da API pública enem.dev (FR-003, FR-012, FR-014).
 * Estratégia: sorteia anos de prova e coleta questões da disciplina até
 * cobrir o pedido (máx. 3 anos por chamada). Questões sem gabarito A–E ou
 * sem alternativas válidas são descartadas na normalização.
 */
@Component
public class EnemDevClient implements QuestionSource {

    private static final Logger log = LoggerFactory.getLogger(EnemDevClient.class);
    private static final Set<String> VALID_LETTERS = Set.of("A", "B", "C", "D", "E");
    private static final int MAX_YEAR_ATTEMPTS = 3;
    private static final int PAGE_LIMIT = 50;

    private final RestClient restClient;
    private final EnemDevProperties properties;

    public EnemDevClient(@Qualifier("enemDevRestClient") RestClient restClient,
            EnemDevProperties properties) {
        this.properties = properties;
        this.restClient = restClient;
    }

    @Override
    public List<Question> fetch(Area area, int limit) {
        List<Question> collected = new ArrayList<>();
        List<Integer> years = shuffledYears();
        for (int i = 0; i < Math.min(MAX_YEAR_ATTEMPTS, years.size()) && collected.size() < limit; i++) {
            collected.addAll(fetchYear(years.get(i), area, limit - collected.size()));
        }
        log.debug("enem.dev: coletadas {} questões para {} (pedido {})",
                collected.size(), area, limit);
        return collected;
    }

    @SuppressWarnings("unchecked")
    private List<Question> fetchYear(int year, Area area, int limit) {
        Map<String, Object> body = getWithSingleRetry(year);
        Object rawQuestions = body == null ? null : body.get("questions");
        if (!(rawQuestions instanceof List<?> list)) {
            return List.of();
        }
        List<Question> normalized = new ArrayList<>();
        for (Object item : list) {
            if (normalized.size() >= limit) {
                break;
            }
            if (item instanceof Map<?, ?> raw) {
                Question question = normalize((Map<String, Object>) raw, area, year);
                if (question != null) {
                    normalized.add(question);
                }
            }
        }
        return normalized;
    }

    /** Uma retentativa para falhas transitórias; depois, 503 (FR-012). */
    private Map<String, Object> getWithSingleRetry(int year) {
        for (int attempt = 1; ; attempt++) {
            try {
                return restClient.get()
                        .uri("/exams/{year}/questions?limit={limit}", year, PAGE_LIMIT)
                        .retrieve()
                        .body(new ParameterizedTypeReference<Map<String, Object>>() {
                        });
            } catch (RestClientException e) {
                if (attempt >= 2) {
                    throw new QuestionSourceUnavailableException(
                            "enem.dev falhou após retentativa: " + e.getMessage(), e);
                }
                log.warn("enem.dev falhou (tentativa {}), repetindo: {}", attempt, e.getMessage());
            }
        }
    }

    /**
     * Normaliza para o formato interno; retorna null (descarta) quando a
     * disciplina não bate ou o gabarito/alternativas são inválidos (FR-014).
     */
    @SuppressWarnings("unchecked")
    private Question normalize(Map<String, Object> raw, Area area, int year) {
        if (!(raw.get("discipline") instanceof String discipline)
                || !area.slug().equalsIgnoreCase(discipline)) {
            return null;
        }
        String correct = asText(raw.get("correctAlternative"));
        if (correct == null || !VALID_LETTERS.contains(correct.toUpperCase())) {
            return null; // sem gabarito válido (anulada/malformada)
        }
        String statement = firstNonBlank(asText(raw.get("alternativesIntroduction")),
                asText(raw.get("title")));
        if (statement == null) {
            return null;
        }
        if (!(raw.get("alternatives") instanceof List<?> rawAlternatives)) {
            return null;
        }
        List<Question.Alternative> alternatives = new ArrayList<>();
        for (Object alt : rawAlternatives) {
            if (alt instanceof Map<?, ?> altMap) {
                String letter = asText(((Map<String, Object>) altMap).get("letter"));
                String text = asText(((Map<String, Object>) altMap).get("text"));
                if (letter != null && VALID_LETTERS.contains(letter.toUpperCase()) && text != null) {
                    alternatives.add(new Question.Alternative(letter.toUpperCase(), text));
                }
            }
        }
        if (alternatives.size() < 2) {
            return null;
        }
        Object index = raw.get("index");
        String sourceId = year + "-" + (index != null ? index : statement.hashCode());
        return new Question(sourceId, area, statement, asText(raw.get("context")),
                correct.toUpperCase(), year, alternatives);
    }

    private List<Integer> shuffledYears() {
        List<Integer> years = new ArrayList<>();
        for (int y = properties.firstYear(); y <= properties.lastYear(); y++) {
            years.add(y);
        }
        java.util.Collections.shuffle(years, ThreadLocalRandom.current());
        return years;
    }

    private static String asText(Object value) {
        return value instanceof String s && !s.isBlank() ? s : null;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null) {
                return v;
            }
        }
        return null;
    }

    @Configuration
    @EnableConfigurationProperties(EnemDevProperties.class)
    static class EnemDevConfig {

        /** RestClient com timeouts de conexão/leitura (FR-012). */
        @Bean
        RestClient enemDevRestClient(EnemDevProperties properties) {
            JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                    java.net.http.HttpClient.newBuilder()
                            .connectTimeout(properties.connectTimeout())
                            .build());
            requestFactory.setReadTimeout(properties.readTimeout());
            return RestClient.builder()
                    .baseUrl(properties.baseUrl())
                    .requestFactory(requestFactory)
                    .build();
        }
    }
}
