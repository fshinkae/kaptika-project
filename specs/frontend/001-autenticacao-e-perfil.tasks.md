# Tarefas: Autenticação e Perfil (Frontend)

**Spec:** specs/frontend/001-autenticacao-e-perfil.md

**Plano:** specs/frontend/001-autenticacao-e-perfil.plan.md

**Camada:** Frontend

> Gerado na fase /tasks. Checklist executável. `[P]` = paralelizável. `[Ref]` = FR/US relacionado.

## Fase 1 — Preparação

- [x] T001 Scaffold Vite (React+TS) em `frontend/`; Tailwind, React Router, React Query, react-hook-form, zod, @supabase/supabase-js; Vitest + Testing Library + MSW; `.env.example` e scripts
- [x] T002 Configurar Vitest (jsdom, setup), Tailwind e o layout base mobile-first em `frontend/`

## Fase 2 — Fundação (bloqueia o resto)

- [x] T003 [FR-003,005] Cliente Supabase + `AuthContext`/`useAuth` (sessão, signIn/up/out) em `frontend/src/auth/`
- [x] T004 [FR-005,006] `apiClient` (`apiFetch`, `ApiError`): injeta token, refresh 1× em 401, logout em falha em `frontend/src/lib/`
- [x] T005 [FR-010,011] Componentes de UI transversais: `LoadingState`, `ErrorState` (repetir), `EmptyState`, `FormField`, `Button` em `frontend/src/components/`

## Fase 3 — História US1 (P1) 🎯 Cadastro e login

- [x] T006 [US1] [FR-001,002,007] `LoginPage`, `SignupPage`, `RecoverPasswordPage` com validação zod e erro genérico em `frontend/src/pages/`
- [x] T007 [US1] [SC-005] Testes: validação de campos, submit chama Supabase, erro de login genérico em `frontend/src/pages/__tests__/`

## Fase 4 — História US2 (P1) — Rotas protegidas e logout

- [x] T008 [US2] [FR-004] `ProtectedRoute` + roteador da app (rotas públicas/privadas) em `frontend/src/`
- [x] T009 [US2] [SC-002] Testes: rota privada sem sessão → login; logout limpa estado; 401 dispara refresh/redirect em `frontend/src/`

## Fase 5 — História US3 (P2) — Ver e editar perfil

- [x] T010 [US3] [FR-008,009] `ProfilePage`: agregados read-only via `GET /me`; edição de nome/avatar via `PATCH /me` com invalidação em `frontend/src/pages/`
- [x] T011 [US3] [SC-004] Testes (MSW): render dos agregados, edição reflete o novo nome, 422 mostra erro no campo, avatar com fallback em `frontend/src/pages/__tests__/`

## Fase 6 — Conferência

- [x] T012 Rodar `npm test` + `npm run build`, conferir SC-001..006, registrar resultado e atualizar Status da spec

## Dependências

- Fase 1 → Fase 2 → demais fases. T003/T004 bloqueiam T006+; T008 depende de T003.
- T007/T009/T011 dependem das telas/roteador correspondentes.

## Notas

- Commit por tarefa ou grupo coeso: `tipo(f001): <ID> descrição`.
- Ao concluir, marcar `- [ ]` → `- [x]`.

## Resultado da conferência (T012 — 2026-07-20)

`npm test` → **17 testes, 0 falhas** (5 arquivos); `npm run build` (tsc + vite) e `npm run lint` limpos.

| SC | Resultado | Evidência |
|---|---|---|
| SC-001 | ✅* | Fluxo cadastro → home direto; tempo <90s é métrica de QA em dispositivo |
| SC-002 | ✅ | `App.test`: rota privada sem sessão → login; com sessão renderiza |
| SC-003 | ✅ | `AuthContext` restaura sessão via getSession/onAuthStateChange (mock stateful) |
| SC-004 | ✅ | `ProfilePage.test`: editar nome reflete no heading imediatamente |
| SC-005 | ✅ | `LoginPage.test`: erro sempre genérico, sem vazar existência do e-mail |
| SC-006 | ✅* | Layout mobile-first (max-w, alvos ≥44px); verificação visual nos breakpoints em QA |

\* verificado por construção/comportamento; a métrica final é de QA manual em dispositivo.

**Desvios**: React Router **v7** instalado (spec pedia v6) — API usada (Routes/Route/Navigate/Outlet) é idêntica; sem impacto.
