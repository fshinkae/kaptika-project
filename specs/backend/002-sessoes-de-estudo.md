# Feature Specification (Backend): Sessões de Estudo

**Feature Branch**: backend/002-sessoes-de-estudo

**Created**: 2026-07-14

**Status**: Draft

**Camada**: Backend (API RESTful — Spring Boot 3.x, PostgreSQL/Supabase)

**Contraparte**: [frontend/002-sessoes-de-estudo.md](../frontend/002-sessoes-de-estudo.md)

**Input**: O backend orquestra o ciclo de vida da sessão de microlearning: cria a sessão por área, obtém questões da fonte externa **enem.dev**, registra respostas com feedback de acerto/erro, aplica o limite de 20 questões, gera o resumo e emite eventos de domínio que alimentam XP (003), Ofensiva (004) e Medalhas (005).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ciclo de vida da sessão e correção de respostas (Priority: P1)

O cliente inicia uma sessão informando a área; a API monta a sessão com até 20 questões da fonte externa. A cada resposta enviada, a API determina acerto/erro, persiste o resultado e devolve o gabarito. Ao fim, a API fecha a sessão e retorna o resumo (acertos, erros, total).

**Why this priority**: É o núcleo transacional do produto; todas as demais features derivam dos eventos gerados aqui.

**Independent Test**: Criar sessão numa área, enviar respostas e verificar correção correta e resumo consistente; confirmar que o limite de 20 é respeitado.

**Acceptance Scenarios**:

1.  **Given** um estudante autenticado sem sessão ativa, **When** cria uma sessão numa área, **Then** a API retorna a sessão com a primeira questão e alternativas (sem revelar o gabarito antecipadamente).

2.  **Given** uma questão da sessão, **When** o estudante envia a alternativa escolhida, **Then** a API registra a resposta, indica se está correta e informa a alternativa correta.

3.  **Given** a última questão respondida ou pedido de encerramento, **When** a sessão é fechada, **Then** a API retorna o resumo com acertos, erros e total.

4.  **Given** uma sessão, **When** ela é montada, **Then** contém no máximo 20 questões.

### User Story 2 - Idempotência, retomada e integridade (Priority: P1)

A API garante que cada resposta seja contabilizada uma única vez mesmo sob reenvio ou reconexão, e permite retomar uma sessão interrompida a partir da próxima questão não respondida, sem perder o progresso.

**Why this priority**: A confiabilidade dos eventos (que alimentam XP e ofensiva) depende de não haver dupla contagem nem perda. É requisito P1 de integridade.

**Independent Test**: Enviar a mesma resposta duas vezes (mesma chave de idempotência) e verificar contabilização única; interromper e retomar a sessão e conferir estado íntegro.

**Acceptance Scenarios**:

1.  **Given** uma resposta já registrada, **When** o cliente reenvia a mesma resposta (mesma chave de idempotência), **Then** a API não duplica o registro nem os eventos emitidos.

2.  **Given** uma sessão em andamento, **When** o cliente solicita seu estado após reconexão, **Then** a API informa a próxima questão pendente e as respostas já dadas.

3.  **Given** uma resposta já confirmada, **When** o cliente tenta alterá-la, **Then** a API recusa a alteração.

4.  **Given** um estudante com sessão ativa, **When** tenta criar outra, **Then** a API impede ou retorna a sessão ativa existente.

### User Story 3 - Resiliência à fonte externa de questões (Priority: P2)

Quando a enem.dev está indisponível, lenta ou retorna dados inconsistentes, a API responde com erros claros e não corrompe o estado da sessão, aproveitando cache quando possível.

**Why this priority**: A dependência externa é o maior risco operacional do fluxo; tratá-la protege a confiança no produto. Secundária ao fluxo feliz.

**Independent Test**: Simular timeout/erro da enem.dev ao montar a sessão e ao buscar a próxima questão; verificar respostas de erro adequadas e ausência de estado corrompido.

**Acceptance Scenarios**:

1.  **Given** a enem.dev indisponível, **When** o cliente tenta criar uma sessão, **Then** a API responde com erro claro (ex.: 503) e não cria sessão inconsistente.

2.  **Given** questões insuficientes disponíveis, **When** a sessão é montada, **Then** a API a conduz com as questões disponíveis e reflete isso no total.

3.  **Given** uma questão sem gabarito válido vinda da fonte, **When** ela seria incluída, **Then** a API a descarta ou a trata sem conceder crédito indevido.

