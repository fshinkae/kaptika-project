# Tarefas: Análise de IA da Sessão (Backend)

**Spec:** specs/backend/008-analise-ia-da-sessao.md

**Plano:** specs/backend/008-analise-ia-da-sessao.plan.md

**Camada:** Backend

> Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Preparação

- [x] T001 [FR-005] Dependência `com.anthropic:anthropic-java` no `backend/pom.xml` e bloco `kaptika.ai` em `application.yml` (`AI_API_KEY`)

## Fase 2 — Fundação

- [x] T002 [FR-005,FR-008] `AiProperties`, porta `AiFeedbackClient` e `AnthropicFeedbackClient` em `backend/src/main/java/com/kaptika/api/feedback/`
- [x] T003 [FR-002,FR-003] `SessionService.reviewOf` + DTO `SessionReview`
- [x] T004 [P] [FR-004] `FeedbackPrompt` determinístico e teste unitário (sem enunciado, tamanho pequeno)

## Fase 3 — US1 (P1) Análise da sessão

- [x] T005 [US1] [FR-001,FR-006,FR-009] `FeedbackService` (cache por sessão) e `FeedbackController`
- [x] T006 [US1] [SC-003] `FeedbackFlowTest`: 200 com stub da IA, cache sem segunda chamada

## Fase 4 — US2 (P1) Proteção e falhas

- [x] T007 [US2] [FR-007,FR-008] Exceções, limite diário e handlers (409, 429, 503) em `GlobalExceptionHandler`
- [x] T008 [US2] [SC-003] Testes: 404 alheia, 409 ativa, 503 falha da IA, 429 limite, 401 sem token
- [x] T009 [P] [FR-005] `AnthropicFeedbackClientTest` contra servidor HTTP local (modelo, `max_tokens`, parse do texto, erro → 503)

## Fase 5 — Conferência

- [x] T010 `./mvnw verify` verde (JaCoCo ≥ 80%) e Status da spec → Implemented

## Dependências

T001 → T002 → T005; T003 → T005; T005 → T006/T007 → T008.
