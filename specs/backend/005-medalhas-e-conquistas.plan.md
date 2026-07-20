# Plano de Implementação: Medalhas e Conquistas (Backend)

**Spec:** specs/backend/005-medalhas-e-conquistas.md

**Camada:** Backend

**Data:** 2026-07-19

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Consumidor idempotente dos eventos de domínio da 002 (`CorrectAnswerRecorded`, `SessionCompleted`) que mantém **contadores acumulados próprios** por estudante e, a cada evento, avalia o catálogo fixo de 5 medalhas e concede as satisfeitas — com unicidade por `(perfil, medalha)` garantida no banco. `GET /me/badges` expõe a coleção completa (conquistadas com data; bloqueadas com objetivo e progresso X/Y) e um **backfill retroativo** reavalia os contadores ao publicar medalha nova (FR-007).

## Decisões

- **Isolamento de features paralelas** → a 005 **não** lê tabelas das features 003 (XP) e 004 (streak), em desenvolvimento paralelo. As condições de XP/nível e ofensiva são derivadas de **contadores próprios** alimentados só pelos eventos da 002: `xp_total` (+10 por `CorrectAnswerRecorded`, curva de nível 100×N ⇒ nível 5 = 1000 XP acumulado) e streak (dias distintos consecutivos com sessão concluída). Se 003/004 divergirem no futuro, a reconciliação é possível pelo histórico da 002 — registrado como risco.
- **Consumo AFTER_COMMIT + REQUIRES_NEW** → `@TransactionalEventListener(phase = AFTER_COMMIT)` com `@Transactional(propagation = REQUIRES_NEW)` no próprio método ouvinte (padrão documentado do Spring): o processamento roda em transação nova, fora da transação de origem já confirmada. Falha no consumidor não afeta a 002.
- **Dedupe de eventos** → tabela `processed_badge_events` com a `idempotencyKey` determinística do evento como **chave primária**; inserção é o primeiro passo do processamento — violação de unicidade ⇒ evento já processado ⇒ no-op (SC-002 para contadores E concessões).
- **Serialização por perfil** → a linha de `badge_counters` do estudante é criada com `INSERT … ON CONFLICT DO NOTHING` e então travada com `SELECT … FOR UPDATE` (lock pessimista). Eventos concorrentes do mesmo perfil são serializados: sem lost update nos contadores e sem corrida na avaliação.
- **Concessão à prova de corrida** → dupla defesa: avaliação sob o lock por perfil + `INSERT … ON CONFLICT DO NOTHING` na `badge_awards` com `UNIQUE (profile_id, badge_id)` (FR-003/SC-002). O `ON CONFLICT DO NOTHING` evita marcar a transação como rollback-only.
- **Catálogo dirigido a dados** → cada medalha do catálogo carrega `condition_type` + `threshold`; o avaliador é genérico (compara o valor do contador correspondente com a meta). Adicionar medalha = inserir linha no catálogo (FR-006) — sem código novo enquanto o tipo de condição já existir.
- **Tipos de condição do MVP** → `SESSIONS_COMPLETED` (first-session, meta 1), `STREAK_DAYS` (streak-7, meta 7 — usa o **melhor streak histórico**, pois medalha é permanente), `CORRECT_ANSWERS` (correct-100, meta 100), `AREAS_EXPLORED` (explorer, meta 4 — bitmask das 4 áreas com sessão concluída), `XP_TOTAL` (level-5, meta 1000).
- **Streak próprio (fuso America/Sao_Paulo)** → dia = `completedAt` convertido para `America/Sao_Paulo` (regra explícita da feature; refina o invariante "fuso do servidor" com fuso fixo e determinístico). Mesmo dia ⇒ inalterado; dia seguinte ⇒ +1; lacuna ⇒ recomeça em 1; evento fora de ordem (dia anterior ao último) ⇒ ignorado, não regride. `streak_best = max(streak_best, streak_current)`.
- **Bitmask de áreas** → `areas_mask` int com 1 bit por área (LINGUAGENS=1, CIENCIAS_HUMANAS=2, CIENCIAS_NATUREZA=4, MATEMATICA=8), mapeada do campo `area` (String) do evento **dentro do pacote badges** — sem acoplamento ao enum da 002; área desconhecida é ignorada com log.
- **Backfill retroativo (FR-007)** → `BadgeBackfillService.backfill(slug)`: percorre os perfis com contadores, trava cada linha e concede se elegível (mesmo avaliador genérico + `ON CONFLICT DO NOTHING`). Testado com medalha fictícia inserida em teste. Disparo administrativo (chamada de serviço); sem endpoint público no MVP.
- **FR-010 sem tocar a 001** → `BadgeService.countFor(profileId)` público no pacote `badges`; o provider de progresso da 001 (`ZeroProgressProvider`) **não** é alterado — a ligação acontece quando a 001 evoluir seu provider real.
- **Progresso no GET** → toda medalha bloqueada retorna `progress {current, target}` com `current` truncado na meta; conquistadas retornam `awardedAt` e `progress` completo (target/target). Cobre FR-005 e dá objetivo às não-cumulativas de graça.

