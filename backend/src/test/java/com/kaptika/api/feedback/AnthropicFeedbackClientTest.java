package com.kaptika.api.feedback;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kaptika.api.feedback.FeedbackExceptions.AiUnavailableException;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Adaptador da Anthropic contra um servidor HTTP local (sem rede externa). */
class AnthropicFeedbackClientTest {

    private static final String OK_BODY = """
            {"id":"msg_1","type":"message","role":"assistant","model":"claude-haiku-4-5",
             "content":[{"type":"text","text":"  Bom trabalho. Revise frações.  "}],
             "stop_reason":"end_turn","stop_sequence":null,
             "usage":{"input_tokens":90,"output_tokens":12}}
            """;

    private final List<String> requests = new CopyOnWriteArrayList<>();
    private HttpServer server;

    @AfterEach
    void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("envia modelo, limite de saída e chave; devolve o texto aparado")
    void sendsCompactRequest() throws Exception {
        String baseUrl = start(200, OK_BODY);

        String text = client("chave-teste", baseUrl).complete("sistema", "dados da sessão");

        assertThat(text).isEqualTo("Bom trabalho. Revise frações.");
        assertThat(requests).hasSize(1);
        assertThat(requests.get(0))
                .contains("x-api-key=chave-teste")
                .contains("\"model\":\"claude-haiku-4-5\"")
                .contains("\"max_tokens\":200")
                .contains("dados da sessão");
    }

    @Test
    @DisplayName("erro do provedor vira AiUnavailableException")
    void providerErrorIsUnavailable() throws Exception {
        String baseUrl = start(500, "{\"type\":\"error\",\"error\":{\"type\":\"api_error\",\"message\":\"x\"}}");

        assertThatThrownBy(() -> client("chave-teste", baseUrl).complete("s", "u"))
                .isInstanceOf(AiUnavailableException.class);
    }

    @Test
    @DisplayName("sem chave: não chama o provedor e responde indisponível")
    void withoutKeyIsUnavailable() {
        assertThatThrownBy(() -> client("", "http://localhost:1").complete("s", "u"))
                .isInstanceOf(AiUnavailableException.class);
    }

    private AnthropicFeedbackClient client(String key, String baseUrl) {
        return new AnthropicFeedbackClient(new AiProperties(key, baseUrl, "claude-haiku-4-5",
                200, Duration.ofSeconds(2), 20));
    }

    private String start(int status, String body) throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/v1/messages", exchange -> {
            String received = new String(exchange.getRequestBody().readAllBytes(),
                    StandardCharsets.UTF_8);
            requests.add("x-api-key=" + exchange.getRequestHeaders().getFirst("x-api-key")
                    + " " + received);
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        return "http://localhost:" + server.getAddress().getPort();
    }
}
