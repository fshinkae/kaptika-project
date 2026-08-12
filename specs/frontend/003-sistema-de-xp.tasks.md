# Tarefas: Sistema de XP e Níveis (Frontend)

**Spec:** specs/frontend/003-sistema-de-xp.md

**Plano:** specs/frontend/003-sistema-de-xp.plan.md

**Camada:** Frontend

> Checklist executável. Formato: - [ ] Txxx [P?] [Ref] descrição com caminho.
> Escopo restrito a `frontend/src/features/xp/`.

## Fase 1 — Preparação

- [x] T001 Criar `frontend/src/features/xp/` e `npm install` no worktree.

## Fase 2 — Fundação (bloqueia o resto)

- [x] T002 [FR-004] Cliente e tipos de `/me/xp` em `features/xp/xpApi.ts`.
- [x] T003 [FR-004] Derivação de progresso (faixa do nível, %) em `features/xp/levelProgress.ts`.
- [x] T004 [FR-006] Hook React Query `useXpSummary` (queryKey `['xp']`) em `features/xp/useXpSummary.ts`.

## Fase 3 — História US2 (P2) 🎯 painel

- [x] T005 [P] [US2/FR-009] Medidor reutilizável `LevelMeter` (role=progressbar) em `features/xp/LevelMeter.tsx`.
- [x] T006 [US2/FR-004] Painel `XpPanel` (XP total, nível, progresso, XP da semana + 3 estados) em `features/xp/XpPanel.tsx`.
- [x] T007 Exportações de topo em `features/xp/index.ts`.

## Fase 4 — Testes

- [x] T008 [FR-004/009] Testes de render, %, XP da semana, carregando, erro(repetir) e vazio em `features/xp/XpPanel.test.tsx`.
- [x] T009 Teste unitário da derivação de progresso em `features/xp/levelProgress.test.ts`.

## Fase 5 — Conferência

- [x] T010 `npm test` / `build` / `lint` verdes; conferir SC-002/005; Status da spec → Implemented.

## Conferência dos Success Criteria

- **SC-002** (total exibido coincide com a API em 100% das reconciliações) → OK.
  O painel só lê `/me/xp` via React Query; teste "erro com repetir reconcilia com
  a API" prova que após falha+retry a UI converge para o valor oficial.
- **SC-004** (0 XP falso persistente) → OK. Nenhum total é calculado/persistido no
  cliente; erro mostra estado de falha com repetir, não um total inventado.
- **SC-005** (responsividade e acessibilidade) → OK. `role="progressbar"` com
  `aria-valuenow/min/max/valuetext`, rótulos textuais, layout mobile-first;
  reutiliza `Button` (alvo de toque ≥44px) nos estados.
- SC-001/003 (feedback em tempo real por acerto e celebração de nível) dependem do
  fluxo de sessão (feature 002) e estão fora do escopo deste widget; o `LevelMeter`
  fica pronto para reuso quando esse fluxo existir.

**Gate:** `npm test` 26/26 verde · `npm run build` verde · `npm run lint` verde
(único warning é pré-existente em `auth/AuthContext.tsx`, fora do escopo).

## Dependências

- Fase 2 bloqueia as demais. T005/T006 dependem de T002–T004.

## Notas

- Backend é a fonte de verdade; a UI só reflete `/me/xp`.
- Commit por tarefa ou grupo: `tipo(f003): <ID> descrição`.
