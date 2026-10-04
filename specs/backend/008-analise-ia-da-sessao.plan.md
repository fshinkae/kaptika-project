# Plano de Implementação: Análise de IA da Sessão (Backend)

**Spec:** specs/backend/008-analise-ia-da-sessao.md

**Camada:** Backend

## Resumo

Endpoint `POST /sessions/{id}/feedback` que monta um prompt compacto a partir das respostas da sessão e do desempenho de 30 dias e pede a Claude Haiku 4.5 uma análise de até 3 frases. Sem persistência.

## Decisões

- **Provedor**: Anthropic, `claude-haiku-4-5`, SDK oficial `com.anthropic:anthropic-java`. Haiku por latência e custo; saída curta.
- **Sem RAG**: o contexto é pequeno e já agregado; pré-computar em código é mais barato e rápido.
- **Sem persistência**: decisão do produto. Cache Caffeine por sessão (10 min) só evita cobrança duplicada.
- **Limite**: 20 análises por estudante por dia, em memória (Caffeine, 24h).
- **Tokens**: sem enunciado; sequência de acertos como `CEC..`; system prompt curto; `max_tokens` 200; `temperature` 0.3. Sem prompt caching (prompt abaixo do mínimo cacheável).

## Abordagem técnica

### Backend

- Pacote `com.kaptika.api.feedback`:
  - `AiProperties` (`kaptika.ai`: `api-key`, `base-url`, `model`, `max-tokens`, `timeout`, `daily-limit`).
  - `AiFeedbackClient` (porta) + `AnthropicFeedbackClient` (SDK; cliente só criado com chave).
  - `FeedbackPrompt`: montagem determinística do prompt.
  - `FeedbackService`: posse/estado via `SessionService.reviewOf`, contexto via `PerformanceService.performanceOf(profileId, "30")`, cache e limite, chamada à IA fora de transação.
  - `FeedbackController` e `FeedbackExceptions` (`AiUnavailableException` → 503, `FeedbackRateLimitedException` → 429, `SessionNotFinishedException` → 409).
- `SessionService.reviewOf` (readOnly): área, status, total e resultados ordenados. Reutiliza `owned()`.
- `GlobalExceptionHandler`: novos handlers.
- `application.yml`: bloco `kaptika.ai` com `${AI_API_KEY:}`.

## Rastreabilidade (spec → plano)

| Requisito | Onde |
|---|---|
| FR-001, FR-009 | `FeedbackController`, `FeedbackService` |
| FR-002, FR-003 | `SessionService.reviewOf`, `FeedbackService` |
| FR-004, FR-005 | `FeedbackPrompt`, `AnthropicFeedbackClient` |
| FR-006, FR-007 | `FeedbackService` (Caffeine) |
| FR-008 | `FeedbackExceptions`, `GlobalExceptionHandler` |

## Riscos e pontos de atenção

- Custo: limite diário e cache. Latência: timeout 10s e 1 retry.
- Limites em memória não são compartilhados entre instâncias do Cloud Run.

## Fora de escopo

- Explicação questão a questão (exigiria enunciados e mais tokens).
- Streaming da resposta.
