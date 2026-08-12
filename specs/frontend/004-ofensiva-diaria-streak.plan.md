# Plano de Implementação: Ofensiva Diária (Streak) — Frontend

**Spec:** specs/frontend/004-ofensiva-diaria-streak.md

**Camada:** Frontend

**Data:** 2026-07-20

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Painel de ofensiva mobile-first que **reflete** o estado de `GET /me/streak`: ofensiva atual em
destaque, recorde histórico, congelamentos (freezes), reforço "meta cumprida hoje" quando
`metToday` e um aviso empático de quebra quando `brokenSinceLastAccess` (com a data `brokenAt`).
Todo o estado vem da API — o cliente nunca decide manter/quebrar. Isolado em
`frontend/src/features/streak/`, reutilizando `apiFetch`/`ApiError`, React Query e os componentes
transversais da fundação (Loading/Error/Empty/Button). Exporta um widget de topo para o
coordenador plugar em rota/tela depois.

## Decisões

- Estado inicial (`current === 0` sem quebra) → tela simpática de convite ("Comece hoje"), não erro
  nem estado de erro — atende ao pedido de "vazio = inicial simpático".
- Quebra tem prioridade visual: mesmo com `current === 0`, se `brokenSinceLastAccess` for `true`
  mostramos o aviso empático + a ofensiva recomeçando; o convite inicial só aparece quando não há
  quebra a comunicar.
- `brokenAt` (Instant ISO) formatado com `toLocaleDateString('pt-BR')`; a UI apenas exibe o
  instante do servidor, sem cálculo de fuso próprio (invariante de datas do CLAUDE.md).
- Widget autossuficiente (busca + estados internos) para poder ser plugado em qualquer rota sem o
  coordenador replicar boilerplate de estados.
- `enum` proibido (erasableSyntaxOnly): tipos como `interface` + campos explícitos; `brokenAt`
  como `string | null` (serialização JSON do `Instant`).

## Abordagem técnica

### Frontend (React + TS + Tailwind + Vite, mobile-first)

- **Rotas:** nenhuma rota nova é registrada aqui (não editamos App.tsx). Exportamos `StreakPanel`
  (widget) e `StreakPage` (wrapper com container) de topo em `features/streak/index.ts` para o
  coordenador montar em `/ofensiva` ou embutir na Home/Perfil. (FR-001)
- **Componentes:**
  - `StreakPanel` — orquestra a query e os três estados (carregando/erro/dados); decide entre
    convite inicial, hero da ofensiva, badge de meta e aviso de quebra.
  - Subcomponentes de apresentação internos: hero do contador, linha de estatísticas
    (recorde/freezes), badge "meta cumprida hoje", banner de quebra empático.
- **Estado:** 100% derivado da API via React Query (`queryKey: ['streak']`). Nenhum estado de
  progresso local/persistido. (FR-003)
- **Chamadas à API:** `getStreak()` → `apiFetch<StreakState>('/me/streak')`. Erros normalizados
  como `ApiError` pela fundação; a UI só oferece "tentar novamente" (refetch).
- **Estados de UI:** carregando (`LoadingState`), erro com repetir (`ErrorState` + `refetch`),
  "vazio" tratado como convite inicial simpático (não usa `EmptyState` de erro). (FR-007)
- **Acessibilidade/mobile:** container `max-w-md`, alvos ≥44px reutilizando `Button`, aviso de
  quebra com `role="status"`/`aria-live`, ícones decorativos `aria-hidden`. (FR-008)

## Rastreabilidade (spec → plano)

| **Requisito (FR)** | **Como é atendido** |
|:-------------------|:--------------------|
| FR-001 | Hero com a ofensiva atual em destaque a partir de `current`. |
| FR-002 | Badge "Meta cumprida hoje" quando `metToday`; contador reflete o novo valor. |
| FR-003 | Sem cálculo local; `queryKey ['streak']` reflete a API. |
| FR-004 | Banner empático quando `brokenSinceLastAccess`, com `brokenAt` formatado. |
| FR-005 | Estatística de recorde a partir de `record`. |
| FR-006 | Estatística de freezes a partir de `freezes`. |
| FR-007 | `LoadingState`, `ErrorState` (retry) e convite inicial para `current === 0`. |
| FR-008 | Container mobile-first, `role`/`aria-live`, alvos de toque via `Button`. |
| FR-009 | Copy do banner de quebra sem tom culpabilizador, com incentivo a recomeçar. |

## Riscos e pontos de atenção

- Ambiguidade quebra vs. inicial → resolvida com prioridade da quebra (decisão acima).
- `tsc` roda sobre os testes (build) → tipos dos mocks MSW explícitos e limpos.

## Fora de escopo

- Registro de rota/menu (papel do coordenador; não editamos App.tsx/main.tsx).
- Notificações push, animações de comemoração elaboradas, identidade visual final.
