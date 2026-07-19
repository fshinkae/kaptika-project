---
description: Gera o checklist executável de tarefas a partir da spec e do plano.
argument-hint: <caminho-da-spec>
---

Você está na fase **/tasks** do fluxo SDD do Kaptika. O argumento é o caminho de uma spec:

`$ARGUMENTS`

## Objetivo

Produzir o arquivo `<spec>.tasks.md` — um **checklist executável** derivado do plano. **Não escreva código.**

## Pré-requisito

O `<spec>.plan.md` correspondente **deve existir**. Se não existir, avise o usuário para rodar `/plan $ARGUMENTS` primeiro e pare.

## Passos

1. **Leia o contexto**:
   - A spec em `$ARGUMENTS` (histórias P1/P2/P3, FR-XXX, SC-XXX).
   - O `<spec>.plan.md` (abordagem técnica, decisões, rastreabilidade).
   - `CLAUDE.md` (invariantes e convenções).
   - O template `sdd/templates/tasks-template.md`.

2. **Quebre o plano em tarefas pequenas e verificáveis**, seguindo a estrutura de fases do template:
   - **Fase 1 — Preparação:** setup mínimo.
   - **Fase 2 — Fundação:** modelo de dados / estrutura base (bloqueia as histórias).
   - **Fases 3+ — por história (US1, US2, ...):** tarefas na ordem de prioridade (P1 = MVP primeiro).
   - **Fase final — Conferência:** verificar a implementação contra os **SC-XXX** da spec.

3. **Formato de cada tarefa** (exatamente): `- [ ] Txxx [P?] [Ref] descrição com caminho de arquivo`
   - `Txxx` = id sequencial (T001, T002, ...).
   - `[P]` = pode rodar em paralelo (arquivos diferentes, sem dependência entre si). Omita se houver dependência.
   - `[Ref]` = id do requisito ou história relacionada (ex.: `FR-005`, `US1`).
   - Inclua o **caminho do arquivo** que a tarefa cria/altera.

4. **Preencha as seções** Dependências e Notas conforme o template. Deixe todas as caixas **desmarcadas** (`- [ ]`).

5. **Salve** em `<spec>.tasks.md` — mesmo diretório e nome-base da spec, trocando `.md` por `.tasks.md`.

6. **Encerre** informando o caminho gerado e o número de tarefas por fase.

Não implemente nada nesta fase.
