package com.kaptika.api.session.source;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.kaptika.api.session.Area;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Adaptador da API pública enem.dev usada APENAS como consulta (FR-003, FR-012,
 * FR-014): nada é persistido. {@code fetch} pagina a prova coletando questões da
 * área; {@code find} consulta uma questão pontual para correção/retomada. Um
 * cache em memória (Caffeine, TTL curto) evita bater na API a cada resposta e
 * respeita o rate limit (1 req/s) — não é persistência, expira sozinho.
 */
@Component
public class EnemDevClient implements QuestionSource {

    private static final Logger log = LoggerFactory.getLogger(EnemDevClient.class);
    private static final Set<String> VALID_LETTERS = Set.of("A", "B", "C", "D", "E");
    /** Placeholder que a própria enem.dev serve quando não tem a imagem. */
    private static final String MISSING_IMAGE = "broken-image";
    private static final int MAX_YEAR_ATTEMPTS = 3;
    private static final int PAGE_LIMIT = 50;
    private static final int MAX_429_ATTEMPTS = 3;
    private static final long RETRY_AFTER_CAP_MS = 5000;
    private static final ParameterizedTypeReference<Map<String, Object>> RESPONSE_TYPE =
            new ParameterizedTypeReference<>() {
            };

    private final RestClient restClient;
    private final EnemDevProperties properties;
    private final Cache<String, SourcedQuestion> questionCache;
    private long lastCallAtMillis;

    public EnemDevClient(@Qualifier("enemDevRestClient") RestClient restClient,
            EnemDevProperties properties) {
        this.properties = properties;
        this.restClient = restClient;
        this.questionCache = Caffeine.newBuilder()
                .expireAfterWrite(properties.cacheTtl())
                .maximumSize(2_000)
                .build();
    }

    @Override
    public List<SourcedQuestion> fetch(Area area, int limit) {
        List<SourcedQuestion> collected = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        List<Integer> years = shuffledYears();
        for (int i = 0; i < Math.min(MAX_YEAR_ATTEMPTS, years.size()) && collected.size() < limit; i++) {
            fetchYear(years.get(i), area, limit, collected, seen);
        }
        log.debug("enem.dev: coletadas {} questões para {} (pedido {})",
                collected.size(), area, limit);
        return collected;
    }

    @Override
    public Optional<SourcedQuestion> find(int year, int index) {
        String key = year + "-" + index;
        SourcedQuestion cached = questionCache.getIfPresent(key);
        if (cached != null) {
            return Optional.of(cached);
        }
        Map<String, Object> body = get("/exams/{year}/questions/{index}", year, index);
        if (body == null) {
            return Optional.empty();
        }
        SourcedQuestion question = normalize(body, null, year);
        if (question != null) {
            questionCache.put(question.sourceId(), question);
        }
        return Optional.ofNullable(question);
    }

    /**
     * Pagina a prova do ano (offset 0, 50, …) coletando questões da área. As
     * disciplinas do ENEM são contíguas e aparecem em offsets altos (ex.:
     * matemática ~136–180), por isso a primeira página não cobre todas as áreas.
     */
    @SuppressWarnings("unchecked")
    private void fetchYear(int year, Area area, int limit, List<SourcedQuestion> collected,
            Set<String> seen) {
        for (int page = 0; page < properties.maxPagesPerYear() && collected.size() < limit; page++) {
            Map<String, Object> body = get("/exams/{year}/questions?limit={limit}&offset={offset}",
                    year, PAGE_LIMIT, page * PAGE_LIMIT);
            if (body == null) {
                return; // 4xx (ex.: offset fora do intervalo): fim das páginas do ano
            }
            if (!(body.get("questions") instanceof List<?> list) || list.isEmpty()) {
                return;
            }
            for (Object item : list) {
                if (collected.size() >= limit) {
                    break;
                }
                if (item instanceof Map<?, ?> raw) {
                    SourcedQuestion question = normalize((Map<String, Object>) raw, area, year);
                    if (question != null && seen.add(question.sourceId())) {
                        questionCache.put(question.sourceId(), question);
                        collected.add(question);
                    }
                }
            }
            if (!hasMore(body)) {
                return;
            }
        }
    }

