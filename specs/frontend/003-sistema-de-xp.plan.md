# Plano de Implementação: Sistema de XP e Níveis (Frontend)

**Spec:** specs/frontend/003-sistema-de-xp.md

**Camada:** Frontend

**Data:** 2026-07-20

> Gerado na fase /plan. Descreve o **como**. Sem código.

## Resumo

Entrega um **painel de XP** que reflete o estado oficial da API (`GET /me/xp`):
XP total, nível atual, barra de progresso até o próximo nível e XP ganho na
semana. Toda a lógica vive isolada em `frontend/src/features/xp/`, reutilizando
a fundação 001 (`apiFetch`/`ApiError`, React Query, componentes de estado). Um
**medidor de nível** reutilizável (`LevelMeter`, `role="progressbar"`) é extraído
para uso futuro (celebração de nível, resumo de sessão). Os widgets de topo são
exportados por `features/xp/index.ts` para o coordenador plugar numa rota depois
— esta feature não edita `App.tsx`, `main.tsx`, `auth/*` nem `components/*`.

## Decisões

- **Denominador da barra de progresso** → a API entrega apenas `xpToNextLevel`
  (restante), não o tamanho da faixa do nível. Derivamos a faixa a partir da
  curva documentada no backend (`LevelCurve`: subir de N→N+1 custa `100 × N`),
  isolada numa única função de apresentação. É derivação **visual** a partir de
  valores confirmados pela API — não persistimos nem inventamos XP.
- **Estado "vazio"** → `xpTotal === 0` (estudante sem XP) renderiza um
  `EmptyState` convidando a fazer uma sessão, em vez do painel com zeros.
- **Chave de cache** → `['xp']` no React Query, separada de `['profile']`, para
  o painel poder ser invalidado/reconciliado de forma independente após sessões.
- **Escopo do widget** → o painel cobre FR-004 (perfil: XP/nível/progresso) e a
  robustez de estados (FR-007/009). Feedback em tempo real por acerto (FR-001),
  resumo de sessão (FR-003) e celebração de nível (FR-005) dependem do fluxo de
  sessão (feature 002), fora do escopo deste worktree; o `LevelMeter` fica pronto
  para reuso quando esse fluxo existir.

## Abordagem técnica

### Frontend (React + TS + Tailwind + Vite, mobile-first)

- **Rotas:** nenhuma rota nova é registrada aqui (não editamos `App.tsx`). O
  `XpPanel` é exportado como widget; o coordenador o pluga no perfil/rota depois.
- **Componentes:**
  - `xpApi.ts` — `getXpSummary()` + tipo `XpSummary` (espelha `XpSummaryResponse`).
  - `levelProgress.ts` — derivação de apresentação (faixa do nível, % preenchida).
  - `useXpSummary.ts` — hook React Query (`queryKey: ['xp']`).
  - `LevelMeter.tsx` — medidor reutilizável: nível + barra `role="progressbar"`.
  - `XpPanel.tsx` — painel completo: consome o hook, trata os 3 estados, compõe
    XP total, `LevelMeter`, XP restante e XP da semana.
  - `index.ts` — exportações de topo para o coordenador.
- **Estado:** tudo vem da API via React Query; nada é persistido no cliente. A
  barra é derivada de `level` + `xpToNextLevel` (apresentação pura).
- **Chamadas à API:** `GET /me/xp` → `{ xpTotal, level, xpToNextLevel, xpInPeriod }`.
  Erros normalizados por `apiFetch`/`ApiError`.
- **Estados de UI:** carregando (`LoadingState`), erro com repetir (`ErrorState`
  + `refetch`), vazio (`EmptyState` quando `xpTotal === 0`).
- **Acessibilidade/mobile:** `role="progressbar"` com `aria-valuenow/min/max` e
  `aria-valuetext`; layout `max-w` mobile-first; contraste e rótulos textuais.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-004 | `XpPanel` exibe XP total, nível e progresso ao próximo nível (dados de `/me/xp`). |
| FR-006/007 | Valores sempre de `/me/xp`; nenhum total inventado; erro sinaliza falha com repetir. |
| FR-009 | `role="progressbar"`, rótulos, alvos de toque e layout mobile-first. |
| FR-001/003/005 | Fora de escopo do widget (dependem da feature 002); `LevelMeter` fica pronto para reuso. |

## Riscos e pontos de atenção

- **Acoplamento à curva de níveis** → a faixa `100 × N` é conhecimento do backend
  replicado para o denominador da barra. Isolado em `levelProgress.ts` e comentado;
  se a curva mudar, é o único ponto a ajustar. Mitigação alternativa: expor a faixa
  na API numa evolução futura.

## Fora de escopo

- Registrar rota/navegação (responsabilidade do coordenador).
- Feedback de XP por acerto em tempo real e celebração de nível (feature 002).
- Cálculo/persistência de XP no cliente (backend é a fonte de verdade).
