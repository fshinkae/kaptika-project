# Plano de Implementação: Medalhas e Conquistas (Frontend)

**Spec:** specs/frontend/005-medalhas-e-conquistas.md

**Camada:** Frontend

**Data:** 2026-07-20

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Feature de leitura que **reflete** a coleção de medalhas do backend (`GET /me/badges`). Entrega, isolada em `frontend/src/features/badges/`: (1) uma **galeria** mobile-first separando conquistadas (com data) de bloqueadas (com objetivo e, nas cumulativas, progresso X/Y visual); (2) um **destaque no perfil** (subconjunto conquistado + estado vazio incentivador); (3) uma **celebração** enfileirável disparada quando a API concede uma medalha nova, sem recelebrar as já obtidas. Reusa a fundação 001 (`apiFetch`/`ApiError`, `AuthContext`, componentes `LoadingState`/`ErrorState`/`EmptyState`/`Button`) e React Query. **Não edita** `App.tsx`, `main.tsx`, `apiClient.ts`, `auth/*` nem `components/*`; exporta página/widgets de topo via `index.ts` para o coordenador plugar depois.

## Decisões

- **Escopo de arquivos** → tudo em `frontend/src/features/badges/`. Nada fora dela é tocado; a integração de rota/perfil fica a cargo do coordenador, consumindo os exports de `index.ts`.
- **Contrato REAL (BadgeDtos)** → a view espelha os campos exatos: `BadgeView { slug, name, description, achieved, awardedAt, progress }`, `Progress { current, target }`, `BadgeCollectionResponse { badges, achievedCount, totalCount }`. `awardedAt` chega como ISO string (Instant) ou `null`; `progress` presente apenas nas cumulativas (pode ser `null`).
- **Data fetching** → React Query (`queryKey: ['badges']`, `queryFn: getBadges`) padroniza carregando/erro/refetch, igual ao padrão de `ProfilePage`.
- **Estados de UI** → `LoadingState` (carregando), `ErrorState` com "Tentar novamente" (erro), `EmptyState` (coleção sem medalhas / perfil sem conquistas) — reuso direto da fundação.
- **Progresso cumulativo** → barra acessível (`role="progressbar"` com `aria-valuenow/min/max`) + rótulo textual "X de Y"; renderizada só quando `progress` existe e a medalha está bloqueada.
- **Data da conquista** → formatada com `Intl.DateTimeFormat('pt-BR')` em `<time dateTime={awardedAt}>`; fuso do servidor já vem embutido no instante (invariante de datas do CLAUDE.md — a UI não recalcula).
- **Celebração (FR-001/002/006)** → hook `useBadgeCelebrations(badges, userId)` compara os slugs conquistados atuais com um conjunto "já visto" **semeado no primeiro carregamento** (persistido em `localStorage` por usuário). Medalhas já conquistadas antes do primeiro load **não** recelebram (FR-002); novas conquistas entram numa **fila** exibida uma a uma sem bloquear a navegação (FR-006). O componente `BadgeCelebration` é um overlay acessível (`role="dialog"`, `aria-live`) com botão de dispensar que avança a fila.
- **Sem estado próprio de progresso** → o front nunca calcula/persiste XP/medalhas; só reflete a API (invariante do CLAUDE.md). O `localStorage` guarda apenas quais celebrações já foram mostradas (preferência de UI), não o estado de domínio.
- **Testes** → Vitest + Testing Library + MSW (`http://api.test`) + mock do Supabase (`setSession`), via `renderWithProviders` — mesmo padrão de `ProfilePage.test.tsx`.
- **Acessibilidade/mobile** → grid 1→2→3 colunas por breakpoint, alvos de toque ≥44px, foco visível, listas semânticas, `aria-label` nos cartões, barra de progresso acessível.

## Abordagem técnica

### Estrutura (`frontend/src/features/badges/`)

- `badgesApi.ts` — tipos (`BadgeView`, `BadgeProgress`, `BadgeCollection`) + `getBadges()` sobre `apiFetch`.
- `BadgeProgressBar.tsx` — barra acessível X/Y das cumulativas.
- `BadgeCard.tsx` — cartão de uma medalha: conquistada (data) vs bloqueada (objetivo + progresso).
- `BadgesGallery.tsx` — grid separando conquistadas/bloqueadas; recebe a coleção já carregada.
- `BadgesGalleryPage.tsx` — página: query + estados carregando/erro/vazio, monta a galeria e a celebração.
- `ProfileBadgesHighlight.tsx` — widget do perfil: subconjunto conquistado ou estado vazio incentivador.
- `useBadgeCelebrations.ts` — fila de celebrações (semeadura + detecção de novas + dispensar).
- `BadgeCelebration.tsx` — overlay de celebração acessível.
- `index.ts` — exports de topo para o coordenador.

### Chamadas à API

- `GET /me/badges` → `BadgeCollection`. Somente leitura; a UI reflete estado, data e progresso.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001 | `useBadgeCelebrations` + `BadgeCelebration`: nova conquista da API dispara celebração |
| FR-002 | Conjunto "já visto" semeado no 1º load + persistido → sem recelebração ao recarregar |
| FR-003 | `BadgesGallery` separa conquistadas (data) de bloqueadas (objetivo) |
| FR-004 | `BadgeProgressBar` mostra X/Y das cumulativas, conforme a API |
| FR-005 | `ProfileBadgesHighlight`: destaque das conquistadas + estado vazio incentivador |
| FR-006 | Fila de celebrações (uma a uma), overlay não bloqueia a navegação |
| FR-007 | `BadgesGalleryPage`: `LoadingState` / `ErrorState` (repetir) / `EmptyState` |
| FR-008 | Grid mobile-first, alvos ≥44px, listas/rotulagem acessíveis, progressbar ARIA |

## Riscos e pontos de atenção

- **Semeadura da celebração** → sem ela, o primeiro load recelebraria todas as medalhas antigas (violaria FR-002). Mitigação: na primeira vez que a query traz dados para um usuário, grava o conjunto atual como "visto" sem celebrar.
- **`erasableSyntaxOnly` + `verbatimModuleSyntax`** → sem `enum`/parameter properties; uniões + `as const`; imports de tipo com `import type`. `tsc -b` cobre os testes → tudo type-limpo.
- **`react/only-export-components` (oxlint)** → arquivos de componente exportam só componentes; API/hook em arquivos próprios.
- **Formatação de data** → `Intl` no Node de teste; asserções calculam a data esperada com o mesmo `Intl` para não ficarem frágeis.

## Fora de escopo

- Plugar a rota `/medalhas` no `App.tsx` e inserir o destaque no `ProfilePage` (a cargo do coordenador; exports prontos).
- Arte/ícones finais das medalhas (Assumption da spec) — usa-se fallback textual.
- Backend, catálogo e regras de concessão (feature 005 backend).
