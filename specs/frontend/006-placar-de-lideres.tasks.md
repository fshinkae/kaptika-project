# Tarefas: Placar de Líderes (Frontend)

**Spec:** specs/frontend/006-placar-de-lideres.md

**Plano:** specs/frontend/006-placar-de-lideres.plan.md

**Camada:** Frontend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Fundação da feature (bloqueia o resto)

- [ ] T001 [FR-001,003,004] Camada de dados `leaderboardApi.ts`: tipos (`Scope`, `LeaderboardEntry`, `MyPosition`, `LeaderboardResponse`) + `getLeaderboard` via `apiFetch` em `frontend/src/features/leaderboard/`
- [ ] T002 [FR-004,006] Hook `useLeaderboard.ts` (`useInfiniteQuery` por scope): entries achatadas+deduplicadas por `profileId`, `me`, `totalStudents`, `fetchNextPage`/`hasNextPage`, estados em `frontend/src/features/leaderboard/`

## Fase 2 — História US1 (P1) 🎯 Ranking + posição própria

- [ ] T003 [P] [US1] [FR-001,007] `LeaderboardRow.tsx`: rank, nome, XP; realce da linha própria; key por `profileId` em `frontend/src/features/leaderboard/`
- [ ] T004 [P] [US1] [FR-002] `MyPositionCard.tsx`: cartão destacado do bloco `me` (rank+xp) em `frontend/src/features/leaderboard/`
- [ ] T005 [US1] [FR-001,002,005] `LeaderboardPage.tsx` + `index.ts` (barrel): orquestra lista, `me`, estados carregando/erro/vazio em `frontend/src/features/leaderboard/`
- [ ] T006 [US1] [SC-001,002] Testes: render ordenado conforme API (sem reordenar); bloco `me` mesmo fora da página; nomes repetidos por `profileId` em `frontend/src/features/leaderboard/`

## Fase 3 — História US2 (P2) — Alternar recortes

- [ ] T007 [US2] [FR-003] `ScopeTabs.tsx` (geral/semanal, acessível) + integração na página em `frontend/src/features/leaderboard/`
- [ ] T008 [US2] [SC-004] Testes: alternância geral↔semanal refaz a busca e reflete cada recorte em `frontend/src/features/leaderboard/`

## Fase 4 — História US3 (P2) — Carregamento incremental

- [ ] T009 [US3] [FR-004] "Carregar mais" na página: concatena páginas sem duplicar; estado/erro do carregamento incremental em `frontend/src/features/leaderboard/`
- [ ] T010 [US3] [SC-005] Testes: "carregar mais" concatena sem duplicatas; estado vazio; erro do carregar-mais com repetir em `frontend/src/features/leaderboard/`

## Fase 5 — Conferência

- [ ] T011 Rodar `npm test` + `npm run build` + `npm run lint`, conferir SC-001..006, registrar resultado e atualizar Status da spec

## Dependências

- Fase 1 (T001→T002) bloqueia todas as histórias.
- T003/T004 paralelos; T005 depende deles; T006 depende de T005.
- T007 depende de T005; T009 depende de T005+T002.

## Notas

- Commit por tarefa ou grupo coeso: `tipo(f006): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.
