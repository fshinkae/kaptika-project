# Feature Specification (Frontend): Análise de IA da Sessão

**Feature Branch**: frontend/008-analise-ia-da-sessao

**Created**: 2026-10-04

**Status**: Implemented

**Camada**: Frontend (React + TypeScript + Tailwind + Vite, mobile-first)

**Contraparte**: [backend/008-analise-ia-da-sessao.md](../backend/008-analise-ia-da-sessao.md)

**Input**: No resumo da sessão, o estudante pode pedir uma análise curta, escrita por IA, do que foi bem e do que melhorar. A análise vem de `POST /sessions/{id}/feedback`, não é guardada e some ao sair do resumo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a análise no resumo (Priority: P1)

**Acceptance Scenarios**:

1.  **Given** o resumo da sessão, **When** a tela abre, **Then** aparece o card "Análise da sessão" com o botão "Ver análise" e **nenhuma** chamada à IA é feita.
2.  **Given** o botão, **When** o estudante toca, **Then** aparece um carregando e, em seguida, o texto da API.

### User Story 2 - Falhas (Priority: P1)

1.  **Given** IA indisponível (503), **Then** erro com "Tentar novamente".
2.  **Given** limite diário (429), **Then** a mensagem da API, sem repetir.

## Requirements *(mandatory)*

- **FR-001**: Card `AiFeedbackCard` no `SessionSummaryView`, entre o progresso e os botões.
- **FR-002**: Pedido só sob ação do estudante (economia de IA).
- **FR-003**: Estados: inicial (botão), carregando (`Skeleton`), erro (`ErrorState` com repetir, exceto 429) e sucesso (texto).
- **FR-004**: Texto só em memória; sem emoji; texto anunciado a leitores de tela (`aria-live`).

## Success Criteria *(mandatory)*

- **SC-001**: Testes cobrem pedido sob demanda, sucesso, 503 com repetir e 429 sem repetir.

## Assumptions

- O texto da IA tem até 3 frases simples; renderizado como parágrafo, sem markdown.
