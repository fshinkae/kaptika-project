package com.kaptika.api.session.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.kaptika.api.session.Area;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/**
 * Contrato do adaptador enem.dev como CONSULTA (FR-003, FR-012, FR-014) — sem
 * rede: normalização em valor transitório, descarte de inválidas, paginação por
 * área, deduplicação, consulta pontual ({@code find}) e resiliência.
 */
class EnemDevClientTest {

    private static final String BASE = "https://api.test/v1";
    private static final String URL_OFFSET_0 = BASE + "/exams/2020/questions?limit=50&offset=0";
    private static final String URL_OFFSET_50 = BASE + "/exams/2020/questions?limit=50&offset=50";

    private MockRestServiceServer server;
    private EnemDevClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE);
        server = MockRestServiceServer.bindTo(builder).build();
        client = new EnemDevClient(builder.build(),
                new EnemDevProperties(BASE, Duration.ofSeconds(2), Duration.ofSeconds(3),
                        2020, 2020, Duration.ZERO, 4, Duration.ofMinutes(1)));
    }

    @Test
    @DisplayName("normaliza questões válidas da disciplina pedida")
    void normalizesValidQuestions() {
        server.expect(requestTo(URL_OFFSET_0)).andRespond(withSuccess("""
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

        List<SourcedQuestion> questions = client.fetch(Area.LINGUAGENS, 10);

        assertThat(questions).hasSize(1);
        SourcedQuestion q = questions.getFirst();
        assertThat(q.sourceId()).isEqualTo("2020-1");
        assertThat(q.area()).isEqualTo(Area.LINGUAGENS);
        assertThat(q.statement()).isEqualTo("Assinale a correta");
        assertThat(q.context()).isEqualTo("Texto de apoio");
        assertThat(q.correctAlternative()).isEqualTo("C");
        assertThat(q.alternatives()).hasSize(5);
        server.verify();
    }

    @Test
    @DisplayName("descarta questões sem gabarito válido ou sem alternativas (FR-014)")
    void discardsInvalidQuestions() {
        server.expect(requestTo(URL_OFFSET_0)).andRespond(withSuccess("""
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
    @DisplayName("pagina até alcançar a área que só aparece em offset maior (FR-003)")
    void paginatesUntilAreaFound() {
        server.expect(requestTo(URL_OFFSET_0)).andRespond(withSuccess("""
                {"metadata": {"limit": 50, "offset": 0, "total": 180, "hasMore": true},
                 "questions": [
                  {"index": 1, "discipline": "linguagens", "title": "Ling 1",
                   "correctAlternative": "A",
                   "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"}]}
                ]}""", MediaType.APPLICATION_JSON));
        server.expect(requestTo(URL_OFFSET_50)).andRespond(withSuccess("""
                {"metadata": {"limit": 50, "offset": 50, "total": 180, "hasMore": false},
                 "questions": [
                  {"index": 95, "discipline": "matematica", "title": "Mat 95",
                   "correctAlternative": "D",
                   "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"},
                                    {"letter": "C", "text": "c"}, {"letter": "D", "text": "d"}]}
                ]}""", MediaType.APPLICATION_JSON));

        List<SourcedQuestion> questions = client.fetch(Area.MATEMATICA, 10);

        assertThat(questions).hasSize(1);
        assertThat(questions.getFirst().sourceId()).isEqualTo("2020-95");
        assertThat(questions.getFirst().area()).isEqualTo(Area.MATEMATICA);
        server.verify();
    }

    @Test
    @DisplayName("deduplica variantes de idioma com o mesmo índice (sourceId)")
    void deduplicatesSameIndex() {
        server.expect(requestTo(URL_OFFSET_0)).andRespond(withSuccess("""
                {"questions": [
                  {"index": 1, "discipline": "linguagens", "title": "Inglês",
                   "language": "ingles", "correctAlternative": "A",
                   "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"}]},
                  {"index": 1, "discipline": "linguagens", "title": "Espanhol",
                   "language": "espanhol", "correctAlternative": "A",
                   "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"}]}
                ]}""", MediaType.APPLICATION_JSON));

        List<SourcedQuestion> questions = client.fetch(Area.LINGUAGENS, 10);

        assertThat(questions).hasSize(1);
        assertThat(questions.getFirst().sourceId()).isEqualTo("2020-1");
        server.verify();
    }

    @Test
    @DisplayName("find consulta a questão pontual e serve do cache na 2ª vez")
    void findsSingleQuestionAndCaches() {
        server.expect(ExpectedCount.once(), requestTo(BASE + "/exams/2020/questions/5"))
                .andRespond(withSuccess("""
                {"index": 5, "discipline": "linguagens", "title": "Q5",
                 "correctAlternative": "A",
                 "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"}]}
                """, MediaType.APPLICATION_JSON));

        Optional<SourcedQuestion> first = client.find(2020, 5);
        assertThat(first).isPresent();
        assertThat(first.get().sourceId()).isEqualTo("2020-5");
        assertThat(first.get().correctAlternative()).isEqualTo("A");

        // segunda chamada vem do cache — sem novo request (server espera 1 só)
        assertThat(client.find(2020, 5)).isPresent();
        server.verify();
    }

    @Test
    @DisplayName("find devolve vazio quando a fonte não encontra (4xx)")
    void findReturnsEmptyOnNotFound() {
        server.expect(requestTo(BASE + "/exams/2020/questions/999"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThat(client.find(2020, 999)).isEmpty();
        server.verify();
    }

    @Test
    @DisplayName("falha transitória é retentada uma vez e depois vira 503 (FR-012)")
    void failsAfterRetry() {
        server.expect(ExpectedCount.times(2), requestTo(URL_OFFSET_0)).andRespond(withServerError());

        assertThatThrownBy(() -> client.fetch(Area.LINGUAGENS, 10))
                .isInstanceOf(QuestionSourceUnavailableException.class);
        server.verify();
    }

    @Test
    @DisplayName("uma falha seguida de sucesso: a retentativa recupera")
    void retryRecovers() {
        server.expect(requestTo(URL_OFFSET_0)).andRespond(withServerError());
        server.expect(requestTo(URL_OFFSET_0)).andRespond(withSuccess("""
                {"questions": [
                  {"index": 7, "discipline": "linguagens", "title": "Ok",
                   "correctAlternative": "B",
                   "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"},
                                    {"letter": "C", "text": "c"}]}
                ]}""", MediaType.APPLICATION_JSON));

        assertThat(client.fetch(Area.LINGUAGENS, 10)).hasSize(1);
        server.verify();
    }

    @Test
    @DisplayName("429 respeita Retry-After e recupera na tentativa seguinte")
    void retriesOn429() {
        server.expect(requestTo(URL_OFFSET_0))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", "0"));
        server.expect(requestTo(URL_OFFSET_0)).andRespond(withSuccess("""
                {"questions": [
                  {"index": 3, "discipline": "linguagens", "title": "Depois do 429",
                   "correctAlternative": "A",
                   "alternatives": [{"letter": "A", "text": "a"}, {"letter": "B", "text": "b"}]}
                ]}""", MediaType.APPLICATION_JSON));

        assertThat(client.fetch(Area.LINGUAGENS, 10)).hasSize(1);
        server.verify();
    }
}
