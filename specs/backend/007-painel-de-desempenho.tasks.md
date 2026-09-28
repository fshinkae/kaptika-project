# Tarefas: Painel de Desempenho (Backend)

**Spec:** specs/backend/007-painel-de-desempenho.md

**Plano:** specs/backend/007-painel-de-desempenho.plan.md

**Camada:** Backend

> Gerado na fase /tasks. Checklist executável. Não contém código. `[P]` = paralelizável (arquivos diferentes, sem dependência). `[Ref]` = FR/US relacionado.

## Fase 1 — Preparação

- [x] T001 [FR-009] Criar o pacote `backend/src/main/java/com/kaptika/api/performance/` com os DTOs do contrato (`PerformanceResponse`: `windowDays`, `from`, `to`, `totals`, `areas`, `recommendation`, `daily`; área exposta por `Area.slug()`; `accuracy` nulo quando `answered = 0`) em `performance/PerformanceDtos.java`

## Fase 2 — Fundação (bloqueia o resto)

- [x] T002 [FR-008,FR-009] Janela de consulta: validar `days ∈ {7, 30, 90}` (ausente → 30; outro → `InvalidRequestDataException`/422) e calcular `from`/`to` e os instantes `[from 00:00, to+1 00:00)` com `Clock` + `StreakProperties.zoneId()` em `backend/src/main/java/com/kaptika/api/performance/PerformanceWindow.java`
- [x] T003 [FR-003,FR-007] Consultas nativas filtradas por `profile_id` e janela em instantes: (1) respostas por área (`answers` ⋈ `study_sessions`), (2) respostas por dia local, (3) XP por dia local (`xp_grants`), (4) dias com `met = true` em `activity_days` — em `backend/src/main/java/com/kaptika/api/performance/PerformanceQueries.java`

## Fase 3 — História US1 (P1) 🎯 Desempenho por área

- [x] T004 [US1] [FR-001,FR-002,FR-003,FR-010] `PerformanceService` (transação `readOnly` + `REPEATABLE_READ`): monta as 4 áreas a partir das constantes de `Area` (ausente → zeros, `accuracy = null`) e os totais como soma das áreas, em `backend/src/main/java/com/kaptika/api/performance/PerformanceService.java`
- [x] T005 [US1] [FR-001,FR-011] `PerformanceController` com `GET /me/performance?days=` resolvendo o perfil via `ProfileIdResolver.resolve(jwt)` em `backend/src/main/java/com/kaptika/api/performance/PerformanceController.java`
- [x] T006 [US1] [SC-001,SC-005] Testes de integração: contagens por área com sessões ACTIVE/COMPLETED/EXPIRED; área sem respostas com `accuracy = null`; respostas fora da janela ignoradas; estudante novo → 200 zerado; sem token → 401; dois perfis isolados — em `backend/src/test/java/com/kaptika/api/performance/PerformanceFlowTest.java`

## Fase 4 — História US2 (P1) — O que melhorar

- [x] T007 [P] [US2] [FR-004,FR-005,FR-006] Componente puro de recomendação: precedência `INSUFFICIENT_DATA` → `NOT_PRACTICED` (primeira área no enum) → `LOWEST_ACCURACY` entre áreas com ≥ 10 respostas; comparação por frações exatas; desempate por menos respostas e depois ordem do enum — em `backend/src/main/java/com/kaptika/api/performance/FocusRecommender.java`
- [x] T008 [P] [US2] [SC-002] Testes unitários: todas as áreas abaixo de 10; área não praticada; menor acerto claro; empate de fração desempatado por menos respostas; empate total desempatado pelo enum; área com < 10 respostas e acerto baixo não vence — em `backend/src/test/java/com/kaptika/api/performance/FocusRecommenderTest.java`
- [x] T009 [US2] [FR-004] Ligar o `FocusRecommender` ao `PerformanceService` e incluir `recommendation` na resposta; cenário de integração com recomendação em `PerformanceFlowTest.java`

## Fase 5 — História US3 (P2) — Evolução no tempo

- [x] T010 [US3] [FR-007,FR-008] Série diária no `PerformanceService`: iterar de `from` a `to` preenchendo `xp`, `answered`, `correct` e `activeDay` (dia ausente → zeros/`false`), sempre `windowDays` pontos em ordem crescente, em `backend/src/main/java/com/kaptika/api/performance/PerformanceService.java`
- [x] T011 [US3] [SC-003] Testes de integração: 7/30/90 pontos contíguos terminando em hoje; resposta e XP às 23h50 de São Paulo contam no dia local (clock fixado); `activeDay` reflete `activity_days`; `days=15` e `days=abc` → 422 — em `backend/src/test/java/com/kaptika/api/performance/PerformanceFlowTest.java`

## Fase 6 — Conferência

- [x] T012 [SC-001..SC-005] Rodar a suíte completa do backend, conferir cada SC da spec (SC-004: medir o tempo da resposta com 90 dias de histórico nos testes; se > 500 ms, criar `V900__` com índice `answers (session_id, answered_at)`), registrar o resultado e atualizar o **Status** da spec para `Implemented`

## Dependências

- T001 bloqueia T002–T003; T002–T003 bloqueiam as histórias.
- T004 bloqueia T005, T006, T009 e T010.
- T007–T008 dependem só de T001 (DTOs) e podem rodar em paralelo com a Fase 3.
- T009 depende de T004 e T007; T011 depende de T010.
- T012 depende de todas as anteriores.

## Notas

- Nenhuma migração prevista; faixa `V9xx` reservada à 007 caso a medição do SC-004 peça índice.
- Consultas filtram a janela em **instantes** (usam índice); a conversão `at time zone` fica só no `GROUP BY`.
- Somente `SELECT`s — não chamar `StreakService` nem publicar eventos (FR-010).
- Commits por tarefa ou grupo: `feat(007): FR-XXX descrição` / `test(007): SC-XXX descrição`.
- Ao concluir, marque a caixa: `- [ ]` → `- [x]`.

## Resultado da conferência (2026-09-27)

- Suíte completa do backend (`./mvnw verify`): 117 testes, 0 falhas; 14 novos (`FocusRecommenderTest` 7, `PerformanceFlowTest` 7).
- **SC-001** atendido — contagens e taxas por área conferidas contra o cenário semeado (sessões ACTIVE/COMPLETED/EXPIRED, respostas fora da janela ignoradas).
- **SC-002** atendido — precedência e desempates cobertos nos testes unitários da recomendação.
- **SC-003** atendido — séries de 7/30/90 pontos contíguos; resposta e XP às 23h50 de São Paulo contam no dia local; janela avança na virada do dia do servidor.
- **SC-004** atendido — 90 dias × 20 respostas/dia respondem abaixo de 500 ms (Postgres embarcado) — nenhum índice novo, `V9xx` não usada.
- **SC-005** atendido — estudante novo não vê dados de outro; sem token → 401.
