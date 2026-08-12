# Tarefas: Ofensiva Diária (Streak) — Frontend

**Spec:** specs/frontend/004-ofensiva-diaria-streak.md

**Plano:** specs/frontend/004-ofensiva-diaria-streak.plan.md

**Camada:** Frontend

> Formato: - [ ] Txxx [P?] [Ref] descrição com caminho. [P] = paralelizável. [Ref] = FR/US.

## Fase 1 — Preparação

- [x] T001 [Fundação] Criar pasta `frontend/src/features/streak/` e confirmar reuso de
  apiFetch/ApiError, React Query e componentes transversais.

## Fase 2 — Fundação (bloqueia o resto)

- [x] T002 [FR-003] Cliente de API e tipos: `getStreak()` + `StreakState` em
  `frontend/src/features/streak/streakApi.ts` (reflete `StreakResponse` do backend).

## Fase 3 — História US1 (P1) 🎯 MVP — Ver e sentir a ofensiva

- [x] T003 [US1][FR-001/002/007/008] `StreakPanel` com query, estados carregando/erro, hero da
  ofensiva atual, badge "meta cumprida hoje" e convite inicial (current 0) em
  `frontend/src/features/streak/StreakPanel.tsx`.

## Fase 4 — História US2 (P1) — Comunicar a perda + recorde

- [x] T004 [US2][FR-004/005/009] Banner empático de quebra (`brokenSinceLastAccess` + `brokenAt`
  formatado) e estatística de recorde no `StreakPanel`.

## Fase 5 — História US3 (P3) — Freezes na interface

- [x] T005 [US3][FR-006] Estatística de congelamentos (`freezes`) no `StreakPanel`.

## Fase 6 — Exportação e testes

- [x] T006 [FR-001] `StreakPage` (wrapper com container) e barrel `index.ts` exportando widget,
  página, tipos e cliente para o coordenador plugar.
- [x] T007 [US1/US2/US3] Suíte `StreakPanel.test.tsx` (padrão ProfilePage): render
  current/record/freezes; badge meta hoje; aviso de quebra com data; estado inicial (0);
  carregando/erro(repetir).

## Fase 7 — Conferência

- [x] T008 Conferir a implementação contra SC-001..SC-005; rodar test/build/lint; Status da spec
  → Implemented.

## Dependências

- Fase 2 bloqueia as histórias. Fases 3–5 incrementam o mesmo `StreakPanel` (sequenciais).

## Notas

- Commit por tarefa/grupo: `tipo(f004): <ID> descrição`. Marque `- [ ]` → `- [x]` ao concluir.
