# Feature Specification (Frontend): Medalhas e Conquistas (Badges)

**Feature Branch**: frontend/005-medalhas-e-conquistas

**Created**: 2026-07-14

**Status**: Implemented

**Camada**: Frontend (React + TypeScript + Tailwind + Vite + React Router v6, Mobile-First)

**Contraparte**: [backend/005-medalhas-e-conquistas.md](../backend/005-medalhas-e-conquistas.md)

**Input**: O frontend exibe as medalhas como coleção motivadora: celebra a conquista no momento em que a API a concede, mostra uma galeria com conquistadas e bloqueadas (com progresso) e destaca as medalhas no perfil.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Celebrar a conquista de uma medalha (Priority: P1)

Quando a API concede uma medalha (ao satisfazer a condição), a UI exibe uma celebração destacando a medalha conquistada.

**Why this priority**: A celebração é a recompensa sentida que dá sentido às metas; núcleo da feature no cliente.

**Independent Test**: Disparar (via API) a concessão de uma medalha e verificar a celebração; confirmar que uma medalha já obtida não recelebra indevidamente.

**Acceptance Scenarios**:

1.  **Given** a API concede uma nova medalha, **When** o cliente é notificado, **Then** a UI exibe uma celebração com nome e representação da medalha.

2.  **Given** uma medalha já conquistada, **When** o estado é recarregado, **Then** a UI não dispara nova celebração para ela.

### User Story 2 - Explorar a galeria e o progresso (Priority: P2)

O estudante abre a galeria e vê medalhas conquistadas (com data) e bloqueadas (com objetivo e, quando cumulativas, uma barra de progresso).

**Why this priority**: Torna as medalhas "colecionáveis"; depende de existir concessão.

**Independent Test**: Abrir a galeria com dados da API e conferir separação conquistadas/bloqueadas, datas e progresso das cumulativas.

**Acceptance Scenarios**:

1.  **Given** o estudante com algumas medalhas, **When** abre a galeria, **Then** vê conquistadas (com data) e bloqueadas (com objetivo).

2.  **Given** uma medalha cumulativa bloqueada, **When** inspecionada, **Then** a UI mostra o progresso (X de Y) informado pela API.

### User Story 3 - Destacar medalhas no perfil (Priority: P3)

As medalhas conquistadas aparecem no perfil, reforçando identidade e status. Um estado vazio incentiva a conquistar a primeira.

**Why this priority**: Amplifica o valor identitário; refinamento.

**Independent Test**: Perfil com medalhas mostra os destaques; perfil sem medalhas mostra um estado vazio incentivador.

**Acceptance Scenarios**:

1.  **Given** medalhas conquistadas, **When** o perfil é aberto, **Then** elas aparecem em destaque.

2.  **Given** nenhuma medalha, **When** o perfil é aberto, **Then** a UI mostra um estado vazio que incentiva a primeira conquista.

### Edge Cases

- Celebração enfileirada quando várias medalhas são concedidas de uma vez.

- Medalha concedida durante uma sessão — celebrar sem atrapalhar o fluxo.

- Estado de carregamento/erro ao buscar a coleção.

- Representações visuais de medalhas que falham ao carregar — fallback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app DEVE exibir uma celebração quando a API concede uma nova medalha.

- **FR-002**: O app NÃO DEVE recelebrar medalhas já conquistadas ao recarregar o estado.

- **FR-003**: O app DEVE apresentar uma galeria separando conquistadas (com data) e bloqueadas (com objetivo).

- **FR-004**: O app DEVE exibir o progresso (X de Y) para medalhas cumulativas, conforme a API.

- **FR-005**: O app DEVE destacar as medalhas conquistadas no perfil e mostrar um estado vazio quando não houver.

- **FR-006**: O app DEVE enfileirar/coordenar múltiplas celebrações sem bloquear a navegação.

- **FR-007**: O app DEVE mostrar estados de carregamento/erro ao obter a coleção.

- **FR-008**: Os componentes DEVEM ser mobile-first e acessíveis.

### Key Entities & UI

- **Galeria**: lista de medalhas com estado (conquistada/bloqueada), data e progresso.

- **Celebração**: componente disparado ao receber concessão da API.

- **Destaque no perfil**: subconjunto de medalhas conquistadas.

- **Modelo (view)**: obtido de GET /me/badges (coleção + progresso).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das concessões reportadas pela API geram exatamente uma celebração.

- **SC-002**: 0 recelebrações de medalhas já conquistadas.

- **SC-003**: A galeria reflete estado, data e progresso corretos em 100% das visualizações (coerente com a API).

- **SC-004**: Múltiplas celebrações simultâneas não travam a UI (verificável em teste).

- **SC-005**: Componentes passam em verificação de responsividade e acessibilidade.

## Assumptions

- A concessão, o catálogo e o progresso vêm do backend (feature 005 backend); a UI reflete.

- A lista inicial de medalhas é fornecida via API.

- Identidade visual detalhada (ícones/arte das medalhas) definida à parte.
