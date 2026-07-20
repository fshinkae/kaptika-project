# Feature Specification (Backend): Ofensiva Diária (Streak)

**Feature Branch**: backend/004-ofensiva-diaria-streak

**Created**: 2026-07-14

**Status**: Implemented

**Camada**: Backend (API RESTful — Spring Boot 4.x, PostgreSQL/Supabase)

**Contraparte**: [frontend/004-ofensiva-diaria-streak.md](../frontend/004-ofensiva-diaria-streak.md)

**Input**: O backend é a autoridade sobre a ofensiva. Ele decide, com base em um fuso horário do servidor (resistente a manipulação do relógio do cliente), se a meta diária foi cumprida, incrementa ou quebra a ofensiva, mantém o recorde e administra congelamentos (freeze).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manter e quebrar a ofensiva com autoridade do servidor (Priority: P1)

Ao receber eventos de estudo (conclusão de sessão/atividade), a API avalia se a meta mínima do dia foi cumprida e incrementa a ofensiva uma vez por dia. Se um dia passar sem meta cumprida, a ofensiva é quebrada. O "dia" é definido pelo fuso do servidor, não pelo dispositivo.

**Why this priority**: A mecânica de hábito só é confiável se o servidor for a fonte de verdade e imune a manipulação de relógio.

**Independent Test**: Emitir eventos em dias consecutivos (relógio controlado do servidor) e verificar incremento único por dia; pular um dia e verificar quebra.

**Acceptance Scenarios**:

1.  **Given** um estudante sem atividade hoje, **When** cumpre a meta mínima do dia, **Then** a ofensiva incrementa em 1.

2.  **Given** meta já cumprida hoje, **When** chegam novos eventos no mesmo dia, **Then** a ofensiva não incrementa novamente.

3.  **Given** uma ofensiva ativa, **When** um dia inteiro passa sem meta cumprida, **Then** a ofensiva é quebrada (zerada), salvo congelamento.

4.  **Given** tentativa de manipular o relógio do cliente, **When** eventos chegam, **Then** a avaliação usa o horário do servidor e não é enganada.

### User Story 2 - Recorde e detecção confiável de quebra (Priority: P1)

A API mantém a maior ofensiva histórica e detecta a quebra de forma consistente, seja no próximo acesso do estudante, seja por verificação temporal, para que o cliente possa comunicar a perda.

**Why this priority**: Sem detecção confiável de quebra e sem recorde, a mecânica perde credibilidade e valor motivacional.

**Independent Test**: Manter ofensiva, deixar expirar, consultar o estado e confirmar quebra + recorde preservado; validar detecção mesmo sem acesso imediato.

**Acceptance Scenarios**:

1.  **Given** uma ofensiva quebrada desde o último acesso, **When** o estado é consultado, **Then** a API reporta a quebra e o momento em que ocorreu.

2.  **Given** uma ofensiva que atinge novo máximo, **When** incrementada, **Then** o recorde é atualizado e nunca diminui.

3.  **Given** estudantes inativos, **When** roda a verificação temporal, **Then** ofensivas expiradas são marcadas como quebradas de forma consistente.

### User Story 3 - Congelamento (freeze) da ofensiva (Priority: P3)

A API preserva a ofensiva de uma quebra consumindo um congelamento disponível, controlando estoque e regras de reabastecimento.

**Why this priority**: Reduz churn após um deslize; refinamento sobre a mecânica básica.

**Independent Test**: Com freeze disponível, pular um dia e verificar preservação e consumo de exatamente um; sem freeze, verificar quebra.

**Acceptance Scenarios**:

1.  **Given** um estudante com freeze disponível, **When** perde um dia, **Then** um freeze é consumido e a ofensiva é preservada.

2.  **Given** sem freeze disponível, **When** perde um dia, **Then** a ofensiva quebra normalmente.

### Edge Cases

- Fuso de referência para a virada do dia: **decidido** — fixo **America/Sao_Paulo** (público-alvo é o ENEM/Brasil), definido em configuração do servidor e compartilhado com o Placar (006).

- Meta mínima diária: **decidido** — **concluir 1 sessão de estudo no dia** (sessão fechada com ao menos 1 questão respondida).

- Estudo atravessando a meia-noite do fuso de referência.

- Eventos atrasados que chegam após a virada do dia — a que dia pertencem?

- Regras de acúmulo e reabastecimento de freeze: **decidido** — ver FR-008.

- Dupla emissão de evento de meta cumprida no mesmo dia (idempotência).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A API DEVE avaliar o cumprimento da meta diária a partir dos eventos de estudo emitidos pela feature 002.

- **FR-002**: A API DEVE definir o "dia" por um fuso horário do servidor, imune a manipulação do relógio do cliente.

- **FR-003**: A API DEVE incrementar a ofensiva no máximo uma vez por dia, no primeiro cumprimento da meta.

- **FR-004**: A API DEVE quebrar (zerar) a ofensiva quando um dia inteiro passar sem meta cumprida, exceto se um congelamento for aplicado.

- **FR-005**: A API DEVE registrar e expor a ofensiva atual e o recorde histórico (que nunca diminui).

- **FR-006**: A API DEVE detectar a quebra de forma consistente tanto sob demanda (consulta/acesso) quanto por verificação temporal periódica.

- **FR-007**: A API DEVE reportar, quando consultada, se a ofensiva foi quebrada desde o último acesso e quando.

- **FR-008**: A API DEVE administrar o estoque de congelamentos por estudante. **Regras (MVP)**: cada estudante começa com **2 freezes**; ganha **1 freeze a cada 7 dias consecutivos** de ofensiva (no incremento múltiplo de 7); estoque máximo de **2**; ao perder um dia, **1 freeze é consumido automaticamente** e a ofensiva é preservada (sem freeze disponível, a ofensiva quebra).

- **FR-009**: A API DEVE tratar eventos de meta de forma idempotente por dia.

- **FR-010**: A API DEVE persistir o estado da ofensiva e os dias de atividade em PostgreSQL, com integridade sob concorrência.

- **FR-011**: A API DEVE expor o estado da ofensiva ao cliente e alinhar o fuso/janela com o recorte de período do Placar (006).

### Key Entities & Contratos

- **Ofensiva**: estudante, valor atual, recorde, data do último dia com meta cumprida, freezes disponíveis.

- **Dia de Atividade**: estudante, data (no fuso do servidor), meta cumprida (sim).

- **Congelamento**: estudante, quantidade, histórico de uso.

- **Endpoints (esboço)**: GET /me/streak (estado atual, recorde, sinal de quebra), consumo interno de eventos da feature 002; job de verificação temporal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A ofensiva incrementa no máximo uma vez por dia em 100% dos casos.

- **SC-002**: 100% das quebras por dia perdido são detectadas (sob demanda ou por job).

- **SC-003**: O recorde nunca diminui e reflete o maior valor já atingido.

- **SC-004**: Manipular o relógio do cliente não infla a ofensiva (0 incrementos indevidos).

- **SC-005**: Com freeze disponível (P3), 100% dos dias perdidos preservam a ofensiva consumindo exatamente um freeze.

- **SC-006**: GET /me/streak responde em até 300 ms no p95.

## Assumptions

- O cumprimento da meta deriva dos eventos da feature 002; a ofensiva não é editada manualmente.

- O fuso de referência (America/Sao_Paulo) e a meta diária (1 sessão concluída) estão fixados nesta spec.

- Freeze é opcional no MVP.

- O fuso/janela é compartilhado com o Placar (006) para coerência.

- Lembretes/notificações são responsabilidade de outra camada e fora do escopo.
