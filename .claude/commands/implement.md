---
description: Implementa a feature seguindo o checklist de tarefas, marcando o progresso.
argument-hint: <caminho-da-spec>
---

Você está na fase **/implement** do fluxo SDD do Kaptika. O argumento é o caminho de uma spec:

`$ARGUMENTS`

## Objetivo

Escrever o **código** da feature seguindo o checklist, marcando cada tarefa concluída e atualizando o Status da spec.

## Pré-requisitos

Os arquivos `<spec>.plan.md` e `<spec>.tasks.md` **devem existir**. Se faltar algum, avise o usuário para rodar `/plan` e/ou `/tasks` primeiro e pare.

## Passos

1. **Leia o contexto**:
   - `<spec>.tasks.md` (o checklist — sua lista de trabalho).
   - `<spec>.plan.md` (decisões e abordagem técnica).
   - A spec em `$ARGUMENTS` (FR-XXX e SC-XXX a satisfazer).
   - `CLAUDE.md` (stack, invariantes, convenções de git). **Todo código deve respeitar os invariantes.**

2. **Prepare o branch.** Se ainda não estiver nele, crie/entre no branch da feature (campo *Feature Branch* da spec, ex.: `backend/002-sessoes-de-estudo`).

3. **Execute as tarefas na ordem das fases**, respeitando as dependências (Fase 2 antes das histórias; tarefas `[P]` podem ser feitas juntas). Para cada tarefa:
   - Implemente o código no(s) arquivo(s) indicado(s), seguindo a stack do `CLAUDE.md`.
   - **Marque a caixa** correspondente em `<spec>.tasks.md`: `- [ ]` → `- [x]`.
   - Faça um commit pequeno no padrão `tipo(00X): <ID> descrição` (ex.: `feat(002): FR-005 registrar sessão`). Só faça commits se o usuário desejar versionar — na dúvida, agrupe e pergunte antes de commitar.

4. **Fase de Conferência:** verifique a implementação contra cada **SC-XXX** da spec e registre o resultado. Rode testes/build se existirem; relate falhas com a saída real, sem mascarar.

5. **Atualize o Status da spec** de `Draft` para `Implemented` quando todas as tarefas estiverem marcadas e os SC-XXX atendidos.

6. **Encerre** com um resumo: tarefas concluídas, SC-XXX verificados, pendências e próximos passos (ex.: rodar a camada frontend correspondente).

Implemente apenas o que está no checklist desta spec. Mudanças fora do escopo devem ser sinalizadas, não executadas silenciosamente.
