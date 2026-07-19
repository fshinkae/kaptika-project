# CLAUDE.md — Constituição do Kaptika

> Este arquivo é lido automaticamente pelo Claude Code em toda sessão. Ele define a **stack**, os **invariantes** (regras que valem para todas as features) e o **fluxo de trabalho** (SDD). As specs em `specs/` descrevem o **"o quê"**; este arquivo e os `.plan.md` descrevem o **"como"**.

## O produto

**Kaptika** — app web gamificado de microlearning para estudantes que se preparam para o **ENEM**. Sessões curtas de questões, com XP, níveis, ofensiva diária (streak), medalhas e placar de líderes. Fonte das questões: **enem.dev**.

## Stack

| Camada | Tecnologias |
|---|---|
| **Backend** | Java + Spring Boot 4.x, PostgreSQL (Supabase). API RESTful. |
| **Frontend** | React + TypeScript + Tailwind CSS + Vite. Mobile-first. |
| **Auth** | Supabase Auth (cadastro/login/sessão no cliente). O backend só **valida** o JWT (via JWKS). |
| **Dados de questões** | API pública **enem.dev** (consumida e cacheada pelo backend). |

## Invariantes (valem para toda feature)

**Fonte de verdade**
- O **backend é a fonte de verdade** de XP, nível, ofensiva, medalhas e placar. O frontend **reflete** o estado da API — nunca calcula nem persiste esses valores por conta própria.
- Todo estado de progresso é derivado de **eventos de domínio** entre features (ex.: 002 Sessões emite eventos que alimentam 003 XP, 004 Streak, 005 Medalhas).

**Segurança e autorização**
- Todo endpoint protegido **valida a assinatura e a validade temporal** do JWT do Supabase antes de qualquer processamento. Token ausente/expirado/adulterado → **401**, sem vazar detalhes internos.
- O sujeito autenticado é o `id` do Supabase extraído do token. **Um estudante nunca acessa dados de outro** (verificação de posse na aplicação + RLS no PostgreSQL). Acesso cruzado → **403/404** sem revelar existência.
- Nunca colocar dados sensíveis em query string, logs ou mensagens de erro.

**Consistência**
- Operações que podem repetir (provisionar perfil, registrar sessão) são **idempotentes** — sem duplicação sob concorrência.
- Erros seguem **formato padronizado**: `{ código, mensagem, correlationId }`. Validação de entrada inválida → **422** com a regra violada.

**Frontend**
- **Mobile-first** sempre. Alvos de toque adequados, navegável por teclado e leitor de tela.
- Toda tela que consome API trata os três estados: **carregando**, **erro (com repetir)** e **vazio**.
- Feedback imediato ao usuário (acerto/erro, +XP, subida de nível) sem esperar reconciliação completa, mas a UI converge para o estado da API.

**Datas/fuso**
- Regras de tempo (ofensiva diária) usam o **fuso do servidor** como referência, não o do cliente.

## Fluxo de trabalho (SDD)

Três fases por feature, sempre **uma feature por vez e backend antes do frontend**:

```
/plan <spec>       → <spec>.plan.md      (o "como" — sem código)
/tasks <spec>      → <spec>.tasks.md     (checklist executável)
/implement <spec>  → código + caixas marcadas + Status da spec atualizado
```

- Os artefatos (`.plan.md`, `.tasks.md`) ficam **ao lado da spec** (ex.: `specs/backend/002-sessoes-de-estudo.plan.md`).
- Antes do `/plan`, resolva os `[NEEDS CLARIFICATION]` da spec. As decisões ficam registradas na seção **Decisões** do `.plan.md`.
- Detalhes do kit e customização: veja [`sdd/README.md`](sdd/README.md).

### Ordem de dependência das features

`001 Autenticação` é a base → `002 Sessões` produz os eventos que alimentam `003 XP`, `004 Streak` e `005 Medalhas` → `006 Placar` consome o XP consolidado. Em cada feature: backend (contratos/dados) primeiro, depois o frontend que os consome.

## Convenções de git

- **Um branch por feature**, nomeado como o campo *Feature Branch* da spec: `backend/00X-...` ou `frontend/00X-...`.
- **Commits pequenos**, um por tarefa ou grupo de tarefas, referenciando o requisito: `tipo(00X): <ID> descrição` (ex.: `feat(002): FR-005 registrar sessão de estudo`).
- Ao concluir uma feature, o campo **Status** da spec passa de `Draft` → `Implemented`.

## Como ler uma spec

Cada spec segue: **User Scenarios & Testing** (histórias P1/P2/P3 com Given/When/Then) → **Requirements** (FR-XXX + entidades) → **Success Criteria** (SC-XXX mensuráveis) → **Assumptions**. Marcações `[NEEDS CLARIFICATION: ...]` sinalizam decisões pendentes.
