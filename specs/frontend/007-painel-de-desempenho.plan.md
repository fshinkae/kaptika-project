# Plano de Implementação: Painel de Desempenho (Frontend)

**Spec:** specs/frontend/007-painel-de-desempenho.md

**Camada:** Frontend

**Data:** 2026-09-27

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Nova feature `features/performance/` com a página protegida `/desempenho`, alimentada por uma única consulta `GET /me/performance?days=` (TanStack Query, chave por janela). Os infográficos são HTML + Tailwind puros — barras por área, colunas de XP por dia e calendário de atividade — com os tokens da identidade "Cartão-resposta" e uma tabela oculta visualmente para leitor de tela. O cartão "Onde focar" leva a `/estudar?area=<slug>`, que passa a iniciar a sessão direto na área pedida.

## Decisões

- **Sem `[NEEDS CLARIFICATION]` na spec** — as janelas (7/30/90, padrão 30) e a amostra mínima foram fixadas no backend/007.
- **Biblioteca de gráficos** → **nenhuma**. Os três gráficos são barras e grades simples; `div`s com largura/altura proporcionais em Tailwind (mesmo padrão do `BadgeProgressBar`) cobrem tudo sem dependência nova, sem SVG e com responsividade natural. Uma biblioteca só se justificaria com eixos, zoom ou tooltips, que a spec não pede.
- **Acessibilidade dos gráficos (FR-007)** → as barras por área já trazem o texto visível ("47% · 7 de 15"); as colunas de XP e o calendário são `aria-hidden` e acompanhados de **uma tabela `sr-only`** com data, XP, respondidas, acertos e meta cumprida por dia, mais um resumo textual ("Meta cumprida em 12 de 30 dias"). Nenhuma informação depende só de cor.
- **Seletor de janela** → extrair o `ScopeTabs` do placar para um componente genérico `components/SegmentedTabs.tsx` e usá-lo nos dois lugares (mesmo visual, `tablist`, alvos de 44 px). Evita um segundo seletor quase idêntico.
- **Troca de janela sem piscar (US3 cenário 2)** → `placeholderData: keepPreviousData`; enquanto `isPlaceholderData`, o conteúdo fica esmaecido com `aria-busy`.
- **Estado vazio** → quando `totals.answered = 0` na janela: `EmptyState` com "Nenhuma questão respondida nos últimos N dias." e a ação `START_SESSION_ACTION`; o seletor continua visível, porque o estudante pode ter respostas numa janela maior. Não dá para afirmar "primeira sessão": a API só informa a janela.
- **Percentuais** → `Math.round(accuracy * 100)` só para exibir (FR-003); `accuracy = null` vira "Ainda não praticada", nunca "0%".
- **Datas** → a API manda datas locais `AAAA-MM-DD` já no fuso do servidor; a UI só formata (dia/mês, dia da semana) tratando a string como data de calendário (UTC em `Intl`), sem reconverter fuso.
- **Calendário de atividade** → grade estilo GitHub: colunas = semanas, 7 linhas = dias da semana, primeira coluna completada com células vazias até o dia da semana de `from`. Para 90 dias dá 13–14 colunas (~20 px) que cabem em 320 px; para 7 dias, 1–2 colunas.
- **Área pré-selecionada (FR-009)** → `/estudar?area=<slug>` com slug válido dispara a criação da sessão logo ao abrir, reaproveitando o fluxo existente: o POST devolve a sessão ativa se houver uma, e o `AreaConflict` já trata a de outra área. Durante a criação mostra a tela "Separando questões de…"; o parâmetro é removido da URL (`replace`) para não disparar de novo ao voltar. Slug inválido é ignorado (cai na escolha de área).
- **Invalidação** → `['performance']` entra em `PROGRESS_QUERY_KEYS` do `SessionFlowPage`: ao responder/encerrar uma sessão, o painel reconsulta em vez de mostrar números velhos.
- **Pontos de entrada (FR-001)** → na Home, um atalho de largura total "Seu desempenho" acima do par Medalhas/Placar (três itens em duas colunas ficaria desequilibrado; três colunas não cabem em 320 px com rótulo); no Perfil, um link "Ver desempenho" abaixo das estatísticas. A barra inferior continua com 4 itens.
- **Ícone** → novo `ChartIcon` em `components/Icons.tsx`, no mesmo traço dos demais (sem emoji — o teste ICON-1 cobre).
- **Tema escuro (edge case da spec)** → o app é só claro (`color-scheme: light`); os gráficos usam apenas tokens, então herdam um tema escuro se ele vier a existir. Nada a fazer agora.

## Abordagem técnica

### Frontend (React + TS + Tailwind + Vite, mobile-first)

