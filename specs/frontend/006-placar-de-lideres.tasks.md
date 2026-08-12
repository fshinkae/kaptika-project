# Tarefas: Placar de Líderes (Frontend)

**Spec:** specs/frontend/006-placar-de-lideres.md

**Plano:** specs/frontend/006-placar-de-lideres.plan.md

**Camada:** Frontend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Fundação da feature (bloqueia o resto)

- [x] T001 [FR-001,003,004] Camada de dados `leaderboardApi.ts`: tipos (`Scope`, `LeaderboardEntry`, `MyPosition`, `LeaderboardResponse`) + `getLeaderboard` via `apiFetch` em `frontend/src/features/leaderboard/`
- [x] T002 [FR-004,006] Hook `useLeaderboard.ts` (`useInfiniteQuery` por scope): entries achatadas+deduplicadas por `profileId`, `me`, `totalStudents`, `fetchNextPage`/`hasNextPage`, estados em `frontend/src/features/leaderboard/`

## Fase 2 — História US1 (P1) 🎯 Ranking + posição própria

- [x] T003 [P] [US1] [FR-001,007] `LeaderboardRow.tsx`: rank, nome, XP; realce da linha própria; key por `profileId` em `frontend/src/features/leaderboard/`
- [x] T004 [P] [US1] [FR-002] `MyPositionCard.tsx`: cartão destacado do bloco `me` (rank+xp) em `frontend/src/features/leaderboard/`
- [x] T005 [US1] [FR-001,002,005] `LeaderboardPage.tsx` + `index.ts` (barrel): orquestra lista, `me`, estados carregando/erro/vazio em `frontend/src/features/leaderboard/`
- [x] T006 [US1] [SC-001,002] Testes: render ordenado conforme API (sem reordenar); bloco `me` mesmo fora da página; nomes repetidos por `profileId` em `frontend/src/features/leaderboard/`

## Fase 3 — História US2 (P2) — Alternar recortes

- [x] T007 [US2] [FR-003] `ScopeTabs.tsx` (geral/semanal, acessível) + integração na página em `frontend/src/features/leaderboard/`
- [x] T008 [US2] [SC-004] Testes: alternância geral↔semanal refaz a busca e reflete cada recorte em `frontend/src/features/leaderboard/`

## Fase 4 — História US3 (P2) — Carregamento incremental

- [x] T009 [US3] [FR-004] "Carregar mais" na página: concatena páginas sem duplicar; estado/erro do carregamento incremental em `frontend/src/features/leaderboard/`
- [x] T010 [US3] [SC-005] Testes: "carregar mais" concatena sem duplicatas; estado vazio; erro do carregar-mais com repetir em `frontend/src/features/leaderboard/`

## Fase 5 — Conferência

- [x] T011 Rodar `npm test` + `npm run build` + `npm run lint`, conferir SC-001..006, registrar resultado e atualizar Status da spec

## Dependências

- Fase 1 (T001→T002) bloqueia todas as histórias.
- T003/T004 paralelos; T005 depende deles; T006 depende de T005.
- T007 depende de T005; T009 depende de T005+T002.

## Notas

- Commit por tarefa ou grupo coeso: `tipo(f006): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.

## Resultado da conferência (T011 — 2026-08-12)

`npm test` → **26 testes, 0 falhas** (6 arquivos; 10 novos do placar). `npm run build` (tsc + vite) limpo. `npm run lint` (oxlint) exit 0 — único warning é pré-existente em `AuthContext.tsx` (fundação 001, não tocada).

| SC | Resultado | Evidência |
|---|---|---|
| SC-001 | ✅ | Teste "render na ordem servida pela API, sem reordenar" — UI renderiza `entries` como vêm |
| SC-002 | ✅ | Teste "destaca a posição própria mesmo fora da página" — bloco `me` sempre presente |
| SC-003 | ✅* | Primeira página via React Query + `LoadingState`; métrica de <2s é QA em dispositivo |
| SC-004 | ✅ | Teste "alternar geral↔semanal refaz a busca" — `queryKey` por scope reflete cada recorte |
| SC-005 | ✅ | Testes "carregar mais concatena sem duplicatas" + "deduplica quando o ranking muda" (dedupe por `profileId`) |
| SC-006 | ✅* | Componentes mobile-first (max-w, alvos ≥44px, tabs com `aria-selected`, `aria-current` na linha própria); verificação visual final em QA |

\* verificado por construção/comportamento; a métrica final é de QA manual em dispositivo.

**Desvios/decisões**: carregamento incremental via botão "Carregar mais" (a spec permite paginação **ou** rolagem infinita). Erro do "carregar mais" tratado inline (preserva a lista), distinto do erro de primeira página que ocupa a tela. Nenhuma pendência.
