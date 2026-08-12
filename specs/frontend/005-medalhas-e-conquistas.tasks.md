# Tarefas: Medalhas e Conquistas (Frontend)

**Spec:** specs/frontend/005-medalhas-e-conquistas.md

**Plano:** specs/frontend/005-medalhas-e-conquistas.plan.md

**Camada:** Frontend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Fundação da feature (bloqueia o resto)

- [x] T001 [FR-003,004] Tipos + `getBadges()` espelhando `BadgeDtos` em `frontend/src/features/badges/badgesApi.ts`

## Fase 2 — História US2 (P2) 🎯 Galeria e progresso

- [x] T002 [US2] [FR-004,008] `BadgeProgressBar` acessível (X/Y) em `frontend/src/features/badges/BadgeProgressBar.tsx`
- [x] T003 [US2] [FR-003,008] `BadgeCard` (conquistada com data / bloqueada com objetivo+progresso) em `frontend/src/features/badges/BadgeCard.tsx`
- [x] T004 [US2] [FR-003] `BadgesGallery` (grid separando conquistadas/bloqueadas) em `frontend/src/features/badges/BadgesGallery.tsx`
- [x] T005 [US2] [FR-007] `BadgesGalleryPage` (query + carregando/erro/vazio) em `frontend/src/features/badges/BadgesGalleryPage.tsx`

## Fase 3 — História US1 (P1) — Celebração

- [x] T006 [US1] [FR-001,002,006] `useBadgeCelebrations` (semeadura + fila + dispensar) em `frontend/src/features/badges/useBadgeCelebrations.ts`
- [x] T007 [US1] [FR-001,006] `BadgeCelebration` (overlay acessível) e integração na página em `frontend/src/features/badges/`

## Fase 4 — História US3 (P3) — Destaque no perfil

- [x] T008 [US3] [FR-005] `ProfileBadgesHighlight` (conquistadas + estado vazio) em `frontend/src/features/badges/ProfileBadgesHighlight.tsx`

## Fase 5 — Exports e testes

- [x] T009 `index.ts` com exports de topo (página + widgets + api) em `frontend/src/features/badges/index.ts`
- [x] T010 [SC-001..005] Testes (MSW): galeria conquistadas/bloqueadas + data + progresso X/Y; carregando/erro(repetir)/vazio; celebração (nova celebra 1×, reload não recelebra, fila); destaque no perfil + vazio, em `frontend/src/features/badges/`

## Fase 6 — Conferência

- [x] T011 Rodar `npm test` + `npm run build` + `npm run lint`, conferir SC-001..005, registrar resultado e atualizar Status da spec

## Dependências

- T001 bloqueia T002+. T002 → T003 → T004 → T005. T006 → T007. T005/T007/T008 antes de T009/T010.

## Notas

- Commit por tarefa ou grupo coeso: `tipo(f005): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.

## Resultado da conferência (T011 — 2026-08-12)

`npm test` → **30 testes, 0 falhas** (8 arquivos, sendo 3 novos da feature);
`npm run build` (tsc -b + vite) limpo; `npm run lint` sem avisos nos arquivos de
`features/badges/` (único aviso remanescente é pré-existente em `auth/AuthContext.tsx`,
fora do escopo desta feature).

| SC | Resultado | Evidência |
|---|---|---|
| SC-001 | ✅ | `useBadgeCelebrations.test`/`BadgesGalleryPage.test`: cada concessão nova gera exatamente uma celebração |
| SC-002 | ✅ | Semeadura no 1º load + persistência: reload não recelebra (`useBadgeCelebrations.test`, `BadgesGalleryPage.test`) |
| SC-003 | ✅ | `BadgesGalleryPage.test`: estado/data/progresso refletem a API (campos exatos de `BadgeDtos`) |
| SC-004 | ✅ | `useBadgeCelebrations.test`: múltiplas concessões enfileiradas e dispensadas uma a uma sem travar |
| SC-005 | ✅* | Grid mobile-first (1→2→3 col), alvos ≥44px, `progressbar` ARIA, `role="dialog"` com foco; verificação visual final é QA em dispositivo |

\* verificado por construção/comportamento; a métrica final é de QA manual em dispositivo.

**Desvios/pendências (honesto)**:
- A integração de rota (`/medalhas` no `App.tsx`) e a inserção do `ProfileBadgesHighlight` no `ProfilePage` ficaram **fora de escopo** por decisão de arquitetura (só `features/badges/` pode ser tocado). Exports de topo prontos em `features/badges/index.ts` para o coordenador plugar.
- Arte/ícones finais das medalhas não implementados (Assumption da spec) — usa-se fallback textual/emoji.
- A persistência de "celebrações já vistas" usa `localStorage` por usuário (preferência de UI); o estado de domínio continua sendo o da API.
