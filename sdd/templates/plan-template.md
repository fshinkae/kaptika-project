# Plano de Implementação: [NOME DA FEATURE]

**Spec:** [caminho da spec, ex.: specs/backend/002-sessoes-de-estudo.md]

**Camada:** [Backend | Frontend]

**Data:** [AAAA-MM-DD]

> Gerado na fase /plan. Descreve o **como**. Não contém código. Customize as seções conforme a necessidade da sua feature.

## Resumo

[1–3 frases: o que esta feature entrega e a abordagem técnica escolhida.]

## Decisões

> Registre aqui como cada [NEEDS CLARIFICATION] da spec foi resolvido (decidido com o usuário ou padrão assumido). Uma linha por decisão.

- [ID/tema] → [decisão tomada] — [motivo curto]

## Abordagem técnica

### Backend (Spring Boot + PostgreSQL/Supabase)

- **Endpoints:** método, rota, entrada, saída, código de status. (referência: FR-XXX)

- **Modelo de dados:** tabelas, colunas, chaves, índices, restrições.

- **Regras de negócio:** cálculos, validações, invariantes aplicadas.

- **Idempotência/consistência:** onde e como garantir (chaves, transações).

- **Integrações:** enem.dev (cache, timeouts), Supabase (JWT/JWKS).

- **Erros:** formato padrão, mapeamento de falhas.

### Frontend (React + TS + Tailwind + Vite, mobile-first)

- **Rotas:** caminhos e proteção. (referência: FR-XXX)

- **Componentes:** principais componentes e responsabilidades.

- **Estado:** o que é local, o que vem da API, reconciliação.

- **Chamadas à API:** endpoints consumidos e tratamento de resposta.

- **Estados de UI:** carregando, erro (com repetir), vazio.

- **Acessibilidade/mobile:** alvos de toque, teclado, leitor de tela.

## Rastreabilidade (spec → plano)

| **Requisito (FR)** | **Como é atendido**  |
|:-------------------|:---------------------|
| FR-001             | [decisão do plano] |

## Riscos e pontos de atenção

- [risco] → [mitigação]

## Fora de escopo

- [o que este plano deliberadamente não cobre]