    /**
     * Normaliza para o valor transitório; retorna null (descarta) quando a
     * disciplina não bate (quando {@code expectedArea} é dado), o gabarito é
     * inválido, o índice falta, falta alguma imagem na fonte, ou há menos de 2
     * alternativas válidas (FR-014).
     */
    @SuppressWarnings("unchecked")
    private SourcedQuestion normalize(Map<String, Object> raw, Area expectedArea, int year) {
        if (!(raw.get("discipline") instanceof String discipline)) {
            return null;
        }
        Area area;
        if (expectedArea != null) {
            if (!expectedArea.slug().equalsIgnoreCase(discipline)) {
                return null;
            }
            area = expectedArea;
        } else {
            area = parseAreaOrNull(discipline);
            if (area == null) {
                return null;
            }
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
        String context = asText(raw.get("context"));
        // A questão remete à figura ("representada na figura"), então sem ela
        // fica insolúvel: melhor não servi-la do que servir um buraco.
        if (hasMissingImage(statement) || hasMissingImage(context)) {
            return null;
        }
        if (!(raw.get("alternatives") instanceof List<?> rawAlternatives)) {
            return null;
        }
        List<SourcedQuestion.Alternative> alternatives = new ArrayList<>();
        for (Object alt : rawAlternatives) {
            if (alt instanceof Map<?, ?> altMap) {
                String letter = asText(((Map<String, Object>) altMap).get("letter"));
                String text = asText(((Map<String, Object>) altMap).get("text"));
                String file = asText(((Map<String, Object>) altMap).get("file"));
                // Alternativa vale por texto OU imagem: descartar as que só têm
                // imagem mutilaria a questão (some a alternativa, às vezes a certa).
                if (hasMissingImage(file)) {
                    return null; // alternativa sem a imagem: a questão perde uma opção
                }
                if (letter != null && VALID_LETTERS.contains(letter.toUpperCase())
                        && (text != null || file != null)) {
                    alternatives.add(
                            new SourcedQuestion.Alternative(letter.toUpperCase(), text, file));
                }
            }
        }
        if (alternatives.size() < 2) {
            return null;
        }
        if (!(raw.get("index") instanceof Number indexNumber)) {
            return null; // índice é necessário para reconsultar a questão
        }
        int index = indexNumber.intValue();
        String sourceId = year + "-" + index;
        return new SourcedQuestion(sourceId, area, statement, context,
                correct.toUpperCase(), year, index, alternatives);
    }

    /**
     * GET com rate limit (FR-012). 429 → aguarda {@code Retry-After} e repete
     * (até {@link #MAX_429_ATTEMPTS}); 5xx/IO → uma retentativa e depois
     * {@link QuestionSourceUnavailableException} (503); demais 4xx → {@code null}.
     */
    private Map<String, Object> get(String uriTemplate, Object... uriVars) {
        for (int attempt = 1; ; attempt++) {
            throttle();
            try {
                return restClient.get()
                        .uri(uriTemplate, uriVars)
                        .retrieve()
                        .body(RESPONSE_TYPE);
            } catch (RestClientResponseException e) {
                int status = e.getStatusCode().value();
                if (status == 429) {
                    if (attempt < MAX_429_ATTEMPTS) {
                        log.warn("enem.dev 429 (tentativa {}), aguardando Retry-After", attempt);
                        sleepRetryAfter(e);
                        continue;
                    }
                    throw new QuestionSourceUnavailableException(
                            "enem.dev limitou a taxa (429) após " + attempt + " tentativas", e);
                }
                if (e.getStatusCode().is4xxClientError()) {
                    return null;
                }
                if (attempt >= 2) {
                    throw new QuestionSourceUnavailableException(
                            "enem.dev falhou após retentativa: " + e.getMessage(), e);
                }
                log.warn("enem.dev falhou (tentativa {}), repetindo: {}", attempt, e.getMessage());
            } catch (RestClientException e) {
                if (attempt >= 2) {
                    throw new QuestionSourceUnavailableException(
                            "enem.dev falhou após retentativa: " + e.getMessage(), e);
                }
                log.warn("enem.dev falhou (tentativa {}), repetindo: {}", attempt, e.getMessage());
            }
        }
    }

    /** Espaça as chamadas de saída para respeitar o rate limit (1 req/s). */
    private synchronized void throttle() {
        long interval = properties.minRequestInterval().toMillis();
        long now = System.currentTimeMillis();
        if (interval > 0) {
            long wait = lastCallAtMillis + interval - now;
            if (wait > 0) {
                sleep(wait);
                now = System.currentTimeMillis();
            }
        }
        lastCallAtMillis = now;
    }

    private void sleepRetryAfter(RestClientResponseException e) {
        long ms = 1000;
        HttpHeaders headers = e.getResponseHeaders();
        if (headers != null) {
            String retryAfter = headers.getFirst("Retry-After");
            if (retryAfter != null) {
                try {
                    ms = Long.parseLong(retryAfter.trim());
                } catch (NumberFormatException ignore) {
                    // header não numérico: usa o fallback
                }
            }
        }
        sleep(Math.min(ms, RETRY_AFTER_CAP_MS));
    }

    private static void sleep(long millis) {
        if (millis <= 0) {
            return;
        }
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static boolean hasMissingImage(String value) {
        return value != null && value.contains(MISSING_IMAGE);
    }

    private static boolean hasMore(Map<String, Object> body) {
        return body.get("metadata") instanceof Map<?, ?> metadata
                && Boolean.TRUE.equals(metadata.get("hasMore"));
    }

    private static Area parseAreaOrNull(String slug) {
        for (Area area : Area.values()) {
            if (area.slug().equalsIgnoreCase(slug)) {
                return area;
            }
        }
        return null;
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
