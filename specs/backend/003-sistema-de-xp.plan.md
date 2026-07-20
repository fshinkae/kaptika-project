# Plano de Implementação: Sistema de XP e Níveis (Backend)

**Spec:** specs/backend/003-sistema-de-xp.md

**Camada:** Backend

**Data:** 2026-07-19

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Consumidor idempotente dos eventos `CorrectAnswerRecorded` da feature 002: cada acerto vira uma **concessão** de 10 XP (trilha de auditoria) e um **incremento atômico** do saldo do estudante, com dedupe garantido no banco pela chave de idempotência do evento. Nível derivado do XP total pela curva `100 × N`. Exposto em `GET /me/xp` e num serviço de consulta consolidada (total + semana vigente) pronto para o Placar (006).

## Decisões

- **Tabela de dedupe** → a própria `xp_grants` com `UNIQUE (idempotency_key)` faz o papel de `processed_xp_events` — a trilha de auditoria (FR-010) **é** o registro de processamento, eliminando uma tabela e a possibilidade de divergência entre "processado" e "concedido" (SC-002). Inserção via `ON CONFLICT DO NOTHING`: 0 linhas afetadas = evento já processado = não incrementa saldo.
- **Saldo** → `xp_balances (profile_id PK)` mantido por **upsert atômico** (`INSERT ... ON CONFLICT (profile_id) DO UPDATE SET xp_total = xp_total + delta`) na **mesma transação** da concessão — saldo e trilha nunca divergem (SC-001, FR-004) e o incremento no banco é seguro sob concorrência (FR-009), sem lock otimista nem retry na aplicação.
- **Consumo do evento** → `@TransactionalEventListener(phase = AFTER_COMMIT)` em componente próprio do pacote `xp`; o processamento roda em `@Transactional(propagation = REQUIRES_NEW)` (após o commit da 002 não há mais transação utilizável). Falha no processamento não afeta a resposta da 002; a chave determinística permite reprocesso administrativo (risco registrado abaixo).
- **Regra de pontuação** → fixada na spec: **10 XP por acerto**, constante no serviço. A 002 só emite `CorrectAnswerRecorded` para acertos, então FR-002/SC-003 (0 XP para erro) é satisfeito por construção — reforçado por teste de que erro não gera concessão.
- **Curva de níveis** → subir de N para N+1 custa `100 × N` XP ⇒ limiar acumulado do nível N é `50 × N × (N−1)` (nível 2 aos 100, 3 aos 300, 4 aos 600, 5 aos 1000...). Cálculo em utilitário puro (`LevelCurve`) por fórmula fechada + ajuste, coberto por teste de unidade — inclusive salto de múltiplos níveis num único total (FR-005, SC-004).
- **Instante da concessão** → `granted_at` = `answeredAt` do evento (instante do fato gerador), não o do processamento: soma semanal determinística e imune a atraso/reordenação de eventos (FR-009).
- **Período semanal** → segunda-feira 00:00 no fuso **America/Sao_Paulo** (alinhado à 004), calculado sobre `xp_grants` com índice `(profile_id, granted_at)`; total sai de `xp_balances` em O(1) (SC-005).
- **Placar (006)** → serviço público `XpQueryService.consolidatedFor(profileId)` devolvendo total + XP do período; **sem endpoint** nesta feature, conforme escopo.
- **`ProgressSummaryProvider`** → **não** implementado aqui: o contrato agrega streak (004) e medalhas (005); registrar um provider só de XP quebraria a composição futura. Fica para uma feature de integração posterior. `GET /me` segue com o provider zero; `GET /me/xp` é a fonte da 003.
- **Sem teto diário (FR-011)** → nenhuma lógica de teto; se ativado no futuro, entra como verificação antes da inserção da concessão, sem tocar na chave de idempotência.
- **Erros** → nenhum caso novo: `GET /me/xp` não tem corpo de entrada; 401 via cadeia de segurança existente. Nenhuma alteração em `common/`.

## Abordagem técnica

### Backend (Spring Boot + PostgreSQL/Supabase)

