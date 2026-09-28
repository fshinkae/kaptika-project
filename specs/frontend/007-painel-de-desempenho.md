# Feature Specification (Frontend): Painel de Desempenho

**Feature Branch**: frontend/007-painel-de-desempenho

**Created**: 2026-09-27

**Status**: Implemented

**Camada**: Frontend (React + TypeScript + Tailwind + Vite + React Router, Mobile-First)

**Contraparte**: [backend/007-painel-de-desempenho.md](../backend/007-painel-de-desempenho.md)

**Input**: O frontend oferece uma tela de desempenho com infográficos: taxa de acerto por área do ENEM, um destaque do que o estudante deve melhorar (com atalho para estudar aquela área) e a evolução no tempo (XP por dia e calendário de dias ativos). Todos os números e a recomendação vêm do backend; a UI só apresenta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o desempenho por área (Priority: P1)

O estudante abre "Desempenho" e vê um gráfico de barras com a taxa de acerto em cada uma das quatro áreas, com acertos/respondidas ao lado, e um resumo geral no topo (respondidas, acertos, taxa geral).

**Why this priority**: É a resposta direta a "como estou indo?" e o infográfico central da tela.

**Independent Test**: Com dados da API (MSW), verificar que as quatro áreas aparecem com os valores e proporções corretos, e que uma área sem respostas aparece como "Ainda não praticada", não como 0%.

**Acceptance Scenarios**:

1.  **Given** o painel aberto, **When** os dados carregam, **Then** a UI mostra as quatro áreas com barra proporcional à taxa, percentual e "acertos de respondidas".

2.  **Given** uma área com `accuracy = null`, **When** exibida, **Then** a barra fica vazia com o texto "Ainda não praticada", sem percentual.

3.  **Given** um leitor de tela, **When** percorre o gráfico, **Then** cada área é lida como texto (ex.: "Matemática: 47% de acerto, 7 de 15") — o gráfico não depende só de cor ou forma.

### User Story 2 - Saber o que melhorar e agir (Priority: P1)

Acima dos gráficos, um cartão "Onde focar" mostra a recomendação da API com texto explicativo e um botão que inicia uma sessão já na área recomendada.

**Why this priority**: Converte o diagnóstico em ação imediata — é o motivo de a tela existir.

**Independent Test**: Para cada motivo da API (`LOWEST_ACCURACY`, `NOT_PRACTICED`, `INSUFFICIENT_DATA`), verificar o texto exibido e o destino do botão.

**Acceptance Scenarios**:

1.  **Given** recomendação `LOWEST_ACCURACY` em Matemática, **When** o cartão é exibido, **Then** mostra "Matemática é sua área com menor acerto (47%)" e o botão "Estudar Matemática".

2.  **Given** recomendação `NOT_PRACTICED` em Ciências da Natureza, **When** o cartão é exibido, **Then** convida a experimentar a área ("Você ainda não praticou Ciências da Natureza").

3.  **Given** recomendação `INSUFFICIENT_DATA`, **When** o cartão é exibido, **Then** explica que faltam respostas para um diagnóstico e oferece "Começar uma sessão" sem área fixa.

4.  **Given** o botão "Estudar <área>", **When** tocado, **Then** o estudante vai para `/estudar` com a área pré-selecionada.

### User Story 3 - Acompanhar a evolução (Priority: P2)

O estudante vê um gráfico de colunas com XP ganho por dia e um calendário (heatmap) com os dias em que cumpriu a meta, e alterna a janela entre 7, 30 e 90 dias.

**Why this priority**: Mostra constância e progresso; reforça o hábito, mas é secundário ao diagnóstico por área.

**Independent Test**: Trocar a janela e verificar nova consulta à API com o parâmetro certo e os gráficos com o número de dias correspondente.

**Acceptance Scenarios**:

1.  **Given** a janela de 30 dias, **When** os dados carregam, **Then** o gráfico mostra 30 colunas na ordem cronológica, com dias sem XP como coluna vazia.

