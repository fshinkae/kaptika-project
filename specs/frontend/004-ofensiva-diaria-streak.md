# Feature Specification (Frontend): Ofensiva Diária (Streak)

**Feature Branch**: frontend/004-ofensiva-diaria-streak

**Created**: 2026-07-14

**Status**: Draft

**Camada**: Frontend (React + TypeScript + Tailwind + Vite + React Router v6, Mobile-First)

**Contraparte**: [backend/004-ofensiva-diaria-streak.md](../backend/004-ofensiva-diaria-streak.md)

**Input**: O frontend exibe a ofensiva de forma motivadora: um contador visível de dias seguidos, uma comemoração ao manter e uma comunicação clara (com peso emocional adequado) quando a ofensiva é perdida. O estado é sempre o que o backend reporta — o cliente não decide manter ou quebrar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver e sentir a ofensiva (Priority: P1)

O estudante vê, em destaque, quantos dias seguidos estudou. Ao cumprir a meta do dia, recebe um reforço visual de que a ofensiva foi mantida/incrementada.

**Why this priority**: O contador visível é o principal gatilho de hábito no cliente.

**Independent Test**: Com um estado de ofensiva vindo da API, verificar o contador exibido; ao cumprir a meta (evento da API), verificar o reforço visual.

**Acceptance Scenarios**:

1.  **Given** um estudante autenticado, **When** abre o app, **Then** vê sua ofensiva atual em destaque (valor da API).

2.  **Given** a meta do dia recém-cumprida, **When** o backend confirma o incremento, **Then** a UI mostra um reforço de "ofensiva mantida" com o novo valor.

3.  **Given** ofensiva já contabilizada hoje, **When** o estudante estuda mais, **Then** a UI não sugere um segundo incremento no mesmo dia.

### User Story 2 - Comunicar a perda da ofensiva (Priority: P1)

Quando o backend indica que a ofensiva foi quebrada desde o último acesso, a UI comunica a perda de forma clara e empática (sem culpabilizar), incentivando recomeçar.

**Why this priority**: A quebra precisa ser sentida para motivar constância, mas a comunicação deve cuidar do bem-estar do estudante.

**Independent Test**: Com um estado de "quebrada" vindo da API, verificar que a UI mostra a perda e um incentivo positivo para recomeçar.

**Acceptance Scenarios**:

1.  **Given** a API reporta ofensiva quebrada desde o último acesso, **When** o estudante retorna, **Then** a UI comunica a perda de forma clara e encorajadora.

2.  **Given** a ofensiva quebrada, **When** o estudante volta a cumprir a meta, **Then** a UI mostra a nova ofensiva começando em 1.

3.  **Given** um recorde histórico, **When** o estudante consulta, **Then** a UI exibe a maior ofensiva já alcançada.

### User Story 3 - Congelamento (freeze) na interface (Priority: P3)

A UI mostra os congelamentos disponíveis e comunica quando um foi usado para preservar a ofensiva.

**Why this priority**: Reduz frustração após um deslize; refinamento sobre o básico.

**Independent Test**: Com freeze disponível e um dia perdido (estado da API), verificar que a UI mostra a preservação e o consumo de um freeze.

**Acceptance Scenarios**:

1.  **Given** freeze disponível, **When** a API preserva a ofensiva num dia perdido, **Then** a UI comunica que um congelamento foi usado.

2.  **Given** o estado da ofensiva, **When** exibido, **Then** a UI mostra quantos freezes restam.

### Edge Cases

- Estudo próximo à meia-noite: a UI reflete a virada conforme o backend, sem cálculo próprio.

- Diferença entre o relógio do dispositivo e o do servidor — a UI segue o servidor.

- Comunicação da perda deve ser empática e não ansiogênica (bem-estar).

- Estado de carregamento enquanto a ofensiva é buscada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app DEVE exibir a ofensiva atual em destaque quando autenticado (valor da API).

- **FR-002**: O app DEVE dar reforço visual ao manter/incrementar a ofensiva, conforme confirmação do backend.

- **FR-003**: O app NÃO DEVE calcular manter/quebrar por conta própria; segue o estado da API.

- **FR-004**: O app DEVE comunicar a quebra da ofensiva de forma clara e empática quando o backend a reportar.

- **FR-005**: O app DEVE exibir o recorde histórico de ofensiva.

- **FR-006**: O app DEVE exibir, quando aplicável, os congelamentos disponíveis e o uso de um freeze (P3).

- **FR-007**: O app DEVE mostrar estados de carregamento/erro ao obter o estado da ofensiva.

- **FR-008**: Os componentes de ofensiva DEVEM ser mobile-first e acessíveis.

- **FR-009**: A comunicação de perda DEVE evitar tom culpabilizador ou ansiogênico (cuidado com o bem-estar do estudante).

### Key Entities & UI

- **Indicador de ofensiva**: valor atual, ícone/representação, recorde.

- **Aviso de perda**: mensagem empática exibida no retorno quando houve quebra.

- **Freeze (P3)**: contagem de congelamentos e aviso de uso.

- **Modelo (view)**: obtido de GET /me/streak (atual, recorde, sinal de quebra, freezes).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A ofensiva exibida coincide com o estado da API em 100% das telas.

- **SC-002**: 100% das quebras reportadas pela API são comunicadas ao estudante no retorno.

- **SC-003**: A comunicação de perda é avaliada como clara e não ansiogênica em testes de usabilidade.

- **SC-004**: O recorde exibido nunca é inferior ao real (coerente com a API).

- **SC-005**: Componentes passam em verificação de responsividade e acessibilidade.

## Assumptions

- A autoridade sobre manter/quebrar/recorde/freeze é o backend (feature 004 backend); a UI reflete.

- O fuso e a meta diária são definidos no backend; a UI não os recalcula.

- Notificações/lembretes (push) estão fora do escopo desta spec.

- Identidade visual detalhada definida à parte.
