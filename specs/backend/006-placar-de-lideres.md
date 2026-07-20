# Feature Specification (Backend): Placar de Líderes (Leaderboard)

**Feature Branch**: backend/006-placar-de-lideres

**Created**: 2026-07-14

**Status**: Draft

**Camada**: Backend (API RESTful — Spring Boot 4.x, PostgreSQL/Supabase)

**Contraparte**: [frontend/006-placar-de-lideres.md](../frontend/006-placar-de-lideres.md)

**Input**: O backend calcula e serve o ranqueamento por XP. Ordena estudantes, oferece recortes (geral e por período), resolve empates de forma estável, retorna a posição do próprio estudante, pagina grandes volumes e mantém desempenho por meio de índices/cache.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ranquear por XP e retornar a posição do estudante (Priority: P1)

A API retorna uma página do ranking ordenada por XP (desc), com ranque, nome de exibição e XP de cada estudante, além da posição e do XP do estudante autenticado, mesmo que ele esteja fora da página inicial.

**Why this priority**: É o núcleo do recurso competitivo; sem ordenação correta e posição própria, o placar não tem valor.

**Independent Test**: Com dados de XP variados, requisitar o ranking e verificar ordenação e a posição própria corretas.

**Acceptance Scenarios**:

1.  **Given** vários estudantes com XP distinto, **When** o cliente pede o ranking, **Then** a API retorna a lista ordenada por XP desc com ranque, nome e XP.

2.  **Given** um estudante fora do topo, **When** pede o ranking, **Then** a API inclui sua posição e XP à parte, ainda que fora da página.

3.  **Given** dois estudantes com o mesmo XP, **When** ranqueados, **Then** o desempate segue critério estável e reproduzível.

### User Story 2 - Recortes por período com reset (Priority: P2)

A API oferece o recorte geral (XP de todos os tempos) e o recorte por período (ex.: semanal), cuja contagem reinicia a cada novo período sem afetar o total acumulado.

**Why this priority**: Dá chance a iniciantes e sustenta o engajamento; secundário ao ranking geral.

**Independent Test**: Consultar recorte semanal e geral e verificar ordenações distintas conforme XP do período versus acumulado; simular virada de período.

**Acceptance Scenarios**:

1.  **Given** concessões de XP em datas variadas, **When** o cliente pede o recorte semanal, **Then** a API ordena apenas pelo XP do período vigente.

2.  **Given** a virada de um período, **When** o novo período começa, **Then** a contagem do recorte reinicia sem alterar o XP acumulado do recorte geral.

### User Story 3 - Escala, desempenho e integridade competitiva (Priority: P2)

A API pagina grandes volumes de estudantes com desempenho estável e reflete mudanças de XP conforme uma política de atualização definida, resistindo a tentativas de manipulação.

**Why this priority**: Um placar lento ou manipulável destrói a confiança; importante para produção, mas construído sobre o ranking básico.

**Independent Test**: Popular a base com muitos estudantes e medir o tempo da primeira página; verificar paginação consistente e ausência de duplicatas entre páginas.

**Acceptance Scenarios**:

1.  **Given** uma base grande, **When** o cliente pagina o ranking, **Then** as páginas são consistentes, sem repetição nem lacunas.

2.  **Given** mudança de XP de um estudante, **When** ocorre a atualização conforme a política, **Then** o ranking reflete a nova ordem.

### Edge Cases

- Fuso/virada do período semanal: **decidido** — semana de **segunda-feira 00:00, America/Sao_Paulo**, alinhado à feature 004.

- Atualização em tempo real vs. periódica: **decidido** — periódica com cache curto (ver FR-009).

- Estudantes com 0 XP aparecem no ranking?

- Empate: **decidido** — critério definido em FR-006.

- Privacidade: **decidido** — sem opt-out no MVP (ver FR-011).

- Nomes duplicados: desambiguar pelo identificador interno (feature 001).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A API DEVE retornar um ranking de estudantes ordenado por XP decrescente.

- **FR-002**: A API DEVE incluir, para cada item, ranque, nome de exibição e XP.

- **FR-003**: A API DEVE retornar a posição e o XP do estudante autenticado, mesmo fora da página inicial.

- **FR-004**: A API DEVE oferecer os recortes geral (todos os tempos) e por período (ex.: semanal).

- **FR-005**: A API DEVE reiniciar a contagem do recorte por período a cada novo período, sem afetar o XP acumulado do recorte geral.

- **FR-006**: A API DEVE aplicar um critério de desempate estável e reproduzível. **Critério definido**: com XP igual, fica à frente quem **atingiu o total primeiro** (menor data/hora da última concessão de XP que compõe o total do recorte); persistindo o empate, menor **id interno** do perfil.

- **FR-007**: A API DEVE paginar/entregar incrementalmente o ranking com desempenho estável em grandes volumes.

- **FR-008**: A API DEVE consumir o XP consolidado da feature 003 como fonte de ordenação.

- **FR-009**: **Política definida**: atualização **periódica com cache de curta duração (TTL ≤ 60 s)** para as páginas do ranking; a posição do próprio estudante pode ser calculada sob demanda. Tempo real não é requisito do MVP.

- **FR-010**: A API DEVE alinhar o fuso/janela do período à definição da feature 004.

- **FR-011**: **Decidido**: no MVP não há preferência de privacidade — o placar é global e exibe o nome de exibição de todos os estudantes. Opt-out fica como refinamento futuro.

- **FR-012**: **Decidido**: ranking por grupo/liga está **fora do MVP** (refinamento futuro, P3).

### Key Entities & Contratos

- **Item de Ranking**: estudante, nome de exibição, XP considerado (do recorte), ranque.

- **Recorte**: tipo (geral/período), janela de tempo, critério de desempate.

- **Endpoints (esboço)**: GET /leaderboard?scope=global|weekly&page=... (lista + metadados de paginação) e GET /leaderboard/me?scope=... (posição própria), ou posição própria embutida na resposta principal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O ranking está corretamente ordenado por XP em 100% das respostas.

- **SC-002**: A posição do próprio estudante é correta em 100% das consultas.

- **SC-003**: A primeira página responde em até 500 ms no p95, mesmo com base grande.

- **SC-004**: A paginação não repete nem omite estudantes (0 inconsistências entre páginas).

- **SC-005**: O reset de período não altera o XP acumulado do recorte geral (0 divergências).

- **SC-006**: Empates são resolvidos de forma reproduzível (mesma entrada, mesma ordem) em 100% dos casos.

## Assumptions

- A ordenação usa o XP consolidado da feature 003; o placar não recalcula XP.

- Recorte inicial de período é semanal; fuso/janela seguem a feature 004.

- No MVP o placar é global; grupos/ligas e privacidade são refinamentos futuros.

- Estratégias de desempenho (índices, materialização/cache) são decididas no planejamento; a spec fixa o comportamento observável.
