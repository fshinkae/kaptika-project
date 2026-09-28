# Plano de Implementação: Painel de Desempenho (Backend)

**Spec:** specs/backend/007-painel-de-desempenho.md

**Camada:** Backend

**Data:** 2026-09-27

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Endpoint somente leitura `GET /me/performance?days=7|30|90` que agrega, para o estudante do token, as respostas confirmadas por área (`answers` + `study_sessions`), o XP por dia (`xp_grants`) e os dias de meta cumprida (`activity_days`), dentro de uma janela de dias locais de São Paulo. A recomendação "onde focar" é uma regra determinística e pura, testável em isolamento. Três consultas nativas agrupadas; nenhuma tabela, índice ou migração nova — os índices por perfil das features 002/003/004 já cobrem as consultas.

## Decisões

- **Amostra mínima (FR-005)** → **10 respostas** por área na janela — decidido com o usuário (equivale a duas sessões completas).
- **Janelas (FR-009)** → **7, 30 e 90 dias**; parâmetro ausente → 30; qualquer outro valor → 422 — decidido com o usuário.
- **Pacote** → novo `com.kaptika.api.performance`, com consultas nativas próprias sobre tabelas de 002/003/004 — mesmo precedente da 006 (leitura direta de dados consolidados para agregação em massa, sem passar pelos serviços de escrita).
- **Fuso (FR-008)** → `StreakProperties.zoneId()` (config `kaptika.streak.zone`, America/Sao_Paulo), a mesma fonte que define o "dia" da ofensiva — garante que `activeDay` e as contagens diárias caiam no mesmo dia local. "Hoje" vem do `Clock` injetável já existente (`StreakConfig`), o que permite testar viradas de dia.
- **Janela** → `to` = data local de hoje; `from` = `to − (days − 1)`; filtro em instantes `[from 00:00 local, to+1 00:00 local)`. Mesma janela para as áreas e para a série (totais por área = soma da série).
- **Quais respostas contam (US1 cenário 3)** → toda linha de `answers` do estudante, qualquer que seja o status da sessão (ACTIVE, COMPLETED, EXPIRED): cada linha já é uma resposta confirmada e única por (sessão, questão).
- **Taxa de acerto** → `correct / answered` como número decimal (0–1) no JSON, `null` quando `answered = 0`. Comparações da recomendação usam **frações exatas** (multiplicação cruzada de inteiros), não ponto flutuante, para empates reproduzíveis.
- **Várias áreas não praticadas** → escolhe a primeira na ordem do enum `Area` (determinístico, alinhado ao desempate da FR-006).
- **Consistência entre as três consultas** → transação `readOnly` com isolamento `REPEATABLE_READ`: o Postgres usa um único snapshot, então uma resposta gravada no meio da requisição não aparece numa consulta e falta na outra.
- **Cache** → nenhum. Volume por estudante é pequeno (≤ 5 respostas por sessão) e os índices por perfil existem; cache só se o SC-004 falhar.
- **Migração** → nenhuma. A faixa `V9xx` fica reservada para a 007 caso a medição peça índice (ex.: `answers (session_id, answered_at)`).

## Abordagem técnica

### Backend (Spring Boot + PostgreSQL/Supabase)

- **Endpoint** (autenticado): `GET /me/performance?days=30` → 200 com `{ windowDays, from, to, totals, areas[4], recommendation, daily[windowDays] }`, contrato conforme o esboço da spec. `profileId` via `ProfileIdResolver.resolve(jwt)` — não há parâmetro de perfil (FR-001). `days` inválido → `InvalidRequestDataException` (422).
- **Consultas** (nativas, filtradas por `profile_id` e pela janela):
  1. **Por área**: `answers` ⋈ `study_sessions` → `GROUP BY s.area` com `count(*)` e `count(*) filter (where a.correct)`. Usa `idx_sessions_profile` + `idx_answers_session`.
  2. **Respostas por dia**: mesma junção, `GROUP BY (a.answered_at at time zone :zone)::date`.
  3. **XP por dia**: `xp_grants` → `GROUP BY (granted_at at time zone :zone)::date`, `sum(amount)`. Usa `idx_xp_grants_profile_granted_at`.
  4. **Dias ativos**: `activity_days` com `met = true` e `local_date between :from and :to` (já é data local — sem conversão). Usa a PK `(profile_id, local_date)`.
