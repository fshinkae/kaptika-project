package com.kaptika.api.session.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.kaptika.api.session.Area;
import com.kaptika.api.session.Question;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/**
 * Contrato do adaptador enem.dev (FR-003, FR-012, FR-014) — sem rede:
 * normalização, descarte de questões inválidas e resiliência (retry → 503).
 */
class EnemDevClientTest {

    private static final String URL = "https://api.test/v1/exams/2020/questions?limit=50";

    private MockRestServiceServer server;
    private EnemDevClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.test/v1");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new EnemDevClient(builder.build(),
                new EnemDevProperties("https://api.test/v1",
                        Duration.ofSeconds(2), Duration.ofSeconds(3), 2020, 2020));
    }

    @Test
    @DisplayName("normaliza questões válidas da disciplina pedida")
    void normalizesValidQuestions() {
        server.expect(requestTo(URL)).andRespond(withSuccess("""
                {"questions": [
                  {"index": 1, "discipline": "linguagens", "title": "Questão 1",
                   "alternativesIntroduction": "Assinale a correta",
                   "context": "Texto de apoio",
                   "correctAlternative": "C",
                   "alternatives": [
                     {"letter": "A", "text": "alt A"}, {"letter": "B", "text": "alt B"},
                     {"letter": "C", "text": "alt C"}, {"letter": "D", "text": "alt D"},
                     {"letter": "E", "text": "alt E"}]},
                  {"index": 2, "discipline": "matematica", "title": "De outra área",
                   "correctAlternative": "A",
                   "alternatives": [{"letter": "A", "text": "x"}, {"letter": "B", "text": "y"}]}
                ]}""", MediaType.APPLICATION_JSON));

        List<Question> questions = client.fetch(Area.LINGUAGENS, 10);

        assertThat(questions).hasSize(1);
        Question q = questions.getFirst();
        assertThat(q.getSourceId()).isEqualTo("2020-1");
        assertThat(q.getArea()).isEqualTo(Area.LINGUAGENS);
        assertThat(q.getStatement()).isEqualTo("Assinale a correta");
        assertThat(q.getContext()).isEqualTo("Texto de apoio");
        assertThat(q.getCorrectAlternative()).isEqualTo("C");
        assertThat(q.getAlternatives()).hasSize(5);
        server.verify();
    }

    @Test
    @DisplayName("descarta questões sem gabarito válido ou sem alternativas (FR-014)")
    void discardsInvalidQuestions() {
        server.expect(requestTo(URL)).andRespond(withSuccess("""
                {"questions": [
                  {"index": 1, "discipline": "linguagens", "title": "Anulada",
                   "correctAlternative": "X",
                   "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"}]},
                  {"index": 2, "discipline": "linguagens", "title": "Sem gabarito",
                   "correctAlternative": null,
                   "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"}]},
                  {"index": 3, "discipline": "linguagens", "title": "Uma alternativa só",
                   "correctAlternative": "A",
                   "alternatives": [{"letter": "A", "text": "a"}]}
                ]}""", MediaType.APPLICATION_JSON));

        assertThat(client.fetch(Area.LINGUAGENS, 10)).isEmpty();
        server.verify();
    }

    @Test
    @DisplayName("falha transitória é retentada uma vez e depois vira 503 (FR-012)")
    void failsAfterRetry() {
        server.expect(ExpectedCount.times(2), requestTo(URL)).andRespond(withServerError());

        assertThatThrownBy(() -> client.fetch(Area.LINGUAGENS, 10))
                .isInstanceOf(QuestionSourceUnavailableException.class);
        server.verify();
    }

    @Test
    @DisplayName("uma falha seguida de sucesso: a retentativa recupera")
    void retryRecovers() {
        server.expect(requestTo(URL)).andRespond(withServerError());
        server.expect(requestTo(URL)).andRespond(withSuccess("""
                {"questions": [
                  {"index": 7, "discipline": "linguagens", "title": "Ok",
                   "correctAlternative": "B",
                   "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"},
                                    {"letter": "C", "text": "c"}]}
                ]}""", MediaType.APPLICATION_JSON));

        assertThat(client.fetch(Area.LINGUAGENS, 10)).hasSize(1);
        server.verify();
    }
}
