# Plano de Implementação: Ofensiva Diária / Streak (Backend)

**Spec:** specs/backend/004-ofensiva-diaria-streak.md

**Camada:** Backend

**Data:** 2026-07-19

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Consumidor idempotente do evento `SessionCompleted` (feature 002) que mantém, por estudante, a ofensiva atual, o recorde, os dias de atividade e o estoque de freezes — tudo em PostgreSQL, com o "dia" derivado exclusivamente do relógio do servidor num fuso configurável (default **America/Sao_Paulo**). A quebra é detectada de duas formas equivalentes (FR-006): **lazy** no `GET /me/streak` e por **job diário** de reconciliação; ambas delegam ao mesmo serviço.

## Decisões

- **Fuso do dia** → `ZoneId` via propriedade `kaptika.streak.zone` (default `America/Sao_Paulo`); o dia é `LocalDate` do **Clock do servidor** convertido para esse fuso — nunca do cliente (FR-002/SC-004). `Clock` é um bean injetável (substituído nos testes por um clock mutável) para simular virada de dia sem sleep.
- **Dia do evento** → evento é atribuído ao **dia local do processamento** (Clock do servidor no momento em que o listener roda), não ao `completedAt` do payload. Resolve o edge "evento atrasado após a virada": pertence ao dia em que chegou; o cliente não consegue enganar porque ambos os relógios são do servidor.
- **Meta diária** → 1 sessão concluída no dia (fixado na spec); cada `SessionCompleted` é um cumprimento em potencial.
- **Dedupe do evento (FR-009)** → **tabela própria** `streak_event_dedupe` com PK = `idempotencyKey` do evento (`session:<id>`): reprocessamento é curto-circuitado antes de qualquer lógica. A PK composta de `activity_days (profile_id, local_date)` é a **segunda linha de defesa** e a chave natural do "1 incremento por dia" (SC-001) — dois eventos distintos no mesmo dia colidem nela. Escolhi tabela própria (e não só a constraint de `activity_days`) para o dedupe do evento ficar explícito e barato de auditar.
- **Consumo do evento** → `@TransactionalEventListener(phase = AFTER_COMMIT)` em bean dedicado, que delega ao serviço com `@Transactional(propagation = REQUIRES_NEW)` (bean separado para a anotação transacional valer via proxy). Falha no consumidor não afeta a sessão já commitada; o dedupe determinístico permite reprocesso.
- **Freeze (FR-008)** → começa com 2; +1 no incremento múltiplo de 7 (`current % 7 == 0`), teto 2; ao detectar N dias perdidos, consome 1 freeze **por dia perdido** enquanto houver estoque — cada consumo "cobre" um dia (avança `last_met_date`), preservando a ofensiva sem incrementá-la. Se o estoque não cobre todos os dias perdidos, a ofensiva **quebra (zera)** e os freezes **não são consumidos** (consumo parcial seria desperdício sem benefício; estoque sobrevive à quebra — a spec não manda zerar).
- **Quebra e "desde o último acesso" (FR-007)** → colunas `broken_at timestamptz` + `break_acknowledged boolean` na tabela `streaks`. Quebra (lazy ou job) grava `broken_at` e `break_acknowledged = false`; o `GET /me/streak` reporta `brokenSinceLastAccess = true` + `brokenAt` uma vez e marca como reconhecida ("último acesso" = último GET do estado da ofensiva). Recorde nunca é alterado na quebra (FR-005/SC-003).
- **Nomes de coluna** → `current_streak`/`record_streak` em vez de `current`/`record` (evita atrito com palavras próximas de reservadas no SQL e nomes crípticos); o contrato JSON continua `current`/`record`.
- **Concorrência (FR-010)** → linha de `streaks` carregada com lock pessimista (`SELECT ... FOR UPDATE`) na transação do consumidor; PKs de `activity_days` e `streak_event_dedupe` garantem unicidade sob corrida.
- **Job de reconciliação (FR-006)** → `@Scheduled` diário (cron `0 10 0 * * *` no fuso da ofensiva, configurável) que chama `StreakReconciliationService.reconcileAll()` — varre ofensivas ativas com `last_met_date < ontem` e aplica exatamente a mesma regra de freeze/quebra do caminho lazy. Testes chamam o serviço direto (sem esperar o cron). `@EnableScheduling` declarado na configuração do próprio pacote `streak` (pacote `config/` intocado).
- **Sem pacotes alheios** → nada em `profile/`, `session/`, `config/`, `common/` é modificado; o controller usa `ProfileIdResolver` existente e o handler global já cobre os erros (a feature não introduz erro de domínio novo — GET sem estado prévio devolve o estado inicial, não 404).

