# Plano de Implementação: Sessões de Estudo (Backend)

**Spec:** specs/backend/002-sessoes-de-estudo.md

**Camada:** Backend

**Data:** 2026-07-19

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Ciclo de vida transacional da sessão (criar → responder → encerrar) com questões da enem.dev normalizadas num **cache local em PostgreSQL**, correção server-side sem vazar gabarito, idempotência por chave natural `(sessão, questão)` e **eventos de domínio in-process** (Spring events) publicados na mesma transação — o contrato que alimenta 003/004/005.

## Decisões

- **Eventos de domínio** → registros Java em `com.kaptika.api.events` (`CorrectAnswerRecorded`, `SessionCompleted`), publicados via `ApplicationEventPublisher` **dentro da transação** da escrita (FR-015); consumidores usam `@TransactionalEventListener(AFTER_COMMIT)` + chave de idempotência determinística (`answer:<answerId>`, `session:<sessionId>`) para dedupe (SC-003). Monólito modular — sem broker no MVP.
- **Cache de questões** → tabela `questions` (+ alternativas relacionais, sem JSONB — evita atrito Hibernate/Jackson 3); upsert `ON CONFLICT (source_id) DO NOTHING`. Montagem da sessão lê do cache e só vai à enem.dev quando faltar questão (respeita limites de uso da fonte).
- **Idempotência de resposta** → chave natural única `(session_id, question_id)` no banco; reenvio da mesma alternativa retorna o mesmo resultado (200); alternativa diferente → 409 (FR-006/007). Sem header de idempotência no MVP.
- **Sessão ativa única** → índice único parcial `(profile_id) WHERE status='ACTIVE'` (FR-011). `POST /sessions` com ativa existente **retorna a ativa** (200) — criação idempotente amigável a reconexão.
- **Expiração** → sessão ativa há mais de 24h é marcada `EXPIRED` no próximo `POST /sessions` do estudante (contadores preservados); edge da spec resolvido sem job.
- **Não-repetição (30 dias)** → exclui questões respondidas **corretamente** pelo estudante nos últimos 30 dias; best-effort: se faltar acervo, conduz com o disponível (FR-013).
- **enem.dev** → `RestClient` com timeouts (conexão 2s, leitura 3s) e **1 retentativa**; falha → `QuestionSourceUnavailableException` → **503** com formato de erro padrão; nunca cria sessão inconsistente (FR-012, SC-005). Questão sem gabarito A–E é descartada na normalização (FR-014). Questões anuladas ficam de fora pelo mesmo filtro de validade.
- **Fechamento idempotente** → `finish` de sessão já encerrada retorna o mesmo resumo (200), sem reemitir eventos.
- **Numeração Flyway por feature** → `V2xx__` p/ 002, `V3xx__` 003, `V4xx__` 004, `V5xx__` 005, `V6xx__` 006 — pré-alocada para permitir desenvolvimento paralelo sem colisão (convenção adicionada ao CLAUDE.md).
- **Testes** → fluxo com stub do `QuestionSource` (fixtures determinísticas); cliente enem.dev testado à parte com `MockRestServiceServer` (timeout/500/normalização), sem rede.

## Abordagem técnica

### Backend (Spring Boot + PostgreSQL/Supabase)

- **Endpoints** (autenticados; posse via `sub` → perfil):
  - `POST /sessions` `{area}` → 201 sessão nova (ou 200 com a ativa existente); 422 área inválida; 503 fonte indisponível sem acervo (FR-001, FR-011, FR-012)
  - `GET /sessions/{id}` → estado: questões (sem gabarito), respostas dadas, próxima pendente (FR-008); 404 se não for do estudante
  - `POST /sessions/{id}/answers` `{questionId, alternative}` → resultado {correta?, gabarito, progresso} (FR-005); 200 idempotente; 409 alteração/sessão encerrada (FR-006/007)
  - `POST /sessions/{id}/finish` → resumo {acertos, erros, total} (FR-009); idempotente
- **Modelo de dados** (`V200__create_sessions.sql`):
  - `questions`: id, `source_id` UNIQUE, area, statement, context, correct_alternative CHAR(1), origin_year; `question_alternatives` (question_id, letter, text) — PK composta
  - `study_sessions`: id, profile_id FK, area, status (ACTIVE/COMPLETED/EXPIRED), correct_count, wrong_count, created_at, finished_at; **unique parcial** profile_id WHERE ACTIVE
  - `session_questions`: (session_id, position) PK, question_id, UNIQUE (session_id, question_id)
  - `answers`: id, session_id, question_id, chosen CHAR(1), correct, answered_at; **UNIQUE (session_id, question_id)**
- **Regras de negócio**: montagem escolhe até 20 do cache (excluídos os acertos ≤30d, `ORDER BY random()`); déficit dispara busca na fonte + upsert + re-seleção; correção compara com `correct_alternative`; contadores atualizados na mesma transação da resposta.
- **Integrações**: enem.dev via porta `QuestionSource` (interface) + adaptador `EnemDevClient` — anos recentes sorteados, filtro por disciplina e validade, máx. 3 tentativas de coleta.
- **Erros**: novos mapeamentos — 409 `answer_conflict`/`session_closed`, 503 `question_source_unavailable`; 404 sem vazar existência de sessão alheia.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001/002 | POST /sessions por área; alvo = min(5, acervo) |
| FR-003 | `EnemDevClient` normaliza para `questions` + alternativas |
| FR-004/SC-006 | DTOs de sessão/questão não contêm `correct_alternative`; gabarito só no resultado da resposta |
| FR-005 | POST answers grava e devolve correta/gabarito |
| FR-006/007/SC-002 | UNIQUE (session, question); mesma alternativa → mesmo resultado; diferente → 409 |
| FR-008 | GET /sessions/{id} com respostas dadas + próxima pendente |
| FR-009 | finish idempotente com resumo |
| FR-010/SC-003 | Eventos in-tx com chave determinística; consumidores AFTER_COMMIT |
| FR-011 | Índice único parcial ACTIVE + retorno da ativa no POST |
| FR-012/SC-005 | Timeouts, 1 retry, 503 padronizado, transação nunca meio-criada |
| FR-013 | Sessão conduzida com acervo disponível; total refletido |
| FR-014 | Normalização descarta gabarito inválido |
| FR-015 | Resposta + contadores + evento na mesma transação |

## Riscos e pontos de atenção

- Formato/limites da enem.dev podem divergir do assumido → porta `QuestionSource` isola; adaptador coberto por contrato com `MockRestServiceServer`; smoke test manual contra a API real documentado no README.
- `ORDER BY random()` degrada com acervo grande → aceitável no MVP; troca por amostragem indexada registrada como evolução.
- Eventos in-process se perdem se um consumidor falhar após commit → consumidores (003–005) devem ser idempotentes e reconciliáveis; chaves determinísticas viabilizam reprocesso.

## Fora de escopo

- Pontuação de XP (003), ofensiva (004), medalhas (005) — apenas os eventos são emitidos.
- Broker externo (Kafka/Rabbit), pré-aquecimento agendado do cache de questões, painel de curadoria de questões.