- **Endpoints:**
  - `GET /me/xp` (autenticado; perfil resolvido via `ProfileIdResolver`) → 200 `{ xpTotal, level, xpToNextLevel, xpInPeriod }` (FR-006; `xpInPeriod` = semana vigente, útil ao frontend e coerente com FR-007).
- **Modelo de dados** (`V300__create_xp.sql`):
  - `xp_grants`: id uuid PK default, profile_id FK profiles, amount int > 0, source varchar (ex.: `session:<id>:question:<id>`), granted_at timestamptz, idempotency_key varchar **UNIQUE**; índice `(profile_id, granted_at)` para a soma do período.
  - `xp_balances`: profile_id uuid PK/FK profiles, xp_total bigint ≥ 0, updated_at timestamptz.
- **Componentes** (pacote novo `com.kaptika.api.xp`):
  - `XpEventListener` — `@TransactionalEventListener(AFTER_COMMIT)` de `CorrectAnswerRecorded` → delega ao serviço; loga falha sem propagar.
  - `XpService` — caminho de escrita: `REQUIRES_NEW`; insere concessão com `ON CONFLICT DO NOTHING` e, **somente se inseriu**, incrementa o saldo.
  - `XpQueryService` — caminho de leitura: resumo do estudante (`GET /me/xp`) e consulta consolidada p/ placar (total + período).
  - `LevelCurve` — matemática pura de nível/limiar.
  - `XpController` + DTOs record (serialização automática, sem Jackson manual).
- **Idempotência/consistência:** chave única no banco (não em memória); concessão + incremento na mesma transação; incremento relativo (`+= delta`) nunca sobrescreve leituras concorrentes.
- **Integrações:** nenhuma externa; entrada é o evento in-process da 002.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001 | Listener AFTER_COMMIT de `CorrectAnswerRecorded` → concessão de 10 XP |
| FR-002/SC-003 | 002 só emite evento para acerto; teste confirma 0 concessões em erro |
| FR-003/SC-002 | `UNIQUE (idempotency_key)` + `ON CONFLICT DO NOTHING`; saldo só muda quando a concessão entra |
| FR-004/SC-001 | Upsert do saldo na mesma transação da concessão; teste compara saldo × Σ concessões |
| FR-005/SC-004 | `LevelCurve` com limiar `50·N·(N−1)`; unidade cobre saltos múltiplos |
| FR-006 | `GET /me/xp` com total, nível e XP restante |
| FR-007/SC-005 | `XpQueryService.consolidatedFor`: total O(1) em `xp_balances`; período por índice `(profile_id, granted_at)` |
| FR-008 | Nenhum caminho de decremento na API; correções administrativas fora do escopo |
| FR-009 | Incremento atômico no banco + `granted_at` do fato gerador (imune a reordenação) |
| FR-010 | `xp_grants` = trilha (origem, valor, instante, chave única) |
| FR-011 | Sem teto; extensão futura não toca na idempotência |

## Riscos e pontos de atenção

- **Evento perdido se o processamento falhar após o commit da 002** (sem broker/retry no MVP) → falha é logada com a chave determinística; reprocesso administrativo possível reemitindo o evento (dedupe garante segurança). Aceito no MVP, herdado do desenho da 002.
- **AFTER_COMMIT em teste** → evento publicado fora de transação não dispara o listener; testes publicam dentro de `TransactionTemplate` (simulando o commit da 002) e um teste de fio completo usa o fluxo real `POST /sessions` + resposta correta (stub `SessionTestSupport`).
- **Soma semanal cresce com o histórico** → aceitável no MVP (índice cobre); evolução: coluna de agregado semanal ou tabela de fechamento por semana quando o placar (006) exigir ranking global.

## Fora de escopo

- Endpoint de placar/ranking (006) — apenas o serviço de consulta consolidada.
- Implementação de `ProgressSummaryProvider` (integração 003+004+005 no `GET /me`).
- Reversão/ajuste administrativo de XP; teto diário; broker de eventos.