- **Rotas:** `/desempenho` dentro das rotas protegidas do `App.tsx` (mesmo `AppShell` com barra inferior). (FR-001)
- **Chamadas à API:** `performanceApi.ts` com os tipos do contrato do backend/007 (`PerformanceResponse`, `AreaPerformance`, `Recommendation`, `DailyPoint`, `Reason` como união de strings) e `getPerformance(days)` via `apiFetch`. `WINDOWS = [7, 30, 90] as const`. (FR-002, FR-005)
- **Estado:** `usePerformance(days)` = `useQuery({ queryKey: ['performance', days], placeholderData: keepPreviousData })`; a janela escolhida é estado local da página (padrão 30). Nada é calculado além de formatação. (FR-003)
- **Componentes** (em `features/performance/`):
  - `PerformancePage` — `PageHeader` "Seu desempenho", `SegmentedTabs` da janela, estados carregando/erro/vazio e a composição abaixo, nesta ordem (US2 antes dos gráficos, como pede a spec).
  - `FocusCard` — texto por `reason` (`LOWEST_ACCURACY`: "X é sua área com menor acerto (47%)"; `NOT_PRACTICED`: "Você ainda não praticou X"; `INSUFFICIENT_DATA`: "Responda mais questões para ver onde focar") e botão "Estudar X" → `/estudar?area=slug`, ou "Começar uma sessão" → `/estudar`. (FR-004)
  - `TotalsSummary` — respondidas, acertos, taxa geral (três números em linha, `highlight-mark` na taxa).
  - `AreaAccuracyChart` — lista das 4 áreas: rótulo, "47% · 7 de 15" (ou "Ainda não praticada") e barra horizontal decorativa na cor `pen-600` sobre `line`. (US1, FR-002)
  - `DailyXpChart` — colunas de XP por dia normalizadas pelo máximo da janela, rótulos de primeira/última data e do máximo; `aria-hidden`. (US3)
  - `ActivityCalendar` — grade de dias com `activeDay` preenchido em `pen-600` e vazio em `line`, com resumo textual visível. (US3)
  - `DailyTable` — tabela `sr-only` com a série completa. (FR-007)
- **Ajuste na 002:** `SessionFlowPage` lê `area` de `useSearchParams`, valida contra `AREAS` e inicia a sessão uma única vez (ref de "já disparou"); limpa o parâmetro com `setSearchParams(..., { replace: true })`. (FR-009)
- **Estados de UI:** `LoadingState` no primeiro carregamento; `ErrorState` com repetir; `EmptyState` conforme a decisão acima; troca de janela com conteúdo anterior esmaecido. (FR-006)
- **Acessibilidade/mobile:** alvos ≥ 44 px, `SegmentedTabs` navegável por teclado, `max-w-md` e nenhuma largura fixa que force rolagem horizontal em 320 px; a tabela `sr-only` e os resumos textuais dão o conteúdo dos gráficos ao leitor de tela. (FR-007, FR-008)

### Testes (Vitest + Testing Library + MSW)

- `PerformancePage.test.tsx`: 4 áreas com percentuais e "x de y"; área nula como "Ainda não praticada"; cada `reason` do cartão com texto e destino do botão; troca de janela chama `days=7`; 30/90 colunas; estado vazio com seletor visível; erro com repetir; tabela acessível com os valores da API.
- `SessionFlowPage.test.tsx`: `?area=matematica` cria a sessão em Matemática sem passar pela escolha; slug inválido mostra a escolha de área; sessão ativa de outra área abre o conflito.
- `LeaderboardPage.test.tsx` continua verde após a troca para `SegmentedTabs`.
- `interfaceSemEmoji.test.ts` cobre os novos arquivos automaticamente.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001 | Rota protegida `/desempenho`; atalho na Home e link no Perfil |
| FR-002 | `TotalsSummary` + `AreaAccuracyChart` a partir de `GET /me/performance` |
| FR-003 | Tipos espelham o contrato; só formatação de percentual e datas no cliente |
| FR-004 | `FocusCard` por `reason`, botão para `/estudar?area=slug` ou `/estudar` |
| FR-005 | `DailyXpChart` + `ActivityCalendar` + `SegmentedTabs` 7/30/90 (padrão 30) |
| FR-006 | `LoadingState`, `ErrorState` com repetir, `EmptyState` com ação |
| FR-007 | Texto visível nas barras, tabela `sr-only` e resumo textual; sem depender de cor |
| FR-008 | Mobile-first em `max-w-md`, alvos de 44 px, tablist navegável |
| FR-009 | `SessionFlowPage` inicia a sessão pela `area` da URL, reusando o fluxo de conflito |

## Riscos e pontos de atenção

- **Colunas finas em 90 dias** (~3 px em 320 px) → aceitável como tendência; o detalhe de cada dia está na tabela acessível. Se ficar ilegível no teste visual, agrupar por semana só para exibição.
- **Início automático pela URL** pode disparar duas vezes no StrictMode de desenvolvimento → guarda por ref + remoção do parâmetro; o POST já é idempotente para a sessão ativa no backend.
- **Extração do `SegmentedTabs`** toca o placar → sem mudança visual; os testes do placar validam.
- **Dependência do backend/007** (PR #26) → este branch parte do branch do backend; a PR do frontend só deve entrar depois dela.

## Fora de escopo

- Desempenho por assunto dentro da área, comparação com outros estudantes, metas, tooltips/interação nos gráficos, tema escuro, item novo na barra inferior.