## Abordagem técnica

### Backend (Spring Boot + PostgreSQL/Supabase)

- **Endpoints:**
  - `GET /me/badges` (autenticado; perfil via `ProfileIdResolver`) → 200 `{ badges: [ { slug, name, description, achieved, awardedAt?, progress {current, target} } ], achievedCount, totalCount }`, ordenado por `sort_order` (FR-004/005). Sem parâmetros; leitura pura (SC-005: 2 consultas indexadas + catálogo pequeno).
  - Consumo interno de `CorrectAnswerRecorded` e `SessionCompleted` (FR-001/002) — sem endpoint.
- **Modelo de dados** (`V500__create_badges.sql`, faixa da 005):
  - `badges` (catálogo, seed na própria migração): id, `slug` UNIQUE, name, description, `condition_type`, `threshold`, `sort_order`, created_at; CHECK no condition_type.
  - `badge_awards`: id, profile_id FK, badge_id FK, awarded_at; **UNIQUE (profile_id, badge_id)** (FR-003).
  - `badge_counters` (1 linha por perfil): profile_id PK/FK, `correct_total`, `sessions_completed`, `xp_total`, `areas_mask`, `streak_current`, `streak_best`, `last_session_date` (`date`), updated_at.
  - `processed_badge_events`: `idempotency_key` varchar PK, processed_at.
- **Regras de negócio:** `CorrectAnswerRecorded` ⇒ `correct_total+1`, `xp_total+10`; `SessionCompleted` ⇒ `sessions_completed+1`, bit da área no `areas_mask`, atualização do streak pelo dia local de São Paulo. Após atualizar, avaliar todo o catálogo contra os contadores e conceder as satisfeitas ainda não concedidas.
- **Idempotência/consistência:** PK em `processed_badge_events` (dedupe), lock pessimista por perfil (serialização), UNIQUE + `ON CONFLICT DO NOTHING` em `badge_awards` (concessão única). Tudo numa única transação REQUIRES_NEW por evento.
- **Integrações:** nenhuma externa; só eventos in-process da 002.
- **Erros:** `GET /me/badges` não introduz erro novo — 401 pela cadeia de segurança padrão; formato de erro global inalterado (pacote `common` não é tocado).

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001 | Ouvintes AFTER_COMMIT dos eventos da 002; condições de XP/streak derivadas de contadores próprios (isolamento das 003/004) |
| FR-002 | Avaliação do catálogo a cada evento; `awarded_at` gravado na concessão |
| FR-003/SC-002 | PK de dedupe + lock por perfil + UNIQUE (profile, badge) com ON CONFLICT DO NOTHING |
| FR-004/SC-003 | GET /me/badges com conquistadas (data) e bloqueadas (objetivo) |
| FR-005/SC-004 | `progress {current, target}` calculado dos contadores na leitura — sempre o valor real |
| FR-006 | Catálogo dirigido a dados (condition_type + threshold); inserir linha basta |
| FR-007 | `BadgeBackfillService.backfill(slug)` reavalia contadores existentes; testado com medalha fictícia |
| FR-008 | Seed das 5 medalhas na V500 com slugs estáveis (first-session, streak-7, correct-100, explorer, level-5) |
| FR-009 | 4 tabelas PostgreSQL na faixa V5xx |
| FR-010 | `BadgeService.countFor(profileId)` público, pronto para a 001 consumir |
| SC-001 | Avaliação em todo evento processado + testes por medalha |
| SC-005 | Leitura com 2 consultas indexadas (awards por perfil + counters por PK) |

## Riscos e pontos de atenção

- **Divergência com 003/004** → XP/streak da 005 são derivações próprias dos eventos da 002; se as features paralelas adotarem regras diferentes (ex.: XP bônus), os valores podem divergir. Mitigação: mesmas fontes de evento e regras documentadas aqui; reconciliação futura via backfill (as chaves determinísticas permitem reprocesso).
- **Perda de evento in-process** (consumidor falha após commit da 002) → contadores podem ficar defasados. Mitigação: idempotência total + backfill genérico permitem reprocessar/reconciliar; risco aceito no MVP (mesma postura da 002).
- **Lock por perfil sob alta concorrência** → serializa eventos do mesmo estudante; volume individual é baixo (uma resposta por vez), sem impacto prático.
- **Fora de ordem no streak** → evento com dia anterior ao último não regride o streak (decisão conservadora; permanência da medalha é garantida de toda forma).

## Fora de escopo

- Ligação do `countFor` ao `GET /me` da 001 (o provider atual permanece; FR-010 entrega apenas o serviço).
- Endpoint administrativo de publicação de medalhas/backfill; agendamento de reconciliação.
- Medalhas com níveis (bronze/prata/ouro) e remoção administrativa de concessões (Assumptions da spec).
- Representação visual (ícones) além de um identificador `slug` estável para o frontend mapear.