- **Montagem** (no serviço, em Java):
  - áreas: parte das 4 constantes de `Area` e preenche com o resultado da consulta 1 (a coluna guarda o nome do enum; a resposta expõe `area.slug()`); área ausente → zeros e `accuracy = null`;
  - totais: soma das 4 áreas;
  - série: itera de `from` a `to`, preenchendo com os mapas das consultas 2–4; dia ausente → zeros e `activeDay = false`. Sempre `windowDays` pontos, em ordem crescente.
- **Recomendação** (componente puro, sem Spring nem banco), precedência da FR-004:
  1. nenhuma área com `answered ≥ 10` → `INSUFFICIENT_DATA`, sem área;
  2. existe área com `answered = 0` → `NOT_PRACTICED`, a primeira na ordem do enum;
  3. senão → `LOWEST_ACCURACY` entre as áreas com `answered ≥ 10`: menor fração → menos respostas → ordem do enum.
- **Efeitos colaterais (FR-010)** → nenhum: só `SELECT`s; não chama `StreakService` (que pode reconciliar) nem publica eventos.
- **Erros (FR-011)** → pipeline de segurança existente (401) e handler global (formato `{ código, mensagem, correlationId }`).

### Testes

- **Unitários da recomendação**: amostra insuficiente em todas; área não praticada; menor acerto claro; empate de fração desempatado por menos respostas; empate total desempatado pelo enum; área com < 10 respostas e acerto baixo **não** vence (fica fora do `LOWEST_ACCURACY`).
- **Integração** (`IntegrationTest` + Postgres embarcado + `TestTokens`):
  - contagens por área com respostas em áreas e status de sessão variados; área zerada com `accuracy = null`;
  - série com exatamente 7/30/90 pontos; resposta e concessão de XP às 23h50 de São Paulo contam no dia local (clock fixado);
  - `activeDay` refletindo `activity_days`; dados fora da janela ignorados;
  - estudante novo → 200 com tudo zerado e `INSUFFICIENT_DATA`;
  - `days=15` e `days=abc` → 422; sem token → 401;
  - dois perfis: cada um vê só os próprios números (SC-005).

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001 | `/me/performance`; perfil só do `sub` do JWT via `ProfileIdResolver` |
| FR-002 | Sempre as 4 constantes de `Area`; `accuracy = null` quando `answered = 0` |
| FR-003 | Consulta 1: `answers` ⋈ `study_sessions` por área, filtrada por `answered_at` na janela |
| FR-004 | Componente de recomendação com a precedência INSUFFICIENT_DATA → NOT_PRACTICED → LOWEST_ACCURACY |
| FR-005 | Amostra mínima = 10 respostas por área na janela |
| FR-006 | Frações exatas → menos respostas → ordem do enum `Area` |
| FR-007 | Consultas 2–4 + preenchimento dia a dia em Java (`windowDays` pontos) |
| FR-008 | `StreakProperties.zoneId()` + `Clock` injetável; `at time zone :zone` nas consultas |
| FR-009 | `days ∈ {7, 30, 90}`, padrão 30; outro valor → 422 |
| FR-010 | Somente `SELECT`s em transação `readOnly`; sem chamar serviços com efeitos |
| FR-011 | Segurança e handler de erros existentes |
| FR-012 | Sem assunto/tópico, sem comparação social, sem metas (fora do escopo) |

## Riscos e pontos de atenção

- **Divergência de fuso entre features** (a 003 tem `PERIOD_ZONE` fixo; a 004 lê de config) → a 007 usa a config da 004; se alguém mudar `kaptika.streak.zone`, o XP diário acompanha a ofensiva, que é o que a série mostra lado a lado.
- **`at time zone` impede uso direto do índice na expressão de data** → o filtro de janela é feito em instantes (`answered_at >= :start and answered_at < :end`), que usam o índice; a conversão só aparece no `GROUP BY`.
- **SC-004 (500 ms p95)** → 90 dias de uso intenso ≈ poucos milhares de linhas por estudante; se medir acima, adicionar `answers (session_id, answered_at)` em `V900__`.
- **`INSUFFICIENT_DATA` com janela de 7 dias** → é esperado mais vezes; o frontend precisa de um texto que não soe como erro (tratado na spec do frontend).

## Fora de escopo

- Desempenho por assunto/tópico dentro da área, comparação com outros estudantes, metas personalizadas, recomendação ponderada por recência, cache ou materialização dos agregados.
