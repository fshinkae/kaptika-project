# Plano de Implementação: Placar de Líderes (Backend)

**Spec:** specs/backend/006-placar-de-lideres.md

**Camada:** Backend

**Data:** 2026-07-19

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Ranking por XP sobre os dados consolidados da feature 003 (`xp_balances` para o recorte geral; agregação de `xp_grants` para o semanal), com `ROW_NUMBER()` no banco, desempate determinístico, paginação estável, posição própria embutida na resposta e **cache in-memory com TTL de 60 s** (política de atualização periódica fixada na spec). Sem tabelas novas — apenas um índice de apoio.

## Decisões

- **Fonte de dados** → leitura direta de `profiles` + `xp_balances`/`xp_grants` (003). O placar **não recalcula XP** (Assumption da spec); consultas nativas de ranking ficam na própria 006 (o `XpQueryService.consolidatedFor` serve consultas pontuais, não ranking em massa).
- **Desempate (FR-006, fixado na spec)** → `xp DESC, atingiu_primeiro ASC, id ASC`:
  - geral: `xp_balances.updated_at` (instante da última concessão que compõe o total);
  - semanal: `MAX(granted_at)` dentro do período;
  - `id` interno como último critério — total e reproduzível (SC-006).
- **Estudantes com 0 XP** → **aparecem** no ranking (LEFT JOIN de `profiles`), ordenados ao fim pelo desempate — assim a posição própria sempre existe, mesmo para quem nunca pontuou (edge da spec resolvido).
- **Cache (FR-009, fixado na spec)** → Caffeine via Spring Cache, TTL 60 s, chave (escopo, página, tamanho); a **posição própria é sempre calculada na hora** (fora do cache) para o estudante nunca ver a si mesmo defasado. TTL configurável (`kaptika.leaderboard.cache-ttl`; testes usam TTL 0).
- **Paginação** → `LIMIT/OFFSET` com ordenação total (estável entre páginas — SC-004); página máx. 100 itens.
- **Semana** → reutiliza `XpQueryService.currentPeriodStart()` (segunda 00:00 America/Sao_Paulo — FR-010, alinhado à 004).
- **Privacidade/ligas** → fora do MVP (FR-011/FR-012 já fixados na spec); nomes repetidos desambiguados pelo `profileId` presente em cada item (FR da contraparte frontend).
- **Migração** → faixa V6xx: apenas `V600__leaderboard_indexes.sql` (índice `xp_grants (granted_at, profile_id)` para o agregado semanal).

## Abordagem técnica

### Backend (Spring Boot + PostgreSQL/Supabase)

- **Endpoints** (autenticados):
  - `GET /leaderboard?scope=global|weekly&page=0&size=20` → `{ scope, periodStart?, page, size, totalStudents, entries: [{rank, profileId, displayName, xp}], me: {rank, xp} }` (FR-001..005; posição própria embutida — FR-003); `scope` inválido → 422.
- **Consultas** (nativas):
  - geral: `profiles LEFT JOIN xp_balances` + `ROW_NUMBER() OVER (ORDER BY xp DESC, updated_at ASC NULLS LAST, id ASC)`;
  - semanal: CTE somando `xp_grants` com `granted_at >= :periodStart` por perfil, LEFT JOIN em `profiles`, mesma janela de ordenação com `MAX(granted_at)`;
  - posição própria: mesma expressão de ordenação, `COUNT(*) de quem está à frente + 1` — O(n) indexado, sem paginar.
- **Cache**: `@Cacheable("leaderboard-page")` no serviço de página; `CaffeineCacheManager` com TTL da propriedade. Posição própria sem cache.
- **Erros**: reusa formato padrão; `scope`/`page`/`size` inválidos → 422 (`InvalidRequestDataException`).

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001/002 | Ranking XP desc com rank, nome, XP (e profileId p/ desambiguar) |
| FR-003 | Bloco `me` calculado na hora em toda resposta |
| FR-004/005 | `scope=global` (xp_balances) e `weekly` (grants ≥ segunda 00:00); reset por recorte de período sem tocar no acumulado |
| FR-006/SC-006 | Ordenação total: xp DESC, atingiu-primeiro ASC, id ASC |
| FR-007/SC-004 | LIMIT/OFFSET sobre ordenação total; página ≤100 |
| FR-008 | Fonte = dados consolidados da 003; zero recálculo |
| FR-009 | Cache TTL 60 s (Caffeine); posição própria sempre fresca |
| FR-010 | `currentPeriodStart()` da 003 (segunda 00:00 America/Sao_Paulo) |
| FR-011/012 | Sem opt-out e sem ligas no MVP (fixado na spec) |

## Riscos e pontos de atenção

- OFFSET profundo degrada com base muito grande → aceitável no MVP; keyset pagination anotada como evolução.
- Agregado semanal é O(grants da semana) → índice `(granted_at, profile_id)`; se crescer, materialização periódica é a evolução natural (a política de 60 s já dá a janela).
- Ranking geral percorre todos os perfis → com cache de 60 s, custo amortizado; SC-003 (500 ms p95 primeira página) medido funcionalmente nos testes, métrica real em staging.

## Fora de escopo

- Ligas/grupos, opt-out de privacidade, keyset pagination, materialização do ranking.
