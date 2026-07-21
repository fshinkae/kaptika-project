# Tarefas: Medalhas e Conquistas (Frontend)

**Spec:** specs/frontend/005-medalhas-e-conquistas.md

**Plano:** specs/frontend/005-medalhas-e-conquistas.plan.md

**Camada:** Frontend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Fundação da feature (bloqueia o resto)

- [ ] T001 [FR-003,004] Tipos + `getBadges()` espelhando `BadgeDtos` em `frontend/src/features/badges/badgesApi.ts`

## Fase 2 — História US2 (P2) 🎯 Galeria e progresso

- [ ] T002 [US2] [FR-004,008] `BadgeProgressBar` acessível (X/Y) em `frontend/src/features/badges/BadgeProgressBar.tsx`
- [ ] T003 [US2] [FR-003,008] `BadgeCard` (conquistada com data / bloqueada com objetivo+progresso) em `frontend/src/features/badges/BadgeCard.tsx`
- [ ] T004 [US2] [FR-003] `BadgesGallery` (grid separando conquistadas/bloqueadas) em `frontend/src/features/badges/BadgesGallery.tsx`
- [ ] T005 [US2] [FR-007] `BadgesGalleryPage` (query + carregando/erro/vazio) em `frontend/src/features/badges/BadgesGalleryPage.tsx`

## Fase 3 — História US1 (P1) — Celebração

- [ ] T006 [US1] [FR-001,002,006] `useBadgeCelebrations` (semeadura + fila + dispensar) em `frontend/src/features/badges/useBadgeCelebrations.ts`
- [ ] T007 [US1] [FR-001,006] `BadgeCelebration` (overlay acessível) e integração na página em `frontend/src/features/badges/`

## Fase 4 — História US3 (P3) — Destaque no perfil

- [ ] T008 [US3] [FR-005] `ProfileBadgesHighlight` (conquistadas + estado vazio) em `frontend/src/features/badges/ProfileBadgesHighlight.tsx`

## Fase 5 — Exports e testes

- [ ] T009 `index.ts` com exports de topo (página + widgets + api) em `frontend/src/features/badges/index.ts`
- [ ] T010 [SC-001..005] Testes (MSW): galeria conquistadas/bloqueadas + data + progresso X/Y; carregando/erro(repetir)/vazio; celebração (nova celebra 1×, reload não recelebra, fila); destaque no perfil + vazio, em `frontend/src/features/badges/`

## Fase 6 — Conferência

- [ ] T011 Rodar `npm test` + `npm run build` + `npm run lint`, conferir SC-001..005, registrar resultado e atualizar Status da spec

## Dependências

- T001 bloqueia T002+. T002 → T003 → T004 → T005. T006 → T007. T005/T007/T008 antes de T009/T010.

## Notas

- Commit por tarefa ou grupo coeso: `tipo(f005): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.
