package com.kaptika.api.feedback;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configuração do provedor de IA da análise da sessão (008). Chave vazia = IA desligada. */
@ConfigurationProperties(prefix = "kaptika.ai")
public record AiProperties(
        String apiKey,
        String baseUrl,
        String model,
        long maxTokens,
        Duration timeout,
        int dailyLimit) {

    public AiProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://api.anthropic.com";
        }
        if (model == null || model.isBlank()) {
            model = "claude-haiku-4-5";
        }
        if (maxTokens <= 0) {
            maxTokens = 200;
        }
        if (timeout == null) {
            timeout = Duration.ofSeconds(10);
        }
        if (dailyLimit <= 0) {
            dailyLimit = 20;
        }
    }

    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank();
    }
}
