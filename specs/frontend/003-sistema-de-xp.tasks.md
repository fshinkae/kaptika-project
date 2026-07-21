# Tarefas: Sistema de XP e Níveis (Frontend)

**Spec:** specs/frontend/003-sistema-de-xp.md

**Plano:** specs/frontend/003-sistema-de-xp.plan.md

**Camada:** Frontend

> Checklist executável. Formato: - [ ] Txxx [P?] [Ref] descrição com caminho.
> Escopo restrito a `frontend/src/features/xp/`.

## Fase 1 — Preparação

- [ ] T001 Criar `frontend/src/features/xp/` e `npm install` no worktree.

## Fase 2 — Fundação (bloqueia o resto)

- [ ] T002 [FR-004] Cliente e tipos de `/me/xp` em `features/xp/xpApi.ts`.
- [ ] T003 [FR-004] Derivação de progresso (faixa do nível, %) em `features/xp/levelProgress.ts`.
- [ ] T004 [FR-006] Hook React Query `useXpSummary` (queryKey `['xp']`) em `features/xp/useXpSummary.ts`.

## Fase 3 — História US2 (P2) 🎯 painel

- [ ] T005 [P] [US2/FR-009] Medidor reutilizável `LevelMeter` (role=progressbar) em `features/xp/LevelMeter.tsx`.
- [ ] T006 [US2/FR-004] Painel `XpPanel` (XP total, nível, progresso, XP da semana + 3 estados) em `features/xp/XpPanel.tsx`.
- [ ] T007 Exportações de topo em `features/xp/index.ts`.

## Fase 4 — Testes

- [ ] T008 [FR-004/009] Testes de render, %, XP da semana, carregando, erro(repetir) e vazio em `features/xp/XpPanel.test.tsx`.
- [ ] T009 Teste unitário da derivação de progresso em `features/xp/levelProgress.test.ts`.

## Fase 5 — Conferência

- [ ] T010 `npm test` / `build` / `lint` verdes; conferir SC-002/005; Status da spec → Implemented.

## Dependências

- Fase 2 bloqueia as demais. T005/T006 dependem de T002–T004.

## Notas

- Backend é a fonte de verdade; a UI só reflete `/me/xp`.
- Commit por tarefa ou grupo: `tipo(f003): <ID> descrição`.