### Edge Cases

- Regra de não-repetição: **decidido** — a API evita reoferecer questões que o estudante respondeu **corretamente nos últimos 30 dias** (best-effort: se o filtro esgotar o acervo do recorte pedido, questões podem repetir para completar a sessão).

- Como cachear questões da enem.dev respeitando eventuais limites de uso da API externa?

- O que fazer com questões anuladas no exame original?

- Como tratar reenvio de "fechar sessão" (idempotência do fechamento)?

- Como reconciliar uma sessão abandonada há muito tempo (expiração de sessão)?

- Envio de resposta para questão que não pertence à sessão do estudante.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A API DEVE permitir criar uma sessão de um estudante autenticado para uma área de conhecimento do ENEM.

- **FR-002**: A API DEVE limitar cada sessão a no máximo 20 questões.

- **FR-003**: A API DEVE obter questões da fonte externa enem.dev e normalizá-las para um formato interno (enunciado, alternativas, gabarito, área, origem).

- **FR-004**: A API NÃO DEVE expor a alternativa correta antes de o estudante responder a questão.

- **FR-005**: A API DEVE registrar cada resposta (alternativa escolhida, acerto, instante) e retornar o resultado com a alternativa correta.

- **FR-006**: A API DEVE tratar o envio de respostas de forma idempotente, garantindo contabilização única por questão.

- **FR-007**: A API DEVE impedir alteração de respostas já confirmadas.

- **FR-008**: A API DEVE permitir consultar o estado de uma sessão e retomá-la a partir da próxima questão pendente.

- **FR-009**: A API DEVE encerrar a sessão (por limite atingido ou a pedido) e produzir um resumo com acertos, erros e total.

- **FR-010**: A API DEVE emitir eventos de domínio (resposta correta, sessão concluída) consumidos por XP (003), Ofensiva (004) e Medalhas (005), de forma consistente e sem duplicação.

- **FR-011**: A API DEVE garantir no máximo uma sessão ativa por estudante.

- **FR-012**: A API DEVE tratar indisponibilidade/latência da enem.dev com timeouts, tentativas controladas e respostas de erro claras, preservando o estado da sessão.

- **FR-013**: A API DEVE conduzir a sessão com as questões efetivamente disponíveis quando houver menos que o alvo, refletindo no resumo.

- **FR-014**: A API DEVE descartar ou isolar questões sem gabarito válido, sem conceder crédito indevido.

- **FR-015**: A API DEVE persistir sessões, respostas e o vínculo com o estudante em PostgreSQL, mantendo integridade transacional entre resposta e evento emitido.

### Key Entities & Contratos

- **Sessão**: id, estudante, área, alvo de questões (≤20), estado (em andamento, encerrada, concluída), início, término, acertos, erros.

- **Questão (normalizada)**: id de origem (enem.dev), área, enunciado, imagem opcional, alternativas, gabarito (uso interno para correção).

- **Resposta**: sessão, questão, alternativa escolhida, acerto, instante, chave de idempotência.

- **Endpoints (esboço)**: POST /sessions (cria), GET /sessions/{id} (estado), POST /sessions/{id}/answers (envia resposta; idempotente), POST /sessions/{id}/finish (encerra + resumo).

- **Áreas**: Linguagens; Ciências Humanas; Ciências da Natureza; Matemática.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das sessões respeitam o limite de 20 questões.

- **SC-002**: 0 respostas contabilizadas em duplicidade sob reenvio/reconexão.

- **SC-003**: 0 eventos de domínio duplicados emitidos para XP/ofensiva/medalhas.

- **SC-004**: A correção de uma resposta é retornada em até 500 ms no p95 (excluída latência da fonte externa).

- **SC-005**: 100% das falhas da enem.dev resultam em erro claro sem estado corrompido.

- **SC-006**: 0 casos de gabarito exposto antes da resposta (verificável por inspeção das respostas dos endpoints).

## Assumptions

- Fonte de questões: **API pública enem.dev**, consultada por ano/edição e área; a API é considerada autoritativa quanto ao gabarito.

- Respostas de correção não dependem de estado de UI: o cliente exibe o que a API retorna.

- As regras de pontuação (quanto vale um acerto) pertencem à feature 003; aqui só se emite o evento de acerto.

- Cache de questões é permitido para reduzir dependência da enem.dev e respeitar seus limites de uso.

- Um estudante mantém no máximo uma sessão ativa por vez.
