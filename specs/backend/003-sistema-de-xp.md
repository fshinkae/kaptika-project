# Feature Specification (Backend): Sistema de XP e Níveis

**Feature Branch**: backend/003-sistema-de-xp

**Created**: 2026-07-14

**Status**: Implemented

**Camada**: Backend (API RESTful — Spring Boot 4.x, PostgreSQL/Supabase)

**Contraparte**: [frontend/003-sistema-de-xp.md](../frontend/003-sistema-de-xp.md)

**Input**: O backend é a fonte de verdade do XP. Ele consome os eventos de acerto emitidos pelas Sessões (002), aplica a regra de pontuação de forma idempotente, mantém o saldo de XP por estudante, calcula o nível e disponibiliza o total consolidado para o Placar (006).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conceder e consolidar XP de forma confiável (Priority: P1)

Para cada evento de acerto, a API concede o XP correspondente exatamente uma vez e atualiza o saldo total do estudante. Erros não concedem XP.

**Why this priority**: O XP é a recompensa central e a base do placar; sua integridade é inegociável.

**Independent Test**: Emitir eventos de acerto e verificar o saldo; reemitir o mesmo evento (mesma chave) e confirmar que o saldo não muda.

**Acceptance Scenarios**:

1.  **Given** um evento de acerto válido, **When** processado, **Then** o XP da regra é somado ao saldo do estudante e um registro de concessão é criado.

2.  **Given** o mesmo evento de acerto reprocessado (mesma chave de idempotência), **When** processado novamente, **Then** o saldo não é alterado (sem dupla contagem).

3.  **Given** um evento de erro ou questão sem gabarito válido, **When** avaliado, **Then** nenhum XP é concedido.

### User Story 2 - Calcular nível a partir do XP (Priority: P2)

A API determina o nível do estudante a partir do XP total, segundo uma tabela de limiares, e expõe o nível atual e quanto falta para o próximo.

**Why this priority**: Níveis dão progressão de longo prazo; úteis mas não bloqueiam a recompensa imediata do XP.

**Independent Test**: Ajustar o XP para cruzar limiares e verificar o nível calculado e o XP restante para o próximo nível.

**Acceptance Scenarios**:

1.  **Given** um saldo de XP, **When** consultado o nível, **Then** a API retorna o nível correto conforme os limiares e o XP restante para o próximo.

2.  **Given** um único evento que cruze múltiplos limiares, **When** processado, **Then** o nível reflete corretamente o total acumulado.

### User Story 3 - Servir o XP consolidado para o placar (Priority: P2)

A API expõe, de forma eficiente, o XP total por estudante (e o XP por período, quando aplicável) para alimentar o ranqueamento do Placar (006).

**Why this priority**: O placar depende inteiramente deste dado; expô-lo com consistência e desempenho é essencial ao recurso competitivo.

**Independent Test**: Consultar o XP consolidado de um estudante e conferir que bate com a soma das concessões válidas; validar o XP do período (semana) versus o total.

**Acceptance Scenarios**:

1.  **Given** concessões de XP registradas, **When** o placar consulta o total, **Then** o valor é igual à soma das concessões válidas do estudante.

2.  **Given** concessões em datas distintas, **When** consultado o XP do período semanal, **Then** apenas as concessões do período vigente são somadas.

### Edge Cases

- Regra de pontuação: **decidido** — fixa, **10 XP por acerto**, independente de área ou dificuldade (MVP).

- Teto diário de XP: **decidido** — sem teto no MVP (ver FR-011).

- Há reversão de XP em correções administrativas? Como afeta o nível? (Ver Assumptions.)

- Ordem/atraso de eventos: como garantir consistência se eventos chegarem fora de ordem?

- Concorrência: dois eventos do mesmo estudante processados simultaneamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A API DEVE conceder XP para cada evento de acerto recebido da feature 002, segundo uma regra de pontuação definida.

- **FR-002**: A API NÃO DEVE conceder XP para erros ou questões sem gabarito válido.

- **FR-003**: A API DEVE processar concessões de XP de forma idempotente, usando a chave de idempotência do evento de origem (sem dupla contagem).

- **FR-004**: A API DEVE manter um saldo de XP por estudante, sempre igual à soma das concessões válidas.

- **FR-005**: A API DEVE calcular o nível a partir do XP total, conforme uma tabela de limiares configurável. **Curva definida (MVP)**: o nível 1 começa em 0 XP e subir do nível N para o N+1 custa `100 × N` XP (nível 2 aos 100, nível 3 aos 300, nível 4 aos 600, nível 5 aos 1.000, ...).

- **FR-006**: A API DEVE expor o XP total, o nível atual e o XP restante para o próximo nível do estudante autenticado.

- **FR-007**: A API DEVE expor o XP consolidado por estudante (total e por período) para uso do Placar (006).

- **FR-008**: A API DEVE tratar o XP como monotonicamente não decrescente em operação normal. **Decidido**: não há reversão pelo fluxo do produto no MVP; correções administrativas, se necessárias, ocorrem fora da API (diretamente no banco, com trilha de auditoria) e o nível é recalculado a partir do total.

- **FR-009**: A API DEVE garantir consistência do saldo sob concorrência e sob eventos fora de ordem.

- **FR-010**: A API DEVE persistir concessões de XP como trilha de auditoria (origem, valor, instante, chave) em PostgreSQL.

- **FR-011**: **Decidido**: não há teto diário de XP no MVP — o limite de 20 questões por sessão já contém o farming. O teto fica reservado como configuração futura e, se ativado, não pode quebrar a idempotência.

### Key Entities & Contratos

- **Saldo de XP**: estudante, XP total, XP do período corrente, instante da última atualização.

- **Concessão de XP**: id, estudante, origem (sessão/questão), valor, instante, chave de idempotência (única).

- **Tabela de Níveis**: mapeamento de faixas de XP para números de nível.

- **Endpoints (esboço)**: GET /me/xp (total, nível, progresso); consumo interno pelo Placar via serviço/consulta de XP consolidado.

- **Entrada**: eventos de acerto/conclusão da feature 002 (fila/serviço interno).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O saldo de XP é sempre igual à soma das concessões válidas (0 divergências).

- **SC-002**: 0 concessões de XP duplicadas sob reprocessamento de eventos.

- **SC-003**: 0 XP concedido para erros ou questões sem gabarito válido.

- **SC-004**: O nível calculado corresponde ao XP total em 100% das consultas.

- **SC-005**: A consulta de XP consolidado para o placar responde em até 300 ms no p95 sob carga nominal.

## Assumptions

- A única fonte de concessão de XP são os eventos da feature 002.

- Em operação normal o XP só cresce; reversões, se existirem, são administrativas e fora do fluxo do estudante.

- Os números da regra de pontuação (10 XP por acerto) e da curva de níveis (100 × N XP por nível) estão fixados nesta spec; ajustes finos podem ocorrer no planejamento sem mudar o comportamento observável.

- O XP é por conta (global), consistente entre dispositivos.

- O recorte "período" (semana) alinha-se ao fuso definido na feature 004.
