# Plano de Implementação: Autenticação e Perfil (Backend)

**Spec:** specs/backend/001-autenticacao-e-perfil.md

**Camada:** Backend

**Data:** 2026-07-19

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

API Spring Boot 3.5 (Java 21) atuando como **OAuth2 Resource Server**: valida o JWT do Supabase via JWKS, provisiona o perfil interno de forma idempotente no primeiro acesso e expõe `GET /me` / `PATCH /me`. O projeto nasce nesta feature (diretório `backend/`), incluindo fundação transversal reutilizada pelas features 002–006: formato de erro padronizado, correlation id e migrações Flyway.

## Decisões

- **E-mail verificado** → não exigido no MVP — já fixado na spec (Assumptions).
- **Layout do repo** → monorepo com `backend/` na raiz — mantém specs e código juntos, frontend virá em `frontend/`.
- **Build** → Maven + Maven Wrapper (`mvnw`) — funciona em qualquer máquina sem instalação global.
- **Spring Boot 3.5.x / Java 21** → conforme constituição (Spring Boot 3.x); 21 é o LTS instalado.
- **Testes de banco** → Zonky Embedded Postgres (Postgres real, sem Docker — indisponível nesta máquina); fidelidade a `ON CONFLICT`/RLS-friendly SQL que o H2 não garante.
- **Provisionamento + último acesso** → um único upsert `INSERT … ON CONFLICT (supabase_id) DO UPDATE SET last_access_at = now()` — atômico, idempotente sob concorrência (FR-004, FR-009, SC-003).
- **Nome de exibição inicial** → claim `user_metadata.name`/`full_name`; fallback: parte local do e-mail; fallback final: "Estudante".
- **Validação de nome** → 2–40 caracteres após trim; avatar: URL http(s) com até 500 caracteres, opcional.
- **Clock skew (nbf/exp)** → tolerância de 60 s no validador de timestamp (edge case de relógio dessincronizado).
- **Agregados de progresso** → interface `ProgressSummaryProvider` com implementação zero (XP 0, nível 1, streak 0, medalhas 0); features 003–005 fornecerão implementações reais sem mudar o contrato de `GET /me`.
- **RLS** → a API conecta com credencial própria e aplica posse na aplicação (token → `supabase_id`); políticas RLS ficam como defesa em profundidade documentada na migração, não bloqueiam o MVP.

## Abordagem técnica

### Backend (Spring Boot + PostgreSQL/Supabase)

- **Endpoints** (todos exigem `Authorization: Bearer <jwt>`):
  - `GET /me` → 200 com perfil + agregados (FR-005); 401 sem/inválido token (FR-001–003).
  - `PATCH /me` → 200 com perfil atualizado; 422 payload inválido (FR-006); 401 idem.
  - `GET /actuator/health` → público (operação).
- **Modelo de dados** (Flyway `V1__create_profiles.sql`):
  - `profiles`: `id` UUID PK (gen_random_uuid), `supabase_id` UUID **UNIQUE NOT NULL**, `display_name` VARCHAR(40) NOT NULL, `avatar_url` VARCHAR(500) NULL, `created_at` TIMESTAMPTZ NOT NULL DEFAULT now(), `last_access_at` TIMESTAMPTZ NOT NULL DEFAULT now().
  - Índice único em `supabase_id` garante SC-003 no banco, não só na aplicação.
- **Segurança** (FR-001, FR-002, FR-003, FR-010):
  - `spring-boot-starter-oauth2-resource-server`; `NimbusJwtDecoder` com `jwk-set-uri` configurável (`SUPABASE_JWKS_URI`). O cache/refresh de JWKS do Nimbus cobre rotação de chaves sem downtime (FR-010, SC-005).
  - Validadores: timestamp com skew 60 s + defaults. `sub` do token = `supabase_id` do estudante (FR-002).
  - `AuthenticationEntryPoint` custom → 401 no formato de erro padrão, sem detalhes internos (FR-003, SC-006).
  - Stateless, CSRF off, sessão NEVER — cada requisição carrega seu token (Assumption).
- **Regras de negócio**:
  - Filtro pós-autenticação chama o upsert de provisionamento em **toda requisição autenticada** — cria no primeiro acesso, atualiza `last_access_at` nos demais (FR-004, FR-009).
  - Posse: handlers só operam sobre o perfil do `sub` autenticado — não existe rota por id de terceiro (FR-007). Nomes duplicados permitidos; `id` interno desambigua (FR-008).
- **Idempotência/consistência**: upsert com chave única (`supabase_id`); sem transação multi-passo no caminho quente (SC-003).
- **Integrações**: Supabase JWKS (acima). enem.dev não participa desta feature.
- **Erros** (FR-012): corpo `{ "code", "message", "correlationId" }`; filtro de correlação (aceita `X-Correlation-Id` ou gera UUID, propaga no MDC e na resposta). 422 com a regra violada; 500 genérico sem stack.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001 | Resource server JWT com JWKS; toda rota (exceto health) autenticada |
| FR-002 | `sub` do JWT vira o sujeito (`supabase_id`) via `JwtAuthenticationToken` |
| FR-003 | EntryPoint 401 padronizado, sem detalhes internos; token malformado/expirado/assinatura → 401 |
| FR-004 | Upsert idempotente `ON CONFLICT (supabase_id)` no filtro de provisionamento |
| FR-005 | `GET /me` com nome, avatar, XP, nível, ofensiva, medalhas (via `ProgressSummaryProvider`) |
| FR-006 | `PATCH /me` com Bean Validation (nome 2–40, avatar URL ≤500) → 422 |
| FR-007 | Recursos sempre resolvidos pelo `sub` autenticado; sem rota de terceiros |
| FR-008 | Sem unique em `display_name`; `id` interno único desambigua |
| FR-009 | `created_at` default; `last_access_at` atualizado no upsert por requisição |
| FR-010 | Cache/refresh JWKS do NimbusJwtDecoder; URI configurável |
| FR-011 | Posse na aplicação; RLS documentado como defesa em profundidade |
| FR-012 | `ApiError { code, message, correlationId }` + `@RestControllerAdvice` + filtro de correlação |

## Riscos e pontos de atenção

- Rotação JWKS em produção → mitigado pelo cache com refresh do Nimbus; teste com decoder local de chave RSA.
- Ausência de Docker na máquina → Zonky Embedded Postgres nos testes de integração (Postgres real).
- Escrita de `last_access_at` a cada requisição → volume MVP é baixo; se virar gargalo, throttle por minuto (registrado como melhoria futura).
- Usuário removido no Supabase com token ainda válido → token expira em minutos; perfil órfão é inofensivo (edge case aceito no MVP).

## Fora de escopo

- Cadastro, login, logout, recuperação de senha (Supabase Auth no cliente).
- Valores reais de XP/nível/streak/medalhas (features 003–005 plugam no provider).
- Painel administrativo, exclusão de conta e RLS completo por política.
