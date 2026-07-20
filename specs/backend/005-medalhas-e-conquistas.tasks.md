# Tarefas: Medalhas e Conquistas (Backend)

**Spec:** specs/backend/005-medalhas-e-conquistas.md

**Plano:** specs/backend/005-medalhas-e-conquistas.plan.md

**Camada:** Backend

> Gerado na fase /tasks. Checklist executável. [P] = pode rodar em paralelo. [Ref] = FR/SC ou história (US1..US3).

## Fase 1 — Preparação

- [x] T001 Criar branch `backend/005-medalhas-e-conquistas` a partir da 002 (worktree isolado).

## Fase 2 — Fundação (bloqueia o resto)

- [x] T002 [FR-008/FR-009] Migração `V500__create_badges.sql`: tabelas `badges` (+seed das 5 medalhas), `badge_awards` (UNIQUE profile+badge), `badge_counters`, `processed_badge_events` em backend/src/main/resources/db/migration/
- [x] T003 [FR-006] Entidades e repositórios do pacote `com.kaptika.api.badges`: `Badge` (+`BadgeCondition`), `BadgeAward`, `BadgeCounters`, `ProcessedBadgeEvent`, repositórios com upsert/lock/`ON CONFLICT DO NOTHING`

## Fase 3 — História US1: avaliar e conceder (P1) 🎯 MVP

- [x] T004 [US1/FR-001..003] `BadgeService`: processamento transacional REQUIRES_NEW por evento — dedupe pela idempotencyKey, lock por perfil, atualização dos contadores (correct/xp/sessões/áreas/streak em America/Sao_Paulo) e avaliação genérica do catálogo com concessão à prova de corrida
- [x] T005 [US1/FR-001] `BadgeEventHandler`: ouvintes `@TransactionalEventListener(AFTER_COMMIT)` de `CorrectAnswerRecorded` e `SessionCompleted` delegando ao serviço
- [x] T006 [US1/SC-001/SC-002] Testes de integração: concessão automática (first-session via fio real POST /sessions→responder→finish; correct-100 com progresso 99→100; explorer 4 áreas; level-5 por XP; streak-7 dias consecutivos), reprocessamento sem duplicação e eventos concorrentes ⇒ 1 concessão

## Fase 4 — História US2: coleção e progresso (P2)

- [x] T007 [US2/FR-004/FR-005/FR-010] `BadgeController` GET /me/badges (DTOs record, `ProfileIdResolver`) + `BadgeService.countFor(profileId)` público
- [x] T008 [US2/SC-003/SC-004] Testes: estados conquistada/bloqueada com data e progresso X/Y corretos; coleção completa ordenada

## Fase 5 — História US3: catálogo extensível e backfill (P3)

- [x] T009 [US3/FR-006/FR-007] `BadgeBackfillService.backfill(slug)`: reavaliação retroativa dos contadores existentes com concessão aos elegíveis
- [x] T010 [US3/FR-007] Teste do backfill com medalha fictícia inserida em teste: elegível recebe, inelegível não, repetição não duplica

## Fase 6 — Conferência

- [x] T011 Rodar `./mvnw verify` (BUILD SUCCESS, JaCoCo ≥80%), conferir SC-001..005 e registrar o resultado aqui; Status da spec → Implemented

## Dependências

- Fase 2 bloqueia todas as histórias; T004 precede T005/T006; T007 precede T008; T009 precede T010.
- Fases 4 e 5 podem seguir em paralelo após a Fase 3.

## Notas

- Commits: `tipo(005): <ID> descrição`.
- Não tocar em `profile/`, `session/`, `config/`, `common/` nem depender das features 003/004.

## Conferência dos Success Criteria (T011 — 2026-07-20, `./mvnw verify` BUILD SUCCESS, 42 testes, cobertura de linhas 91,8% no bundle / 95,4% no pacote badges)

- [x] SC-001 — condições satisfeitas ⇒ concessão automática: coberto para as 5 medalhas — first-session pelo fio real da 002 (`firstSessionAwardedThroughRealFlow`), correct-100 e level-5 (`cumulativeCenturionAndLevelFive`), explorer (`explorerRequiresAllFourAreas`), streak-7 (`streakSevenConsecutiveLocalDays`).
- [x] SC-002 — 0 concessões duplicadas: reprocesso do mesmo evento é no-op em contadores e concessões (`reprocessingSameEventIsNoOp`); 2 eventos concorrentes satisfazendo a mesma condição ⇒ 1 concessão (`concurrentEventsGrantSingleAward`); backfill repetido ⇒ 0 novas. Garantias no banco: PK de `processed_badge_events`, lock por perfil e UNIQUE (profile, badge) com ON CONFLICT DO NOTHING.
- [x] SC-003 — coleção com estado e data corretos: estados conquistada/bloqueada, `awardedAt` presente só nas conquistadas, ordem por sort_order e contagens conferidos em todas as consultas dos testes (`emptyCollectionShowsAllLockedBadges` + asserções de GET nos demais).
- [x] SC-004 — progresso cumulativo real: 3/100 após o fio real, 99→100 no Centurião, 990→1000 XP no level-5, 3/4 no explorer, 6→7 no streak — sempre igual aos contadores persistidos.
- [x] SC-005 — GET /me/badges leve: leitura pura com 3 consultas indexadas (awards por profile_id, counters por PK, catálogo de 5 linhas), sem chamadas externas; p95 ≤300 ms folgado — validação de produção fica para observabilidade futura.
