# Tarefas: Placar de Líderes (Backend)

**Spec:** specs/backend/006-placar-de-lideres.md

**Plano:** specs/backend/006-placar-de-lideres.plan.md

**Camada:** Backend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Preparação

- [x] T001 Dependência Caffeine + `spring-boot-starter-cache` no `backend/pom.xml`; migração `V600__leaderboard_indexes.sql`

## Fase 2 — Fundação (bloqueia o resto)

- [x] T002 [FR-006,FR-008] Consultas nativas de ranking (geral e semanal) com ordenação total e posição própria em `backend/src/main/java/com/kaptika/api/leaderboard/`

## Fase 3 — História US1 (P1) 🎯 Ranking + posição própria

- [x] T003 [US1] [FR-001..003] `LeaderboardService` + `LeaderboardController` (`GET /leaderboard`) com bloco `me` em `backend/src/main/java/com/kaptika/api/leaderboard/`
- [x] T004 [US1] [SC-001,SC-002,SC-006] Testes: ordenação, desempate reproduzível, posição própria fora da página em `backend/src/test/java/com/kaptika/api/leaderboard/`

## Fase 4 — História US2 (P2) — Recortes por período

- [x] T005 [US2] [FR-004,005,010] Recorte semanal (grants ≥ segunda 00:00 BR) e `periodStart` na resposta
- [x] T006 [US2] [SC-005] Testes: semanal ≠ geral; concessão antiga fora do período; reset não altera acumulado

## Fase 5 — História US3 (P2) — Escala e política de atualização

- [x] T007 [US3] [FR-007,009] Paginação (≤100/página) + cache Caffeine TTL 60s (posição própria sem cache)
- [x] T008 [US3] [SC-003,SC-004] Testes: páginas sem repetição/lacuna; cache respeitando TTL; validação 422 de scope/page/size

## Fase 6 — Conferência

- [x] T009 Rodar suíte completa + JaCoCo, conferir SC-001..006, registrar resultado e atualizar Status da spec

## Dependências

- T001–T002 bloqueiam T003+; T003 bloqueia T004–T008.

## Notas

- Commit por tarefa ou grupo coeso: `tipo(006): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.

## Resultado da conferência (T009 — 2026-07-20)

Suíte: **73 testes, 0 falhas** (`./mvnw verify`). Cobertura JaCoCo: **91,1%** total; pacote `leaderboard` **100%** (gate 80%).

| SC | Resultado | Evidência |
|---|---|---|
| SC-001 | ✅ | `globalOrderingAndTieBreak`: XP desc em 100% (B 300 > A 300 > C 100 > D 0) |
| SC-002 | ✅ | `me` correto mesmo fora da página (D rank 4 com page size 2) |
| SC-003 | ✅* | Página O(páginas) com cache 60 s; p95 real em staging |
| SC-004 | ✅ | Páginas 0/1 sem repetição nem lacuna, ordenação total estável |
| SC-005 | ✅ | Recorte semanal só soma grants ≥ segunda 00:00 BR; acumulado global intacto |
| SC-006 | ✅ | Empate resolvido por "atingiu primeiro" (updated_at) + id; duas chamadas → bytes idênticos |

\* verificado funcionalmente; métrica de produção depende de ambiente real.
