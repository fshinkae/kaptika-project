# Tarefas: Sessões de Estudo (Frontend)

**Spec:** specs/frontend/002-sessoes-de-estudo.md

**Plano:** specs/frontend/002-sessoes-de-estudo.plan.md

**Camada:** Frontend

> Checklist executável. Trabalho isolado em `frontend/src/features/session/`. Reuso de `apiFetch`/`ApiError`, `AuthContext` e componentes de `src/components/`. Não editar arquivos fora de `src/features/session/`.

## Fase 1 — Preparação

- [x] T001 `npm install` no worktree e baseline verde (build + testes) em `frontend/`

## Fase 2 — Fundação (bloqueia o resto)

- [ ] T002 [FR-001..007] Módulo de API + tipos da sessão (tipos `SessionResponse`, `QuestionView`, `AlternativeView`, `AnswerView`, `AnswerResult`, `SessionSummary`, constante `AREAS`, funções `createSession`/`getSession`/`answerQuestion`/`finishSession`) em `frontend/src/features/session/sessionApi.ts`

## Fase 3 — História US1 (P1) 🎯 MVP

- [ ] T003 [US1] `AreaSelect`: grade das 4 áreas + iniciar, tratando carregando/erro/503 em `frontend/src/features/session/AreaSelect.tsx`
- [ ] T004 [US1] `SessionProgress`: indicador N/total refletindo total real em `frontend/src/features/session/SessionProgress.tsx`
- [ ] T005 [US1] `QuestionCard`: radiogroup acessível, exige seleção+confirmação, feedback certo/errado + alternativa correta, sem reenvio em `frontend/src/features/session/QuestionCard.tsx`
- [ ] T006 [US1] `SessionSummaryView`: acertos/erros/total + nova sessão em `frontend/src/features/session/SessionSummaryView.tsx`
- [ ] T007 [US1] `SessionFlowPage`: máquina de estados (choosing→active→summary), dono do sessionId e das mutações em `frontend/src/features/session/SessionFlowPage.tsx`

## Fase 4 — Histórias US2/US3 (P2)

- [ ] T008 [US2] Botão "Encerrar sessão" com confirmação → `finishSession` → resumo parcial em `SessionFlowPage.tsx`
- [ ] T009 [US2] Retomada via `createSession` idempotente (200 devolve `nextQuestionId`) refletida no fluxo em `SessionFlowPage.tsx`
- [ ] T010 [US3] Estados de carregando/erro(repetir) e 503 com mensagem clara em todo o fluxo

## Fase 5 — Testes e Conferência

- [ ] T011 [US1/US2/US3] Testes de fluxo em `frontend/src/features/session/SessionFlowPage.test.tsx` cobrindo: 1ª questão sem gabarito (SC-006), correção após responder, nunca renderiza `correctAlternative` antes de responder, reenvio idempotente (duplo clique), resumo ao encerrar, 503 com mensagem, carregando/erro
- [ ] T012 Conferir a implementação contra os SC-XXX e registrar o resultado abaixo; `npm test` + `npm run build` + `npm run lint` verdes; Status da spec → Implemented

## Conferência dos Success Criteria

- **SC-001** (1ª questão em ≤3s): fluxo dispara `POST /sessions` e renderiza a questão diretamente da resposta, sem passos extras. UX atende; latência real depende do backend/rede. ✅ (design)
- **SC-002** (feedback ≤1s): o feedback vem síncrono do `AnswerResult` da própria mutação, sem refetch antes de exibir. ✅
- **SC-003** (0 envios duplicados): botão "Confirmar" desabilitado em `isPending` e após a resposta; sem reseleção. Coberto por teste de duplo clique. ✅
- **SC-004** (100% das falhas com mensagem+repetir): `ErrorState`/mensagem de 503 com "Tentar novamente" em criação, carregamento e resposta. Coberto por testes. ✅
- **SC-005** (60% de conclusão em 30d): métrica de produto/acompanhamento; fora do escopo de código. ⏳ (observacional)
- **SC-006** (responsividade/acessibilidade): mobile-first `max-w-md`, radiogroup navegável por teclado, `aria-live` no feedback, foco visível, alvos ≥44px; teste garante que o gabarito não aparece antes de responder. ✅

## Dependências

- Fase 2 bloqueia as histórias. US1 é o MVP; US2/US3 estendem o mesmo `SessionFlowPage`.

## Notas

- Commits: `tipo(f002): <ID> descrição`.
- Gate final: build + lint + testes verdes.
