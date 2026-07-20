# Feature Specification (Backend): Medalhas e Conquistas (Badges)

**Feature Branch**: backend/005-medalhas-e-conquistas

**Created**: 2026-07-14

**Status**: Draft

**Camada**: Backend (API RESTful — Spring Boot 4.x, PostgreSQL/Supabase)

**Contraparte**: [frontend/005-medalhas-e-conquistas.md](../frontend/005-medalhas-e-conquistas.md)

**Input**: O backend mantém o catálogo de medalhas, avalia as condições a partir dos eventos das features 002–004, concede medalhas de forma idempotente, registra a data da conquista, acompanha o progresso rumo a medalhas cumulativas e expõe tudo ao cliente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Avaliar condições e conceder medalhas (Priority: P1)

Ao receber eventos de domínio (sessão concluída, XP atingido, ofensiva alcançada), a API avalia as condições do catálogo e concede automaticamente as medalhas correspondentes, sem duplicar concessões.

**Why this priority**: A concessão correta e automática é a essência da feature; sem ela não há reconhecimento de marcos.

**Independent Test**: Emitir eventos que satisfaçam a condição de uma medalha e verificar concessão única; reemitir e confirmar ausência de duplicação.

**Acceptance Scenarios**:

1.  **Given** um estudante sem determinada medalha, **When** um evento satisfaz sua condição, **Then** a API concede a medalha e registra a data/hora.

2.  **Given** uma medalha já concedida, **When** a condição é satisfeita de novo, **Then** a API não concede em duplicidade.

3.  **Given** um evento reprocessado, **When** avaliado, **Then** a concessão permanece única (idempotência).

### User Story 2 - Expor coleção e progresso (Priority: P2)

A API fornece a lista de medalhas do estudante (conquistadas com data e bloqueadas com descrição) e o progresso atual rumo a medalhas de condição cumulativa.

**Why this priority**: Torna as medalhas visíveis e "colecionáveis"; depende da concessão existir.

**Independent Test**: Consultar a coleção e conferir estado/data corretos e o progresso (X de Y) para medalhas cumulativas.

**Acceptance Scenarios**:

1.  **Given** um estudante com medalhas, **When** consulta a coleção, **Then** a API retorna conquistadas (com data) e bloqueadas (com objetivo).

2.  **Given** uma medalha cumulativa não conquistada, **When** consultada, **Then** a API retorna o progresso atual em relação à meta.

### User Story 3 - Catálogo extensível (Priority: P3)

A API permite adicionar novas medalhas ao catálogo sem alterar as existentes, definindo a política de concessão retroativa.

**Why this priority**: Facilita evolução do produto; refinamento.

**Independent Test**: Adicionar uma nova medalha e verificar que estudantes elegíveis a recebem conforme a política definida (retroativa ou a partir da publicação).

**Acceptance Scenarios**:

1.  **Given** uma nova medalha publicada, **When** a política é "a partir da publicação", **Then** apenas eventos futuros a concedem.

2.  **Given** uma nova medalha publicada, **When** a política é "retroativa", **Then** estudantes que já cumpriam a condição a recebem.

### Edge Cases

- Concessão retroativa ao publicar nova medalha: **decidido** — sim, retroativa (ver FR-007).

- Medalhas com níveis (bronze/prata/ouro): **decidido** — não no MVP; cada medalha é única e marcos maiores do mesmo objetivo viram medalhas separadas no catálogo (ex.: "100 questões", "500 questões").

- Eventos concorrentes que satisfazem a mesma condição ao mesmo tempo.

- Reversão de marco (ex.: correção de XP) remove a medalha? (Ver Assumptions.)

- Condição que depende de dado ainda não confirmado por outra feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A API DEVE avaliar as condições de medalha a partir dos eventos das features 002 (sessões), 003 (XP) e 004 (ofensiva).

- **FR-002**: A API DEVE conceder medalhas automaticamente ao satisfazer a condição, registrando data/hora.

- **FR-003**: A API DEVE garantir concessão única por (estudante, medalha), de forma idempotente e segura sob concorrência.

- **FR-004**: A API DEVE expor a coleção do estudante: medalhas conquistadas (com data) e bloqueadas (com objetivo).

- **FR-005**: A API DEVE acompanhar e expor o progresso rumo a medalhas de condição cumulativa (valor atual e meta).

- **FR-006**: A API DEVE suportar um catálogo extensível, permitindo adicionar medalhas sem redefinir as existentes.

- **FR-007**: **Política definida**: ao publicar uma nova medalha a concessão é **retroativa** — um backfill avalia a condição sobre os agregados/histórico já persistidos e concede aos estudantes elegíveis; eventos futuros seguem o fluxo normal.

- **FR-008**: **Conjunto inicial do MVP definido** (5 medalhas): **Primeira Sessão** (concluir a 1ª sessão); **Ofensiva de 7 Dias** (streak ≥ 7); **Centurião** (100 questões corretas — cumulativa, com progresso); **Explorador** (concluir ≥ 1 sessão em cada uma das 4 áreas do ENEM); **Nível 5** (atingir o nível 5 de XP).

- **FR-009**: A API DEVE persistir catálogo, concessões e progresso em PostgreSQL.

- **FR-010**: A API DEVE fornecer, à feature 001, a contagem de medalhas para os agregados de perfil.

### Key Entities & Contratos

- **Medalha (catálogo)**: id, nome, descrição/objetivo, representação visual, condição, nível opcional.

- **Conquista**: estudante, medalha, data/hora (única por par).

- **Progresso de Medalha**: estudante, medalha, valor atual, meta.

- **Endpoints (esboço)**: GET /me/badges (coleção + progresso); consumo interno de eventos das features 002–004.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das condições satisfeitas resultam em concessão automática.

- **SC-002**: 0 concessões duplicadas por (estudante, medalha).

- **SC-003**: A coleção reflete estado e data corretos em 100% das consultas.

- **SC-004**: O progresso de medalhas cumulativas corresponde ao valor real em 100% das consultas.

- **SC-005**: GET /me/badges responde em até 300 ms no p95.

## Assumptions

- As condições são avaliadas a partir de eventos das demais features; a feature não recalcula XP nem ofensiva.

- Medalha conquistada é permanente; reversões são administrativas e fora do fluxo.

- A lista inicial está fixada em FR-008; ajustes finos de condição podem ocorrer no planejamento sem mudar o comportamento observável.

- Medalhas são por conta (globais), consistentes entre dispositivos.
