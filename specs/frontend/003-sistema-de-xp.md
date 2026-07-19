# Feature Specification (Frontend): Sistema de XP e Níveis

**Feature Branch**: frontend/003-sistema-de-xp

**Created**: 2026-07-14

**Status**: Draft

**Camada**: Frontend (React + TypeScript + Tailwind + Vite + React Router v6, Mobile-First)

**Contraparte**: [backend/003-sistema-de-xp.md](../backend/003-sistema-de-xp.md)

**Input**: O frontend traduz o XP em recompensa sentida: mostra o ganho em tempo real a cada acerto, o total ganho no resumo da sessão, o XP/nível no perfil e uma celebração ao subir de nível. Os valores são sempre os que a API confirma; a UI não é a fonte de verdade.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o XP subir em tempo real (Priority: P1)

A cada acerto, o estudante vê um retorno visual imediato do XP ganho (ex.: "+10 XP") e o contador de XP da sessão sobe. Ao final, o resumo mostra o XP ganho e o total atualizado.

**Why this priority**: O feedback imediato é o gatilho de recompensa que sustenta o hábito; é o valor central desta feature no cliente.

**Independent Test**: Fazer uma sessão, acertar questões e verificar a animação de XP por acerto, o contador da sessão e o total no resumo (coerentes com a API).

**Acceptance Scenarios**:

1.  **Given** um acerto, **When** o feedback aparece, **Then** a UI anima o XP ganho e incrementa o contador da sessão.

2.  **Given** um erro, **When** o feedback aparece, **Then** nenhum XP é somado na UI.

3.  **Given** o fim da sessão, **When** o resumo é exibido, **Then** mostra o XP ganho na sessão e o total atualizado, coerentes com a API.

### User Story 2 - Acompanhar nível e progresso (Priority: P2)

No perfil, o estudante vê seu nível atual, o XP total e uma barra de progresso até o próximo nível. Ao subir de nível, recebe uma celebração visível.

**Why this priority**: Dá horizonte de progressão de longo prazo; complementa a recompensa imediata.

**Independent Test**: Cruzar um limiar de nível durante o uso e verificar a celebração; abrir o perfil e conferir nível, XP e barra de progresso.

**Acceptance Scenarios**:

1.  **Given** XP suficiente para subir de nível, **When** o limiar é cruzado, **Then** a UI mostra uma celebração de "novo nível".

2.  **Given** o perfil aberto, **When** consultado, **Then** exibe nível, XP total e progresso até o próximo nível (dados da API).

### User Story 3 - Refletir a verdade da API com robustez (Priority: P2)

Se a confirmação de XP atrasar ou a conexão oscilar, a UI reconcilia com o valor oficial da API assim que disponível, sem exibir XP falso permanente.

**Why this priority**: Preserva a credibilidade da recompensa; a UI não pode "inventar" XP que o servidor não confirmou.

**Independent Test**: Simular atraso na confirmação de XP e verificar que a UI reconcilia com o valor da API sem divergência persistente.

**Acceptance Scenarios**:

1.  **Given** uma exibição otimista de XP, **When** a API confirma um valor diferente, **Then** a UI reconcilia para o valor oficial.

2.  **Given** falha ao obter o XP atualizado, **When** ocorre o erro, **Then** a UI evita mostrar totais incorretos e sinaliza atualização pendente.

### Edge Cases

- Sessão encerrada antes do fim — o resumo reflete o XP das questões acertadas.

- Acerto que sobe mais de um nível de uma vez — celebração e nível corretos.

- Divergência temporária entre XP otimista e confirmado — reconciliação.

- Animações não devem bloquear a próxima questão.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app DEVE exibir, em tempo real, o XP ganho a cada acerto durante a sessão.

- **FR-002**: O app NÃO DEVE somar XP na UI para erros.

- **FR-003**: O app DEVE exibir o XP ganho na sessão e o total atualizado no resumo, coerentes com a API.

- **FR-004**: O app DEVE exibir, no perfil, o XP total, o nível atual e o progresso até o próximo nível (dados da API).

- **FR-005**: O app DEVE apresentar uma celebração visível ao subir de nível.

- **FR-006**: O app DEVE reconciliar qualquer exibição otimista com o valor oficial da API assim que disponível.

- **FR-007**: O app DEVE evitar exibir totais incorretos em caso de falha, sinalizando atualização pendente.

- **FR-008**: As animações de XP NÃO DEVEM bloquear o avanço da sessão.

- **FR-009**: Os componentes de XP DEVEM ser mobile-first e acessíveis.

### Key Entities & UI

- **Indicadores**: contador de XP da sessão, "+XP" por acerto, XP total, nível, barra de progresso ao próximo nível.

- **Celebração de nível**: componente disparado ao cruzar um limiar informado pela API.

- **Modelo (view)**: XP total, nível, XP restante — obtidos de GET /me/xp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O XP ganho é exibido em até 1 segundo após o feedback de acerto em 95% dos casos.

- **SC-002**: O total exibido coincide com o valor da API em 100% das reconciliações concluídas.

- **SC-003**: 100% das subidas de nível confirmadas pela API geram celebração.

- **SC-004**: 0 casos de XP falso persistente exibido após reconciliação.

- **SC-005**: Componentes de XP passam em verificação de responsividade e acessibilidade.

## Assumptions

- A fonte de verdade do XP e do nível é o backend (feature 003 backend); a UI reflete e reconcilia.

- A curva de níveis e a regra de pontuação são fornecidas/derivadas via API.

- Exibição otimista é permitida desde que reconcilie com a API.

- Identidade visual detalhada definida à parte.
