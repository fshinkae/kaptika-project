# Plano de Implementação: Sessões de Estudo (Frontend)

**Spec:** specs/frontend/002-sessoes-de-estudo.md

**Camada:** Frontend

**Data:** 2026-07-20

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

Fluxo de microlearning no cliente: o estudante escolhe uma das quatro áreas do ENEM, responde uma questão por vez com feedback imediato de acerto/erro (gabarito só após confirmar) e vê o resumo final. Tudo mobile-first e resiliente a falhas. O frontend **reflete** o estado servido pela API (`SessionResponse`, `AnswerResult`, `SessionSummary`) — nunca recalcula correção, total ou progresso. Implementado como uma página de topo autocontida (`SessionFlowPage`) com uma máquina de estados interna (seleção → sessão → resumo), sem tocar em roteamento/nav (o coordenador liga depois).

## Decisões

- **Orquestração por página única vs. rotas** → `SessionFlowPage` com máquina de estados interna — evita editar `App.tsx`/`main.tsx` (proibido) e mantém a feature isolada em `src/features/session/`.
- **Retomada de sessão (US2)** → apoiada na idempotência de `POST /sessions`: repetir a área devolve 200 com a sessão ativa e seu `nextQuestionId`. O cliente **não** persiste estado de sessão (backend é a fonte de verdade, conforme spec). O `sessionId` vive apenas no estado React durante o fluxo.
- **Avançar após responder** → após `POST /answers` (que traz o feedback com `correctAlternative`), refazemos `GET /sessions/{id}` para obter o novo `nextQuestionId`/`answeredCount` — reflete a API em vez de recalcular no cliente.
- **Imagem da questão (FR-002 / US3.3)** → o contrato real (`QuestionView`) expõe `statement`, `context` e `alternatives`, **sem** campo de imagem dedicado. Renderizamos os textos; o cenário de fallback de imagem não se aplica ao contrato atual. Registrado como desvio honesto.
- **Feedback de XP (FR-012)** → a feature 003 (frontend) ainda não existe neste branch. Deixamos ponto de extensão (o `AnswerResult.correct` já dispara o feedback local de acerto); integração de XP fica fora de escopo aqui.
- **Auditoria de conversão (2026-09-13)** → a criação e a consulta da ativa já devolvem a sessão completa; a condução parte desse estado e só chama `GET /sessions/{id}` para avançar (SES-4). Enquanto o `POST /sessions` busca na enem.dev, a tela mostra o esqueleto da questão e explica a espera após 4 s (SES-1). Cada questão abre no topo com foco no enunciado (SES-3). Durante a sessão a navegação inferior some (modo foco, `useFocusMode` no `AppShell`), com "×" para sair sem perder progresso e cronômetro discreto (SES-7). O resumo invalida XP, ofensiva, medalhas, perfil e placar e mostra o progresso lido da API (RES-1; atende parte do FR-012 sem calcular XP no cliente). Rótulos das alternativas dizem qual é a correta e qual foi escolhida (A11Y-3).
- **Encerrar (US2.2)** → botão "Encerrar sessão" com confirmação, chamando `POST /finish` (idempotente) e indo ao resumo parcial.

## Abordagem técnica

### Frontend (React + TS + Tailwind + Vite, mobile-first)

- **Rotas:** nenhuma rota nova criada aqui. Exporto `SessionFlowPage` (default + nomeada) de `src/features/session/`; o coordenador conecta em `App.tsx`/nav. (FR-001)

- **Componentes:**
  - `SessionFlowPage` — orquestrador/máquina de estados (`choosing | active | summary`), dono do `sessionId` e das mutações.
  - `AreaSelect` — grade das 4 áreas + iniciar; trata carregando/erro/503. (FR-001, FR-009)
  - `QuestionCard` — enunciado/contexto + alternativas como radiogroup; exige seleção+confirmação; após confirmar mostra certo/errado e a alternativa correta; bloqueia alteração e reenvio. (FR-002..FR-006, FR-011)
  - `SessionProgress` — indicador N/total refletindo o total real. (FR-005, FR-010)
  - `SessionSummaryView` — acertos/erros/total + nova sessão. (FR-007)

- **Estado:**
  - Vem da API (React Query): `SessionResponse` por `GET /sessions/{id}`; `AnswerResult` da mutação de resposta; `SessionSummary` de `finish`.
  - Local (React): fase do fluxo, `sessionId`, alternativa selecionada e o último feedback exibido. Nada de progresso/correção calculado no cliente.
  - Reconciliação: após responder, invalida/refetch da sessão para o próximo `nextQuestionId`.

- **Chamadas à API** (`sessionApi.ts`, via `apiFetch`):
  - `createSession(area)` → `POST /sessions` (201/200 `SessionResponse`).
  - `getSession(id)` → `GET /sessions/{id}`.
  - `answerQuestion(id, {questionId, alternative})` → `POST /sessions/{id}/answers` (`AnswerResult`).
  - `finishSession(id)` → `POST /sessions/{id}/finish` (`SessionSummary`).

- **Estados de UI:** carregando (spinner acessível), erro com "tentar novamente", 503 com mensagem clara ("fonte de questões indisponível"), sessão concluída/resumo. Reuso de `LoadingState`/`ErrorState`/`EmptyState`/`Button`.

- **Acessibilidade/mobile:** alternativas como `role=radiogroup`/`radio` navegáveis por teclado, `aria-live` para o feedback, alvos ≥44px, largura `max-w-md`, foco visível. (FR-011, SC-006)

- **Idempotência no cliente (FR-006, SC-003):** botão "Confirmar" desabilitado enquanto `isPending` e após o feedback; questão respondida não permite nova seleção. Backend também é idempotente para a mesma alternativa.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:--|:--|
| FR-001 | `AreaSelect` + `createSession` (POST /sessions) |
| FR-002 | `QuestionCard` renderiza `context`/`statement`/`alternatives` |
| FR-003 | Seleção obrigatória + botão Confirmar antes de revelar |
| FR-004 | Feedback usa `AnswerResult.correct` + `correctAlternative` da API |
| FR-005 | `SessionProgress` = posição/`totalQuestions` |
| FR-006 | Botão desabilitado em pending/pós-resposta; sem reseleção |
| FR-007 | `SessionSummaryView` com `correctCount`/`wrongCount`/`totalQuestions` |
| FR-008 | Retomada via POST idempotente (200 devolve `nextQuestionId`) + Encerrar |
| FR-009 | Estados carregando/erro(repetir) e 503 com mensagem clara |
| FR-010 | Total sempre lido de `totalQuestions` da API |
| FR-011 | Radiogroup acessível, alvos de toque, foco, mobile-first |
| FR-012 | Feedback local de acerto; integração de XP fora de escopo (003 ausente) |

## Riscos e pontos de atenção

- **Sem campo de imagem no contrato** → renderizamos texto; cenário US3.3 não aplicável. Mitigação: registrado como desvio; se a API passar a expor imagem, `QuestionCard` recebe o campo.
- **Refetch após responder** pode adicionar latência ao "Próxima" → o feedback já aparece via `AnswerResult` (SC-002); o refetch ocorre ao avançar, com estado de carregando curto.
- **Reenvio concorrente** → cobrimos com desabilitar botão + teste de duplo clique.

## Fora de escopo

- Integração real de XP (feature 003 frontend, ausente neste branch).
- Persistência client-side de sessão / offline.
- Renderização de imagens/markdown das questões (contrato não expõe).
- Ligação de rotas e navegação global (responsabilidade do coordenador).
