# Tarefas: Ofensiva Diária / Streak (Backend)

**Spec:** specs/backend/004-ofensiva-diaria-streak.md

**Plano:** specs/backend/004-ofensiva-diaria-streak.plan.md

**Camada:** Backend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Preparação

- [x] T001 [FR-002] Propriedades da feature (`kaptika.streak.zone`, cron do job) e configuração do pacote (`Clock` injetável + `@EnableScheduling`) em `backend/src/main/java/com/kaptika/api/streak/` e `application.yml`

## Fase 2 — Fundação (bloqueia o resto)

- [x] T002 [FR-010] Migração `V400__create_streaks.sql` (streaks, activity_days PK composta, streak_event_dedupe) em `backend/src/main/resources/db/migration/`
- [x] T003 [FR-010] Entidades e repositórios (Streak com lock pessimista, ActivityDay, StreakEventDedupe) em `backend/src/main/java/com/kaptika/api/streak/`

## Fase 3 — História US1 (P1) 🎯 Manter/quebrar com autoridade do servidor

- [x] T004 [US1] [FR-001..004,008,009] `StreakService`: registrar cumprimento (dedupe → dia local → lock → reconciliar → incrementar/recorde/freeze bônus) e reconciliação de dias perdidos (freeze/quebra) em `backend/src/main/java/com/kaptika/api/streak/`
- [x] T005 [US1] [FR-001] Listener `@TransactionalEventListener(AFTER_COMMIT)` de `SessionCompleted` delegando ao serviço em `REQUIRES_NEW` em `backend/src/main/java/com/kaptika/api/streak/`
- [x] T006 [US1] [SC-001,SC-004] Testes: incremento 1×/dia (2 sessões no dia), reprocesso do mesmo evento (FR-009), dias consecutivos, virada de dia no fuso America/Sao_Paulo (23h59 vs 00h01 local) com Clock mutável, fio real via fluxo da 002 (POST /sessions → responder → finish) em `backend/src/test/java/com/kaptika/api/streak/`

## Fase 4 — História US2 (P1) — Recorde e detecção de quebra

- [x] T007 [US2] [FR-005..007,011] `GET /me/streak` (reconciliação lazy + `brokenSinceLastAccess`/`brokenAt` com acknowledgement) e `StreakReconciliationService` + job `@Scheduled` diário em `backend/src/main/java/com/kaptika/api/streak/`
- [x] T008 [US2] [SC-002,SC-003] Testes: quebra sem freeze com recorde preservado, detecção pelo GET (lazy) e pelo serviço de reconciliação (job), sinal de quebra reportado uma única vez, contrato completo do GET (estado inicial incluso) em `backend/src/test/java/com/kaptika/api/streak/`

## Fase 5 — História US3 (P3) — Freeze

- [x] T009 [US3] [FR-008] Testes: dia perdido com freeze → consome exatamente 1 e preserva (SC-005), múltiplos dias perdidos, +1 freeze no incremento múltiplo de 7, teto de 2, quebra quando o estoque não cobre em `backend/src/test/java/com/kaptika/api/streak/`

## Fase 6 — Conferência

- [x] T010 Rodar `./mvnw verify` (suíte completa + gate JaCoCo 80%), conferir SC-001..006, registrar resultado abaixo e atualizar Status da spec para Implemented

## Dependências

- T001–T003 bloqueiam T004+; T004 bloqueia T005–T009; T007 bloqueia T008.
- T006/T008/T009 compartilham o suporte de teste (Clock mutável) criado em T006.

## Notas

- Commit por tarefa ou grupo coeso: `tipo(004): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.

## Resultado da conferência (T010 — 2026-07-20)

Suíte: **81 testes, 0 falhas** (`./mvnw verify`, com a 003 já integrada via main). Cobertura JaCoCo: **90,5% de linhas** no bundle (gate 80%); pacote `streak`: **91,7%**.

| SC | Resultado | Evidência |
|---|---|---|
| SC-001 | ✅ | `twoSessionsSameDayIncrementOnce` (serviço) e `completedSessionFeedsStreakThroughRealEvent` (fio real HTTP da 002): duas conclusões no dia → current = 1; PK `(profile_id, local_date)` no banco |
| SC-002 | ✅ | `reconciliationJobDetectsBreak` (job, sem acesso do estudante) e `lazyReconciliationOnGet` (GET): mesma regra, mesmo estado final; `brokenAt` reportado |
| SC-003 | ✅ | `breakWithoutEnoughFreezesPreservesRecord`: quebra zera current, recorde 5 preservado; recorde só cresce em `registerMetDay` |
| SC-004 | ✅ | `dayBoundaryFollowsSaoPauloZone`: 23h59 e 00h01 locais (mesmo dia UTC!) contam como dias distintos; o dia deriva só do Clock/fuso do servidor — payload do cliente nunca entra no cálculo |
| SC-005 | ✅ | `freezePreservesStreakConsumingExactlyOne`: 1 dia perdido → exatamente 1 freeze consumido, ofensiva preservada; `replayedEventIsDeduplicated` cobre o FR-009 |
| SC-006 | ✅* | GET /me/streak lê 1 linha por PK + no máx. 1 UPDATE; sem chamada externa no caminho |

\* verificado funcionalmente; a métrica p95 real depende de ambiente de produção.

Observação de implementação: sessão encerrada com 0 respostas não cumpre a meta (definição da spec: "ao menos 1 questão respondida") — coberto por `emptySessionDoesNotMeetGoal`.