2.  **Given** o seletor de janela, **When** o estudante escolhe 7 dias, **Then** a UI consulta a API com `days=7` e mantém o conteúdo anterior visível (esmaecido) até a nova resposta chegar.

3.  **Given** o calendário, **When** um dia tem `activeDay = true`, **Then** a célula aparece preenchida e o rótulo acessível informa data e "meta cumprida".

### Edge Cases

- Estudante sem nenhuma resposta: estado **vazio** próprio ("Faça sua primeira sessão para ver seu desempenho") com botão para `/estudar`, em vez de gráficos zerados.

- Erro de rede/API: estado de **erro** com "Tentar de novo".

- Tela estreita (320 px): barras e colunas cabem sem rolagem horizontal da página; o calendário de 90 dias quebra em linhas/semanas.

- Tema escuro: cores dos gráficos seguem os tokens da identidade "Cartão-resposta", sem emojis.

- Datas exibidas conforme as datas locais devolvidas pela API (fuso do servidor), sem reconverter no cliente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app DEVE ter a rota protegida `/desempenho`, com entrada a partir da Home e do Perfil.

- **FR-002**: O app DEVE exibir o resumo geral e o gráfico de taxa de acerto por área a partir de `GET /me/performance`.

- **FR-003**: O app NÃO DEVE calcular taxas, recomendação nem agregados: exibe os valores da API (formatar percentual é permitido).

- **FR-004**: O app DEVE exibir o cartão "Onde focar" conforme o motivo da recomendação, com ação que leva a `/estudar` com a área pré-selecionada quando houver área.

- **FR-005**: O app DEVE exibir XP por dia e calendário de dias ativos da janela, com seletor 7/30/90 dias (padrão 30), conforme a lista definida no backend/007 FR-009.

- **FR-006**: O app DEVE tratar os estados de carregamento, erro (com repetir) e vazio.

- **FR-007**: Todo gráfico DEVE ter equivalente textual acessível (rótulos ou tabela visualmente oculta) e não depender apenas de cor.

- **FR-008**: Os componentes DEVEM ser mobile-first, com alvos de toque adequados e navegáveis por teclado.

- **FR-009**: O fluxo de sessão (feature 002) DEVE aceitar a área pré-selecionada vinda do painel (ex.: `/estudar?area=matematica`) — ajuste pequeno na tela existente.

### Key Entities & UI

- **Resumo geral**: respondidas, acertos, taxa geral.

- **Gráfico por área**: quatro barras horizontais com percentual e "x de y".

- **Cartão "Onde focar"**: texto por motivo + botão de ação.

- **Gráfico de evolução**: colunas de XP por dia.

- **Calendário de atividade**: grade de dias com meta cumprida.

- **Seletor de janela**: 7 / 30 / 90 dias.

- **Modelo (view)**: obtido de `GET /me/performance?days=...` (contrato no backend/007).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Os valores exibidos coincidem com os da API em 100% das telas.

- **SC-002**: O painel aparece em até 2 segundos em 95% dos acessos.

- **SC-003**: A troca de janela atualiza os gráficos em até 1 segundo em 95% dos casos.

- **SC-004**: Do cartão "Onde focar", o estudante chega a uma sessão na área recomendada em 1 toque.

- **SC-005**: A tela passa em verificação de responsividade (320 px a desktop) e acessibilidade (leitor de tela lê todos os valores dos gráficos).

## Assumptions

- Dados, recomendação e janelas vêm do backend (feature 007 backend); a UI reflete.

- Biblioteca de gráficos é decisão do `/plan`: os gráficos são simples (barras, colunas, grade), então SVG próprio com Tailwind é o candidato natural para evitar uma dependência nova; uma biblioteca só entra se o plano justificar.

- Identidade visual segue a "Cartão-resposta" já implantada (tokens de cor, sem emojis).

- Desempenho por assunto dentro da área está fora do MVP (ver backend/007 FR-012).
