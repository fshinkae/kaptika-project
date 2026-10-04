# Feature Specification (Backend): Análise de IA da Sessão

**Feature Branch**: backend/008-analise-ia-da-sessao

**Created**: 2026-10-04

**Status**: Implemented

**Camada**: Backend (API RESTful — Spring Boot 4.x, PostgreSQL/Supabase)

**Contraparte**: [frontend/008-analise-ia-da-sessao.md](../frontend/008-analise-ia-da-sessao.md)

**Input**: Ao terminar uma sessão de estudo, o estudante pode pedir uma análise curta, escrita por IA, de como foi a sessão e do que melhorar. A análise é **efêmera** (não é persistida), precisa ser **rápida** e gastar o **mínimo de tokens**. Ela é derivada de dados já existentes: as respostas da sessão (002) e o desempenho por área dos últimos 30 dias (007).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Análise da sessão concluída (Priority: P1)

O estudante pede a análise de uma sessão encerrada e recebe um texto curto (até 3 frases) em português, que comenta o resultado da sessão, compara com o histórico recente e sugere uma ação concreta.

**Why this priority**: É a feature inteira: transformar números do resumo em orientação.

**Independent Test**: Concluir uma sessão, pedir a análise e verificar que o texto vem do provedor de IA com um prompt montado só com dados agregados da sessão e do histórico.

**Acceptance Scenarios**:

1.  **Given** uma sessão encerrada do estudante, **When** ele pede a análise, **Then** a API responde 200 com `{ text }`.
2.  **Given** a mesma sessão pedida de novo em seguida, **When** a análise é pedida, **Then** a API devolve o mesmo texto sem nova chamada ao provedor (cache em memória de curta duração).
3.  **Given** o prompt enviado ao provedor, **When** inspecionado, **Then** contém só área, sequência de acertos/erros, totais e desempenho por área em 30 dias, sem enunciados, nome, e-mail ou ids.

### User Story 2 - Proteção e falhas (Priority: P1)

**Why this priority**: A IA tem custo por chamada e é dependência externa; não pode vazar dados nem derrubar a sessão.

**Acceptance Scenarios**:

1.  **Given** uma sessão de outro estudante ou inexistente, **When** a análise é pedida, **Then** 404 sem revelar existência.
2.  **Given** uma sessão ainda ativa, **When** a análise é pedida, **Then** 409 (`conflict`).
3.  **Given** provedor indisponível, sem chave configurada ou com timeout, **When** a análise é pedida, **Then** 503 `ai_unavailable`, sem detalhes internos.
4.  **Given** um estudante que excedeu o limite diário de análises, **When** pede outra, **Then** 429 `rate_limited`.
5.  **Given** token ausente ou inválido, **Then** 401.

### Edge Cases

- Sessão encerrada sem nenhuma resposta: a análise ainda é gerada (incentiva responder), com o prompt indicando 0 respondidas.
- Falha da IA nunca afeta `/finish` nem XP/ofensiva/medalhas: o endpoint é independente.

## Requirements *(mandatory)*

- **FR-001**: `POST /sessions/{id}/feedback` devolve `{ "text": string }` para sessão encerrada (COMPLETED ou EXPIRED) do estudante autenticado.
- **FR-002**: Posse verificada por (id, perfil do token); sessão alheia ou inexistente → 404.
- **FR-003**: Sessão ACTIVE → 409.
- **FR-004**: O prompt é montado de forma determinística com dados agregados (área, sequência C/E, acertos/respondidas/total, acerto por área nos últimos 30 dias, área recomendada da 007). Nada de enunciado ou dado pessoal.
- **FR-005**: Saída limitada (máx. ~200 tokens), modelo rápido (Claude Haiku 4.5), timeout curto (~10s).
- **FR-006**: Nada é persistido. Cache em memória por sessão (TTL curto) evita cobrar duas vezes em retry/duplo clique.
- **FR-007**: Limite diário de análises por estudante, em memória; excedido → 429 `rate_limited`.
- **FR-008**: Provedor indisponível, sem chave ou timeout → 503 `ai_unavailable`. Chave e prompt nunca aparecem em logs ou respostas.
- **FR-009**: A chamada à IA ocorre fora de transação de banco (pool de conexões pequeno).

### Key Entities & Contratos

```json
POST /sessions/{id}/feedback → 200
{ "text": "Você acertou 3 de 5 em Matemática, ..." }
```

Erros no formato padrão `{ code, message, correlationId }`.

## Success Criteria *(mandatory)*

- **SC-001**: Prompt de entrada com no máximo ~200 tokens e saída limitada a 200 tokens.
- **SC-002**: Resposta típica em poucos segundos; timeout do provedor ≤ 10s.
- **SC-003**: Testes cobrem 200, 404 (alheia), 409 (ativa), 503 (sem chave/falha), 429 (limite) e reaproveitamento do cache sem nova chamada.
- **SC-004**: Nenhuma tabela ou migração nova.

## Assumptions

- Provedor: Anthropic (Claude Haiku 4.5) via SDK oficial Java; chave em `AI_API_KEY` (Secret Manager no Cloud Run).
- RAG descartado: o contexto relevante é pequeno e estruturado; recuperação adicionaria latência e tokens sem ganho.
- Limites em memória valem por instância; aceitável para o volume atual.
