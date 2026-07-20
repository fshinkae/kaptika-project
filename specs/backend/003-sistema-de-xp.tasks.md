# Tarefas: Sistema de XP e Níveis (Backend)

**Spec:** specs/backend/003-sistema-de-xp.md

**Plano:** specs/backend/003-sistema-de-xp.plan.md

**Camada:** Backend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Fundação (bloqueia o resto)

- [ ] T001 [FR-010] Migração `V300__create_xp.sql` (`xp_grants` c/ UNIQUE idempotency_key + índice (profile_id, granted_at); `xp_balances` c/ PK profile_id) em `backend/src/main/resources/db/migration/`
- [ ] T002 [FR-004,010] Entidades e repositórios (`XpGrant`, `XpBalance`, inserção `ON CONFLICT DO NOTHING`, upsert atômico do saldo, somas) em `backend/src/main/java/com/kaptika/api/xp/`

## Fase 2 — História US1 (P1) 🎯 Conceder XP de forma confiável

- [ ] T003 [US1] [FR-001,003,004,009] `XpService` (REQUIRES_NEW: concessão dedupe + incremento atômico) e `XpEventListener` (AFTER_COMMIT de `CorrectAnswerRecorded`) em `backend/src/main/java/com/kaptika/api/xp/`
- [ ] T004 [US1] [SC-001,SC-002,SC-003] Testes: 10 XP por evento; reprocessamento sem duplicar; erro sem XP; saldo = Σ concessões; concorrência (threads) em `backend/src/test/java/com/kaptika/api/xp/`

## Fase 3 — História US2 (P2) — Nível a partir do XP

- [ ] T005 [P] [US2] [FR-005] `LevelCurve` (limiar 50·N·(N−1), nível por total, XP p/ próximo) em `backend/src/main/java/com/kaptika/api/xp/`
- [ ] T006 [US2] [FR-006] `XpQueryService` (resumo do estudante), `XpController` `GET /me/xp` + DTOs em `backend/src/main/java/com/kaptika/api/xp/`
- [ ] T007 [US2] [SC-004] Testes: limiares (unidade, inclusive saltos múltiplos) e `GET /me/xp` (integração: nível/xpToNextLevel corretos, estudante zerado) em `backend/src/test/java/com/kaptika/api/xp/`

## Fase 4 — História US3 (P2) — XP consolidado p/ o placar

- [ ] T008 [US3] [FR-007] Método consolidado no `XpQueryService` (total + XP da semana vigente, segunda 00:00 America/Sao_Paulo) — sem endpoint
- [ ] T009 [US3] [SC-001,SC-005] Testes: consolidado bate com Σ concessões; concessão de semana anterior fora do período em `backend/src/test/java/com/kaptika/api/xp/`

## Fase 5 — Conferência

- [ ] T010 Rodar `./mvnw verify` (BUILD SUCCESS, JaCoCo ≥ 80%), conferir SC-001..005, registrar resultado e atualizar Status da spec para Implemented

## Dependências

- T001–T002 bloqueiam T003+; T003 bloqueia T004; T005 pode andar em paralelo; T006 depende de T002/T005; T008 depende de T002.
- Testes de fio completo usam o stub `SessionTestSupport` da 002 (sem rede).

## Notas

- Commit por tarefa ou grupo coeso: `tipo(003): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.
