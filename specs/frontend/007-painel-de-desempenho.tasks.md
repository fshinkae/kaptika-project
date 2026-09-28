# Tarefas: Painel de Desempenho (Frontend)

**Spec:** specs/frontend/007-painel-de-desempenho.md

**Plano:** specs/frontend/007-painel-de-desempenho.plan.md

**Camada:** Frontend

> Gerado na fase /tasks. Checklist executável. Não contém código. `[P]` = paralelizável (arquivos diferentes, sem dependência). `[Ref]` = FR/US relacionado. Caminhos relativos a `frontend/src/`.

## Fase 1 — Preparação

- [x] T001 [P] [FR-005] Extrair o seletor do placar para o componente genérico `components/SegmentedTabs.tsx` (tablist, alvos de 44 px, mesmo visual) e trocar `features/leaderboard/ScopeTabs.tsx` para usá-lo; testes do placar seguem verdes
- [x] T002 [P] [FR-001] Adicionar `ChartIcon` em `components/Icons.tsx`, no mesmo traço dos ícones existentes

## Fase 2 — Fundação (bloqueia o resto)

- [x] T003 [FR-002,FR-003] Tipos do contrato do backend/007 (`PerformanceResponse`, `AreaPerformance`, `Recommendation`, `DailyPoint`, `Reason`), `WINDOWS = [7, 30, 90]` e `getPerformance(days)` via `apiFetch` em `features/performance/performanceApi.ts`
- [x] T004 [FR-005,FR-006] Hook `usePerformance(days)` com `queryKey ['performance', days]` e `placeholderData: keepPreviousData` em `features/performance/usePerformance.ts`
- [x] T005 [FR-001,FR-006] `PerformancePage` com `PageHeader`, seletor de janela (padrão 30), estados carregando/erro (repetir)/vazio e conteúdo esmaecido com `aria-busy` durante a troca, em `features/performance/PerformancePage.tsx`; exportar em `features/performance/index.ts`; rota protegida `/desempenho` em `App.tsx`

## Fase 3 — História US1 (P1) 🎯 Desempenho por área

- [x] T006 [P] [US1] [FR-002] `TotalsSummary` (respondidas, acertos, taxa geral) em `features/performance/TotalsSummary.tsx`
- [x] T007 [P] [US1] [FR-002,FR-007] `AreaAccuracyChart`: 4 áreas com rótulo de `AREAS`, "47% · 7 de 15" ou "Ainda não praticada", barra decorativa proporcional, em `features/performance/AreaAccuracyChart.tsx`
- [x] T008 [US1] [SC-001,SC-005] Testes: 4 áreas com percentuais e "x de y"; área nula como "Ainda não praticada"; totais; estados carregando, erro com repetir e vazio (seletor visível) — em `features/performance/PerformancePage.test.tsx`

## Fase 4 — História US2 (P1) — Onde focar

- [x] T009 [US2] [FR-004] `FocusCard`: texto por `reason` e botão "Estudar <área>" → `/estudar?area=slug` ou "Começar uma sessão" → `/estudar`, em `features/performance/FocusCard.tsx`
- [x] T010 [US2] [FR-009] `SessionFlowPage`: ler `area` da URL, validar contra `AREAS`, iniciar a sessão uma única vez e remover o parâmetro com `replace`; incluir `['performance']` em `PROGRESS_QUERY_KEYS`, em `features/session/SessionFlowPage.tsx`
- [x] T011 [US2] [SC-004] Testes: cada `reason` com texto e destino do botão (em `features/performance/PerformancePage.test.tsx`); `?area=matematica` cria a sessão sem passar pela escolha, slug inválido mostra a escolha, ativa de outra área abre o conflito (em `features/session/SessionFlowPage.test.tsx`)

## Fase 5 — História US3 (P2) — Evolução no tempo

