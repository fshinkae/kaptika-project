---
description: Gera o plano de implementação (o "como") a partir de uma spec.
argument-hint: <caminho-da-spec>
---

Você está na fase **/plan** do fluxo SDD do Kaptika. O argumento é o caminho de uma spec:

`$ARGUMENTS`

## Objetivo

Produzir o arquivo `<spec>.plan.md` — o **"como"** da feature. **Não escreva código.** Descreva decisões técnicas, contratos e abordagem.

## Passos

1. **Leia o contexto** nesta ordem:
   - A spec em `$ARGUMENTS` (histórias, FR-XXX, SC-XXX, Assumptions, marcações `[NEEDS CLARIFICATION]`).
   - `CLAUDE.md` na raiz (stack, invariantes, fluxo, convenções).
   - A contraparte da spec (campo **Contraparte** no topo), para manter backend e frontend coerentes.
   - O template `sdd/templates/plan-template.md`.

2. **Resolva os `[NEEDS CLARIFICATION]`.** Para cada um: se houver decisão óbvia e alinhada aos invariantes, assuma um padrão razoável; caso contrário, **pergunte ao usuário** antes de prosseguir. Toda decisão (assumida ou combinada) vira uma linha na seção **Decisões**.

3. **Escreva o plano** seguindo a estrutura de `sdd/templates/plan-template.md`, preenchendo apenas a seção da camada correspondente (Backend **ou** Frontend, conforme a spec):
   - Resumo, Decisões, Abordagem técnica, **Rastreabilidade (cada FR-XXX → como é atendido)**, Riscos, Fora de escopo.
   - Respeite os invariantes do `CLAUDE.md` (fonte de verdade no backend, validação de JWT, idempotência, posse de dados, mobile-first, estados de UI, fuso do servidor).

4. **Salve** em `<spec>.plan.md` — mesmo diretório e mesmo nome-base da spec, trocando `.md` por `.plan.md` (ex.: `specs/backend/002-sessoes-de-estudo.md` → `specs/backend/002-sessoes-de-estudo.plan.md`).

5. **Encerre** informando o caminho gerado, resumindo as decisões tomadas e apontando qualquer `[NEEDS CLARIFICATION]` que ainda dependa do usuário.

Não avance para tasks nem para implementação nesta fase.
