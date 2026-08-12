# Feature Specification (Frontend): Sessões de Estudo

**Feature Branch**: frontend/002-sessoes-de-estudo

**Created**: 2026-07-14

**Status**: Implemented

**Camada**: Frontend (React + TypeScript + Tailwind + Vite + React Router v6, Mobile-First)

**Contraparte**: [backend/002-sessoes-de-estudo.md](../backend/002-sessoes-de-estudo.md)

**Input**: A experiência de microlearning no cliente: escolher área, responder questões uma a uma com feedback imediato, ver o progresso da sessão e o resumo final. Tudo mobile-first, resiliente a interrupções e a conexões instáveis, consumindo os endpoints de sessão da API.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Responder uma sessão curta com feedback imediato (Priority: P1)

O estudante escolhe uma área, vê uma questão por vez com suas alternativas, seleciona e confirma, recebe feedback imediato de acerto/erro (destacando a alternativa correta) e avança até o resumo final.

**Why this priority**: É a jornada central do produto no cliente; entrega a proposta de valor do microlearning.

**Independent Test**: Iniciar uma sessão, responder as questões e verificar feedback por questão, o indicador de progresso e o resumo final.

**Acceptance Scenarios**:

1.  **Given** a tela inicial, **When** o estudante escolhe uma área e inicia, **Then** a primeira questão aparece com enunciado e alternativas.

2.  **Given** uma questão, **When** seleciona uma alternativa e confirma, **Then** a UI mostra imediatamente acerto/erro e a alternativa correta.

3.  **Given** uma resposta confirmada, **When** avança, **Then** vê a próxima questão e um indicador de progresso (ex.: 3/20).

4.  **Given** a última questão, **When** conclui, **Then** vê o resumo com acertos, erros e total.

### User Story 2 - Retomar ou encerrar uma sessão interrompida (Priority: P2)

Se o estudante fecha o app ou perde conexão no meio da sessão, ao voltar ele pode retomar da próxima questão pendente ou encerrar, sem perder respostas já dadas.

**Why this priority**: O público estuda no celular, com interrupções frequentes; preservar o progresso sustenta o hábito.

**Independent Test**: Responder parte de uma sessão, fechar/reabrir e confirmar a opção de retomar do ponto correto; encerrar antecipadamente e ver o resumo parcial.

**Acceptance Scenarios**:

1.  **Given** uma sessão em andamento, **When** o app é reaberto, **Then** o app oferece retomar da próxima questão pendente (estado obtido da API).

2.  **Given** uma sessão em andamento, **When** o estudante escolhe encerrar, **Then** a UI confirma e mostra o resumo do que foi respondido.

3.  **Given** uma resposta já confirmada, **When** o estudante tenta alterá-la, **Then** a UI não permite mudança.

### User Story 3 - Lidar com falhas de carregamento (Priority: P2)

Quando a API/fonte de questões falha ou está lenta, o estudante vê estados de carregamento e mensagens claras, com opção de tentar novamente, sem travamentos.

**Why this priority**: Falhas silenciosas quebram a confiança; tratá-las é importante, porém secundário ao fluxo feliz.

**Independent Test**: Simular erro/latência da API ao iniciar e ao buscar a próxima questão; verificar skeleton/loading, mensagem de erro e botão de repetir.

**Acceptance Scenarios**:

1.  **Given** falha ao iniciar a sessão, **When** ocorre o erro, **Then** a UI informa claramente e oferece tentar novamente.

2.  **Given** latência ao carregar uma questão, **When** aguarda, **Then** a UI mostra estado de carregamento sem congelar a interface.

3.  **Given** uma questão com imagem que não carrega, **When** exibida, **Then** a UI mostra um fallback e não bloqueia a resposta.

### Edge Cases

- Toques repetidos no botão de confirmar (evitar envio duplicado no cliente).

- Voltar do navegador no meio da sessão — comportamento previsível.

- Sessão com menos questões que o alvo — refletir o total real na UI.

- Conexão cai exatamente ao confirmar — feedback de reenvio seguro.

- Acessibilidade: navegação por teclado/leitor de tela nas alternativas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app DEVE permitir escolher uma das quatro áreas do ENEM e iniciar a sessão via API.

- **FR-002**: O app DEVE exibir uma questão por vez, com enunciado, imagem (quando houver) e alternativas.

- **FR-003**: O app DEVE exigir seleção e confirmação antes de revelar o resultado.

- **FR-004**: O app DEVE mostrar feedback imediato de acerto/erro e a alternativa correta após a confirmação, conforme retorno da API.

- **FR-005**: O app DEVE exibir um indicador de progresso da sessão (ex.: N/total).

- **FR-006**: O app DEVE impedir alteração de uma resposta já confirmada e evitar envios duplicados por toques repetidos.

- **FR-007**: O app DEVE exibir o resumo final com acertos, erros e total.

- **FR-008**: O app DEVE permitir retomar uma sessão interrompida a partir do estado obtido da API, ou encerrá-la.

- **FR-009**: O app DEVE apresentar estados de carregamento e de erro com opção de tentar novamente em falhas da API.

- **FR-010**: O app DEVE refletir o total real de questões quando a sessão tiver menos que o alvo.

- **FR-011**: O app DEVE ser mobile-first e acessível (alvos de toque, teclado, leitor de tela).

- **FR-012**: O app DEVE integrar-se ao feedback de XP em tempo real (feature 003) a cada acerto, sem impedir a navegação.

### Key Entities & UI

- **Telas/Rotas**: seleção de área, questão da sessão, resumo da sessão.

- **Modelo de sessão (view)**: área, questão atual, alternativas, progresso, estado (em andamento/encerrada), respostas já dadas.

- **Estados de UI**: carregando, erro (com repetir), fim de sessão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A primeira questão aparece em até 3 segundos após a escolha da área em 90% dos casos (conexão típica de celular).

- **SC-002**: O feedback de acerto/erro aparece em até 1 segundo após confirmar em 95% dos casos.

- **SC-003**: 0 envios duplicados de resposta atribuíveis à UI (toques repetidos).

- **SC-004**: 100% das falhas de API exibem mensagem clara e opção de repetir.

- **SC-005**: 60% das sessões iniciadas são concluídas nos primeiros 30 dias (métrica de acompanhamento).

- **SC-006**: As telas passam em verificação de responsividade e acessibilidade básica (contraste, foco, rótulos).

## Assumptions

- A correção e o gabarito vêm da API (feature 002 backend); a UI apenas exibe o que a API retorna.

- O estado de retomada é servido pelo backend; o cliente não é a fonte de verdade.

- A identidade visual detalhada é definida à parte.

- O feedback de XP é fornecido pela feature 003 (frontend), acionado nos acertos.
