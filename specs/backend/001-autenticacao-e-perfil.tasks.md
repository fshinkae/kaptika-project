# Tarefas: Autenticação e Perfil (Backend)

**Spec:** specs/backend/001-autenticacao-e-perfil.md

**Plano:** specs/backend/001-autenticacao-e-perfil.plan.md

**Camada:** Backend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Preparação

- [ ] T001 Gerar projeto Spring Boot 3.5 (Java 21, Maven Wrapper) em `backend/` com web, security, oauth2-resource-server, data-jpa, postgresql, flyway, validation, actuator
- [ ] T002 Configurar `pom.xml`: JaCoCo (relatório + mínimo 80% linha) e Zonky Embedded Postgres para testes em `backend/pom.xml`

## Fase 2 — Fundação (bloqueia o resto)

- [ ] T003 [FR-012] Filtro de correlation id + `ApiError` + `@RestControllerAdvice` em `backend/src/main/java/com/kaptika/api/common/`
- [ ] T004 [FR-004] Migração `V1__create_profiles.sql` (tabela `profiles`, unique `supabase_id`) em `backend/src/main/resources/db/migration/`
- [ ] T005 [US1] [FR-001..003,010] `SecurityConfig` resource server (JWKS configurável, skew 60s, entrypoint 401 padronizado, stateless) em `backend/src/main/java/com/kaptika/api/config/`

## Fase 3 — História US1 (P1) 🎯 Autorizar requisições

- [ ] T006 [US1] [SC-001] Testes de autorização com decoder RSA local: sem token/expirado/adulterado → 401 padronizado; válido → 200 em `backend/src/test/java/com/kaptika/api/security/`

## Fase 4 — História US2 (P1) — Provisionar e servir perfil

- [ ] T007 [US2] [FR-004,009] Entidade `Profile`, repository com upsert `ON CONFLICT`, `ProfileService` e filtro de provisionamento em `backend/src/main/java/com/kaptika/api/profile/`
- [ ] T008 [US2] [FR-005] `GET /me` com agregados via `ProgressSummaryProvider` (impl. zero) em `backend/src/main/java/com/kaptika/api/profile/`
- [ ] T009 [US2] [SC-003] Testes de integração (Zonky): provisionamento único, concorrente sem duplicação, `GET /me` completo em `backend/src/test/java/com/kaptika/api/profile/`

## Fase 5 — História US3 (P2) — Atualizar perfil

- [ ] T010 [US3] [FR-006..008] `PATCH /me` com Bean Validation (nome 2–40, avatar URL ≤ 500) → 200/422 em `backend/src/main/java/com/kaptika/api/profile/`
- [ ] T011 [US3] [SC-006] Testes: PATCH válido persiste; inválido → 422 com regra; posse implícita (A não altera B) em `backend/src/test/java/com/kaptika/api/profile/`

## Fase 6 — Conferência

- [ ] T012 Rodar suíte completa + JaCoCo, conferir SC-001..006, registrar resultado e atualizar Status da spec para Implemented

## Dependências

- Fase 1 → Fase 2 → demais fases.
- T006 depende de T005; T007–T009 dependem de T004/T005; T010–T011 dependem de T007.

## Notas

- Commit por tarefa ou grupo coeso: `tipo(001): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.
