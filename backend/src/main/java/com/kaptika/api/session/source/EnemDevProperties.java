package com.kaptika.api.session.source;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configuração do cliente enem.dev (FR-012). */
@ConfigurationProperties(prefix = "kaptika.enem-dev")
public record EnemDevProperties(
        String baseUrl,
        Duration connectTimeout,
        Duration readTimeout,
        int firstYear,
        int lastYear) {

    public EnemDevProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://api.enem.dev/v1";
        }
        if (connectTimeout == null) {
            connectTimeout = Duration.ofSeconds(2);
        }
        if (readTimeout == null) {
            readTimeout = Duration.ofSeconds(3);
        }
        if (firstYear == 0) {
            firstYear = 2015;
        }
        if (lastYear == 0) {
            lastYear = 2023;
        }
    }
}