## Abordagem técnica

### Backend (Spring Boot + PostgreSQL/Supabase)

- **Endpoints:**
  - `GET /me/streak` (autenticado) → 200 `{ current, record, freezes, metToday, brokenSinceLastAccess, brokenAt }` (FR-005/007/011). Antes de responder, roda a reconciliação lazy do próprio estudante (FR-006). Estudante sem linha ainda → estado inicial `{0, 0, 2, false, false, null}` sem criar linha (leitura não escreve).
  - Consumo interno: listener de `SessionCompleted` (FR-001).
  - Job diário de verificação temporal (FR-006).

- **Modelo de dados** (`V400__create_streaks.sql`):
  - `streaks`: `profile_id` uuid PK/FK→profiles, `current_streak` int, `record_streak` int, `last_met_date` date, `freezes` int, `broken_at` timestamptz, `break_acknowledged` boolean, `updated_at` timestamptz.
  - `activity_days`: `profile_id` uuid FK, `local_date` date, `met` boolean — PK composta `(profile_id, local_date)`.
  - `streak_event_dedupe`: `idempotency_key` varchar PK, `profile_id`, `processed_at`.

- **Regras de negócio** (serviço único, dois pontos de entrada):
  1. *Registrar cumprimento* (evento): dedupe pela chave do evento → grava `activity_days` do dia local (conflito = meta já cumprida hoje, retorna) → carrega/cria `streaks` com lock → reconcilia dias perdidos (freeze/quebra) → incrementa `current`, atualiza `record = max`, `last_met_date = hoje`, freeze bônus nos múltiplos de 7.
  2. *Reconciliar* (GET e job): se `current > 0` e `hoje - last_met_date > 1`, consome freezes por dia perdido enquanto houver (avançando `last_met_date`); faltando freeze, zera `current` e registra a quebra.

- **Idempotência/consistência:** PK de dedupe por evento + PK `(profile_id, local_date)` + lock pessimista na linha da ofensiva + transação `REQUIRES_NEW` no consumidor.

- **Integrações:** nenhuma nova (evento in-process da 002; JWT já validado pela cadeia existente).

- **Erros:** formato padrão já coberto pelo `GlobalExceptionHandler`; endpoint não introduz novos códigos.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001 | Listener AFTER_COMMIT de `SessionCompleted` |
| FR-002/SC-004 | Dia = `LocalDate` do Clock do servidor no fuso `kaptika.streak.zone`; payload do cliente nunca entra no cálculo |
| FR-003/SC-001 | PK `(profile_id, local_date)` em `activity_days`: primeiro cumprimento incrementa, demais são no-op |
| FR-004 | Reconciliação zera `current` quando faltam freezes para cobrir os dias perdidos |
| FR-005/SC-003 | `record_streak = max(record, current)` no incremento; nunca reduzido em quebra |
| FR-006/SC-002 | Mesma reconciliação chamada pelo `GET /me/streak` (lazy) e pelo job `@Scheduled` diário |
| FR-007 | `broken_at` + `break_acknowledged`; GET reporta uma vez e reconhece |
| FR-008 | Estoque inicial 2, +1 por múltiplo de 7, teto 2, consumo automático 1/dia perdido |
| FR-009 | Tabela `streak_event_dedupe` (chave do evento) + PK diária de `activity_days` |
| FR-010 | Migração `V400`, FKs para `profiles`, lock pessimista, transação própria |
| FR-011 | `GET /me/streak` com contrato completo; fuso compartilhável com 006 via propriedade |

## Riscos e pontos de atenção

- Evento in-process se perde se o processo cair entre o commit da sessão e o consumo → a reconciliação (lazy + job) converge o estado e o dedupe determinístico permite reprocesso manual; aceito no MVP (mesmo trade-off registrado na 002).
- Job varrendo a tabela inteira degrada com muitos estudantes → filtro `current_streak > 0 and last_met_date < :ontem` com índice implícito na PK; volume do MVP não exige particionamento.
- Semântica de "último acesso" ancorada no GET do streak (não em qualquer request) → registrado como decisão; se o produto quiser outra âncora, muda-se só o ponto de acknowledgement.

## Fora de escopo

- Compra/concessão manual de freezes, histórico navegável de uso de freeze (a spec só exige estoque).
- Notificações/lembretes de ofensiva em risco.
- Exposição de calendário de atividade (frontend 004 consome só o estado agregado).