- [x] T012 [P] [US3] [FR-005] `DailyXpChart`: colunas de XP normalizadas pelo máximo da janela, rótulos de primeira/última data e do máximo, `aria-hidden`, em `features/performance/DailyXpChart.tsx`
- [x] T013 [P] [US3] [FR-005,FR-007] `ActivityCalendar`: grade semanas × dias da semana alinhada ao dia da semana de `from`, `activeDay` preenchido, resumo textual "Meta cumprida em N de M dias", em `features/performance/ActivityCalendar.tsx`
- [x] T014 [P] [US3] [FR-007] `DailyTable` `sr-only` com data, XP, respondidas, acertos e meta cumprida por dia, em `features/performance/DailyTable.tsx`
- [x] T015 [US3] [SC-003] Testes: troca de janela consulta `days=7` e mantém o conteúdo anterior até a resposta; 30/90 colunas; tabela acessível com os valores da API; datas formatadas sem deslocamento de fuso — em `features/performance/PerformancePage.test.tsx`

## Fase 6 — Pontos de entrada

- [x] T016 [P] [FR-001] Atalho de largura total "Seu desempenho" acima de Medalhas/Placar em `pages/HomePage.tsx`
- [x] T017 [P] [FR-001] Link "Ver desempenho" abaixo das estatísticas em `pages/ProfilePage.tsx`

## Fase 7 — Conferência

- [x] T018 [SC-001..SC-006] Rodar `npm run lint`, `npm run build` e `npm test`; conferir no navegador (dev server contra o backend/007) a tela em 320 px e desktop, o fluxo "Onde focar" → sessão em 1 toque e a leitura dos gráficos pela árvore de acessibilidade; registrar o resultado e atualizar o **Status** da spec para `Implemented`

## Dependências

- T001–T002 são independentes; T003 bloqueia T004–T017.
- T004 bloqueia T005; T005 bloqueia os testes de página (T008, T011, T015) e a composição dos componentes.
- T006, T007, T012, T013 e T014 podem rodar em paralelo após T003.
- T009 depende de T003; T010 só depende da feature 002 existente.
- T016–T017 dependem de T002 (ícone) e da rota (T005).
- T018 depende de todas as anteriores.

## Notas

- Nenhuma dependência nova de gráficos: barras e grades em HTML + Tailwind, só com tokens da identidade "Cartão-resposta".
- A UI não calcula taxas nem recomendação; só formata percentual (`Math.round(accuracy * 100)`) e datas `AAAA-MM-DD` sem reconverter fuso.
- Sem emoji nos `.tsx` — o teste ICON-1 cobre os arquivos novos.
- Commits por tarefa ou grupo: `feat(007): FR-XXX descrição` / `test(007): SC-XXX descrição`; refatoração do seletor como `refactor(006): ...`.
- Ao concluir, marque a caixa: `- [ ]` → `- [x]`.

## Resultado da conferência (2026-09-27)

- `npm test`: 108 testes, 0 falhas (novos: `PerformancePage.test.tsx` e 3 casos de área pela URL em `SessionFlowPage.test.tsx`, um deles em StrictMode). `npm run build` ok. `npm run lint`: só os 5 avisos `only-export-components` já existentes, nenhum em arquivo desta feature.
- Navegador (dev server, sessão local falsa e API simulada no próprio navegador — sem backend local nem login real): tela em 320 px, 375 px e 7/30/90 dias; sem rolagem horizontal; atalhos na Home e no Perfil; "Estudar Matemática" faz um único `POST /sessions {"area":"matematica"}` e limpa o parâmetro da URL.
- Encontrado e corrigido na conferência: (1) a tabela `sr-only` estourava a largura em 375 px (tabela ignora `width: 1px`) — o `sr-only` foi para um `div` em volta; (2) em StrictMode o início pela URL ficava preso em "Separando questões…" — o disparo passou a ser adiado e cancelável, com teste em StrictMode.
- **SC-001** atendido — valores exibidos vêm da API sem recálculo (testes por área, totais e tabela).
- **SC-002** atendido nos testes e no navegador com API simulada (atraso de 400 ms); tempo real contra o backend não medido.
- **SC-003** atendido — troca de janela mantém o conteúdo com `aria-busy` e atualiza ao chegar a resposta; mesmo limite de medição do SC-002.
- **SC-004** atendido — do cartão "Onde focar" para a sessão da área em 1 toque.
- **SC-005** atendido — 320 px a desktop sem rolagem horizontal; gráficos com texto visível, tabela acessível e resumo textual.
