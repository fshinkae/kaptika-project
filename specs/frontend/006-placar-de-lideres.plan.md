# Plano de Implementação: Placar de Líderes (Frontend)

**Spec:** specs/frontend/006-placar-de-lideres.md

**Camada:** Frontend

**Data:** 2026-07-20

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Tela de placar de líderes que **reflete** o ranking servido pelo backend: lista ordenada por XP (ranque, nome, XP), alternância entre recortes geral/semanal, destaque da posição própria (bloco `me`, mesmo fora da página visível) e carregamento incremental ("carregar mais") sem duplicatas nem lacunas. Toda a feature vive em `frontend/src/features/leaderboard/`, reusando a fundação 001 (`apiFetch`/`ApiError`, `AuthContext`, componentes transversais) sem tocar em App/router/lib/auth/components. A página de topo é exportada para o coordenador plugar na rota depois.

## Decisões

- **Contrato REAL confirmado** (backend `LeaderboardController` + `LeaderboardDtos`) → `GET /leaderboard?scope=global|weekly&page=0&size=20` retorna `{ scope, periodStart, page, size, totalStudents, entries: [{ rank, profileId, displayName, xp }], me: { rank, xp } }`. `rank`/`xp` são `long` (→ `number` em JS); `profileId` é UUID (→ `string`); `periodStart` é `Instant` ISO (→ `string`). O `me` está **sempre presente** e é calculado na hora.
- **Escopo (scope)** → união de string `'global' | 'weekly'` + `as const` (proibido `enum` TS por `erasableSyntaxOnly`). Query usa os valores minúsculos exigidos pelo backend. Default inicial: `global`.
- **Ordem** → a UI **nunca reordena**; renderiza `entries` na ordem da API (FR-006, SC-001). O `rank` vem pronto do backend.
- **Desambiguação de nomes repetidos** → `profileId` é a `key` do React e a chave de deduplicação; a UI não inventa sufixos — apenas garante identidade estável por `profileId` (FR-007).
- **Paginação incremental** → botão "Carregar mais" (mais previsível e testável que scroll infinito no MVP; a spec permite "paginação **ou** rolagem infinita"). Cada página busca `page+1` e **concatena** `entries`. Deduplicação defensiva por `profileId` evita repetição caso o ranking mude durante a navegação (edge case). "Tem mais?" derivado de `page * size + entries.length < totalStudents`.
- **Data fetching** → React Query. Lista paginada com `useInfiniteQuery` (`queryKey: ['leaderboard', scope]`), que já modela `fetchNextPage`, `hasNextPage`, estados de carregando/erro por página e refetch. Trocar `scope` troca a `queryKey` → refaz a busca automaticamente (FR-003, SC-004).
- **Destaque próprio** → o bloco `me` (rank + xp) vem no topo de cada resposta; renderizado num cartão fixo destacado no topo, **independente** de o próprio estudante aparecer na página carregada (FR-002). Quando a linha própria também está na lista, ela recebe realce visual (comparação por `me.rank`).
- **Estados de UI** → `LoadingState` (primeira página), `ErrorState` com repetir (falha da primeira página) e um erro inline com "Tentar novamente" para falha do "Carregar mais"; `EmptyState` quando `totalStudents === 0` / sem entries (FR-005).
- **Isolamento arquitetural** → SOMENTE `frontend/src/features/leaderboard/`. Reuso de `apiFetch`, `ApiError`, `useAuth`, `LoadingState`, `ErrorState`, `EmptyState`, `Button`. **Não** editar App.tsx, main.tsx, apiClient.ts, auth/*, components/*. A `LeaderboardPage` é exportada (barrel `index.ts`) para plugue posterior.
- **Testes** → Vitest + Testing Library + MSW (`http://api.test`) + mock stateful do Supabase, seguindo `ProfilePage.test.tsx` (`renderWithProviders`, `setSession`).

## Abordagem técnica

### Frontend (React + TS + Tailwind + Vite, mobile-first)

- **Estrutura** (`frontend/src/features/leaderboard/`):
  - `leaderboardApi.ts` — tipos (`Scope`, `LeaderboardEntry`, `MyPosition`, `LeaderboardResponse`) + `getLeaderboard({ scope, page, size })` via `apiFetch`.
  - `useLeaderboard.ts` — `useInfiniteQuery` por `scope`; expõe `entries` achatadas+deduplicadas, `me`, `totalStudents`, flags de estado e `fetchNextPage`/`hasNextPage`.
  - `ScopeTabs.tsx` — seletor geral/semanal (`role="tablist"`, acessível, alvos ≥44px).
  - `MyPositionCard.tsx` — cartão destacado do bloco `me`.
  - `LeaderboardRow.tsx` — linha de ranking (rank, nome, XP), realce quando é a linha própria.
  - `LeaderboardPage.tsx` — orquestra tabs + `me` + lista + "Carregar mais" + estados.
  - `index.ts` — barrel exportando `LeaderboardPage`.
  - Testes `*.test.tsx`.
- **Estado**: `scope` local (useState); ranking/`me`/`totalStudents` do servidor via React Query (o app reflete a API, não recalcula XP/ordem — invariante do CLAUDE.md).
- **Chamadas à API**: `GET /leaderboard?scope=&page=&size=`. Só leitura.
- **Estados de UI**: carregando (1ª página), erro-com-repetir (1ª página e "carregar mais"), vazio (sem estudantes).
- **Acessibilidade/mobile**: layout `max-w`, tabs navegáveis por teclado com `aria-selected`, alvos ≥44px, `aria-current` na linha própria, números com destaque legível.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001 | `LeaderboardRow` renderiza `entries` (rank, nome, XP) na ordem da API |
| FR-002 | `MyPositionCard` mostra `me` (rank+xp) sempre; realce da linha própria na lista |
| FR-003 | `ScopeTabs` alterna geral/semanal; `queryKey` por scope refaz a busca |
| FR-004 | `useInfiniteQuery` + "Carregar mais" concatena com dedupe por `profileId` |
| FR-005 | `LoadingState` / `ErrorState` (repetir) / `EmptyState` |
| FR-006 | UI nunca reordena; usa a ordem e o `rank` da API |
| FR-007 | `profileId` como key/dedupe diferencia nomes repetidos |
| FR-008 | Sem preferências de privacidade (placar global) — nada a tratar |
| FR-009 | Componentes mobile-first e acessíveis (tabs, alvos ≥44px, teclado) |

## Riscos e pontos de atenção

- **Ranking muda durante a navegação** (edge case) → dedupe defensivo por `profileId` ao concatenar páginas evita duplicatas; possíveis lacunas são inerentes a ranking vivo e aceitáveis (a UI reflete a API).
- **`me` fora da página carregada** → renderizado a partir do bloco `me` da resposta, independente das `entries` visíveis; sempre presente por contrato.
- **`erasableSyntaxOnly`** → sem `enum`/parameter properties; uniões + `as const`. `build` roda `tsc` sobre os testes → tipos limpos.
- **Isolamento** → nada fora de `features/leaderboard/`; a página é exportada, não roteada aqui (coordenador faz depois).

## Fora de escopo

- Roteamento/registro da rota no App (feito pelo coordenador).
- Grupos/ligas e preferências de privacidade (refinamentos futuros / decidido fora do MVP).
- Rolagem infinita automática (optou-se por "Carregar mais"); identidade visual final.
