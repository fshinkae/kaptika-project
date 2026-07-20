# Tarefas: Sessões de Estudo (Backend)

**Spec:** specs/backend/002-sessoes-de-estudo.md

**Plano:** specs/backend/002-sessoes-de-estudo.plan.md

**Camada:** Backend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Preparação

- [x] T001 Documentar numeração Flyway por feature (V2xx..V6xx) em `CLAUDE.md`

## Fase 2 — Fundação (bloqueia o resto)

- [x] T002 [FR-015] Migração `V200__create_sessions.sql` (questions, question_alternatives, study_sessions c/ unique parcial ACTIVE, session_questions, answers c/ unique) em `backend/src/main/resources/db/migration/`
- [x] T003 [FR-010] Contrato de eventos `CorrectAnswerRecorded` e `SessionCompleted` em `backend/src/main/java/com/kaptika/api/events/`
- [x] T004 [FR-003] Entidades e repositórios (Question, StudySession, SessionQuestion, Answer, Area) em `backend/src/main/java/com/kaptika/api/session/`

## Fase 3 — História US1 (P1) 🎯 Ciclo de vida e correção

- [x] T005 [US1] [FR-001..005,009,011,013] `SessionService`: montagem (cache + não-repetição 30d), resposta com correção, finish com resumo e eventos em `backend/src/main/java/com/kaptika/api/session/`
- [x] T006 [US1] [FR-004] `SessionController` + DTOs sem gabarito + novos mapeamentos de erro (409/503) em `backend/src/main/java/com/kaptika/api/session/` e `common/`
- [x] T007 [US1] [SC-001,SC-006] Testes de fluxo: criar/responder/encerrar, limite 20, acervo insuficiente, gabarito nunca exposto em `backend/src/test/java/com/kaptika/api/session/`

## Fase 4 — História US2 (P1) — Idempotência e retomada

- [x] T008 [US2] [SC-002,SC-003] Testes: reenvio idempotente, alteração recusada (409), retomada de estado, sessão ativa única, eventos sem duplicação em `backend/src/test/java/com/kaptika/api/session/`

## Fase 5 — História US3 (P2) — Resiliência enem.dev

- [x] T009 [US3] [FR-003,012,014] `EnemDevClient` (RestClient, timeouts 2s/3s, 1 retry, normalização, descarte de gabarito inválido) em `backend/src/main/java/com/kaptika/api/session/source/`
- [x] T010 [P] [US3] [SC-005] Testes do cliente com `MockRestServiceServer`: normalização, filtro de validade, 500/timeout → 503 sem sessão corrompida em `backend/src/test/java/com/kaptika/api/session/source/`

## Fase 6 — Conferência

- [x] T011 Rodar suíte completa + JaCoCo, conferir SC-001..006, registrar resultado e atualizar Status da spec

## Dependências

- T002–T004 bloqueiam T005+; T005 bloqueia T006–T008; T009 bloqueia T010.
- T007/T008 usam stub de `QuestionSource` (não dependem de T009).

## Notas

- Commit por tarefa ou grupo coeso: `tipo(002): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.

## Resultado da conferência (T011 — 2026-07-19)

Suíte: **34 testes, 0 falhas** (`./mvnw verify`). Cobertura JaCoCo: **90,5% de linhas** (gate 80%).

| SC | Resultado | Evidência |
|---|---|---|
| SC-001 | ✅ | `fullLifecycle`: sessão criada com exatamente 20 questões (alvo respeitado) |
| SC-002 | ✅ | `answerIdempotency`: reenvio → mesmo resultado, contagem inalterada; unique (session, question) no banco |
| SC-003 | ✅ | `EventProbe`: 1 evento por acerto e por conclusão, mesmo com reenvio/finish repetido |
| SC-004 | ✅* | Correção server-side sem chamada externa no caminho da resposta; p95 real em staging |
| SC-005 | ✅ | `EnemDevClientTest`: 500/timeout → retry 1× → `question_source_unavailable` (503); sessão nunca meio-criada (transacional) |
| SC-006 | ✅ | Asserções de que `correctAlternative` não aparece em nenhum payload de sessão/estado |

\* verificado funcionalmente; métrica de produção depende de ambiente real.
