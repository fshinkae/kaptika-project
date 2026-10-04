package com.kaptika.api.feedback;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicException;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.TextBlock;
import com.kaptika.api.feedback.FeedbackExceptions.AiUnavailableException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

/**
 * Adaptador da Messages API da Anthropic (SDK oficial). Modelo rápido, saída
 * curta e timeout baixo (FR-005). Sem chave configurada o cliente nem é criado
 * e toda chamada vira 503. Nunca loga a chave nem o prompt (FR-008).
 */
@Component
public class AnthropicFeedbackClient implements AiFeedbackClient {

    private static final Logger log = LoggerFactory.getLogger(AnthropicFeedbackClient.class);
    private static final double TEMPERATURE = 0.3;

    private final AiProperties properties;
    private final AnthropicClient client;

    public AnthropicFeedbackClient(AiProperties properties) {
        this.properties = properties;
        this.client = !properties.enabled() ? null
                : AnthropicOkHttpClient.builder()
                        .apiKey(properties.apiKey())
                        .baseUrl(properties.baseUrl())
                        .timeout(properties.timeout())
                        .maxRetries(1)
                        .build();
    }

    @Override
    public String complete(String system, String user) {
        if (client == null) {
            throw new AiUnavailableException();
        }
        MessageCreateParams params = MessageCreateParams.builder()
                .model(properties.model())
                .maxTokens(properties.maxTokens())
                .temperature(TEMPERATURE)
                .system(system)
                .addUserMessage(user)
                .build();
        Message response;
        try {
            response = client.messages().create(params);
        } catch (AnthropicException e) {
            log.warn("Provedor de IA indisponível: {}", e.getClass().getSimpleName());
            throw new AiUnavailableException();
        }
        String text = response.content().stream()
                .flatMap(block -> block.text().stream())
                .map(TextBlock::text)
                .collect(Collectors.joining())
                .strip();
        if (text.isEmpty()) {
            throw new AiUnavailableException();
        }
        return text;
    }

    @Configuration
    @EnableConfigurationProperties(AiProperties.class)
    static class AiConfig {
    }
}
