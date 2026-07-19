# Feature Specification (Frontend): Placar de Líderes (Leaderboard)

**Feature Branch**: frontend/006-placar-de-lideres

**Created**: 2026-07-14

**Status**: Draft

**Camada**: Frontend (React + TypeScript + Tailwind + Vite + React Router v6, Mobile-First)

**Contraparte**: [backend/006-placar-de-lideres.md](../backend/006-placar-de-lideres.md)

**Input**: O frontend exibe o ranking por XP de forma clara e competitiva: lista ordenada, posição do próprio estudante em destaque, alternância entre recortes (geral/semanal) e carregamento incremental para grandes volumes. Os dados e a ordem vêm do backend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o ranking e a própria posição (Priority: P1)

O estudante abre o placar e vê a lista ordenada por XP (ranque, nome, XP), com sua própria linha destacada, mesmo que esteja fora do topo.

**Why this priority**: A comparação social e ver-se no ranking são o valor central do recurso.

**Independent Test**: Com dados da API, verificar a ordenação exibida e o destaque correto da posição própria (inclusive fora da primeira página).

**Acceptance Scenarios**:

1.  **Given** o placar aberto, **When** os dados carregam, **Then** a UI mostra a lista ordenada por XP desc com ranque, nome e XP.

2.  **Given** um estudante fora do topo, **When** abre o placar, **Then** sua posição e XP aparecem destacados, ainda que fora da lista visível.

3.  **Given** nomes de exibição iguais, **When** listados, **Then** a UI os diferencia (conforme desambiguação da API).

### User Story 2 - Alternar entre recortes (Priority: P2)

O estudante alterna entre o placar geral (todos os tempos) e o semanal, e a lista se reordena conforme o recorte.

**Why this priority**: Dá chance a iniciantes e renova a motivação; secundário ao ranking básico.

**Independent Test**: Trocar o filtro geral/semanal e verificar a reordenação conforme os dados de cada recorte da API.

**Acceptance Scenarios**:

1.  **Given** o placar aberto, **When** seleciona o recorte semanal, **Then** a lista passa a refletir o XP do período vigente.

2.  **Given** o recorte semanal, **When** volta ao geral, **Then** a lista reflete o XP acumulado de todos os tempos.

### User Story 3 - Navegar grandes volumes com fluidez (Priority: P2)

Com muitos estudantes, a UI carrega o ranking de forma incremental (paginação ou rolagem infinita), com estados de carregamento e vazio adequados.

**Why this priority**: Uma lista enorme precisa carregar bem no celular; importante para produção.

**Independent Test**: Com base grande (API), verificar carregamento incremental sem duplicatas nem saltos, e o estado vazio quando há poucos estudantes.

**Acceptance Scenarios**:

1.  **Given** uma base grande, **When** o estudante rola/pagina, **Then** mais itens carregam sem repetição nem lacunas.

2.  **Given** poucos estudantes cadastrados, **When** abre o placar, **Then** a UI mostra um estado adequado (quase vazio) sem parecer quebrada.

### Edge Cases

- Estudante com 0 XP — como aparece (ou não) na lista, conforme a API.

- Atualização do ranking durante a navegação — evitar saltos confusos.

- Falha ao carregar mais itens — mensagem e opção de repetir.

- Recorte semanal alinhado ao fuso do backend (feature 004).

- Preferência de privacidade: **decidido** — não existe no MVP (placar global, conforme backend/006 FR-011); nada a refletir na UI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app DEVE exibir o ranking ordenado por XP desc, com ranque, nome e XP, conforme a API.

- **FR-002**: O app DEVE destacar a posição e o XP do próprio estudante, mesmo fora da página inicial.

- **FR-003**: O app DEVE oferecer alternância entre os recortes geral e semanal.

- **FR-004**: O app DEVE carregar o ranking de forma incremental (paginação/rolagem infinita) sem duplicatas nem lacunas.

- **FR-005**: O app DEVE apresentar estados de carregamento, erro (com repetir) e vazio.

- **FR-006**: O app NÃO DEVE reordenar por conta própria; a ordem vem da API.

- **FR-007**: O app DEVE diferenciar visualmente nomes repetidos conforme a desambiguação da API.

- **FR-008**: **Decidido**: sem preferências de privacidade no MVP (placar global, conforme backend/006 FR-011); o app não precisa tratar esse caso.

- **FR-009**: Os componentes DEVEM ser mobile-first e acessíveis.

### Key Entities & UI

- **Lista de ranking**: itens com ranque, nome, XP; item próprio destacado.

- **Seletor de recorte**: geral/semanal.

- **Controles de carregamento**: paginação/rolagem, estados vazio/erro.

- **Modelo (view)**: obtido de GET /leaderboard?scope=... e posição própria.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A ordem exibida coincide com a da API em 100% das telas.

- **SC-002**: A posição do próprio estudante é exibida e correta em 100% dos acessos.

- **SC-003**: A primeira página é exibida em até 2 segundos em 95% dos acessos.

- **SC-004**: A troca de recorte reordena a lista em até 1 segundo em 95% dos casos.

- **SC-005**: O carregamento incremental não repete nem omite itens (0 inconsistências percebidas).

- **SC-006**: Componentes passam em verificação de responsividade e acessibilidade.

## Assumptions

- A ordenação, os recortes e a paginação são fornecidos pelo backend (feature 006 backend); a UI reflete.

- O recorte inicial é geral + semanal; o fuso segue a feature 004.

- Grupos/ligas e controles de privacidade são refinamentos futuros.

- Identidade visual detalhada definida à parte.
