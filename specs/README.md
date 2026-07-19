# Kaptika — Especificações (Spec-Driven Development)

Este diretório contém as **specs** do Kaptika, um aplicativo web gamificado de microlearning para estudantes que se preparam para o ENEM. As specs seguem a metodologia **Spec-Driven Development (SDD)** no formato do *Spec Kit* e estão **separadas por camada**: cada feature tem uma spec de **backend** e uma de **frontend**, ambas numeradas NNN-titulo.md.

> **Objetivo destas specs:** servir de contexto estruturado para agentes de IA (Cursor, Copilot, ChatGPT, etc.) gerarem o código do banco, backend e frontend de forma autônoma e sem perda de contexto. Cada camada tem sua própria spec para alimentar agentes distintos com o recorte certo de responsabilidade.

## Estrutura

```
specs/
├── README.md
├── backend/     # API RESTful (Java + Spring Boot 3.x) + PostgreSQL/Supabase
│   ├── 001-autenticacao-e-perfil.md
│   ├── 002-sessoes-de-estudo.md
│   ├── 003-sistema-de-xp.md
│   ├── 004-ofensiva-diaria-streak.md
│   ├── 005-medalhas-e-conquistas.md
│   └── 006-placar-de-lideres.md
└── frontend/    # React + TypeScript + Tailwind + Vite (Mobile-First)
    ├── 001-autenticacao-e-perfil.md
    ├── 002-sessoes-de-estudo.md
    ├── 003-sistema-de-xp.md
    ├── 004-ofensiva-diaria-streak.md
    ├── 005-medalhas-e-conquistas.md
    └── 006-placar-de-lideres.md
```

Cada par de mesmo número descreve a **mesma feature** em camadas diferentes e se referencia mutuamente pelo campo **Contraparte** no topo do arquivo.

## Como ler uma spec

Cada arquivo de spec segue a mesma estrutura:

1.  **User Scenarios & Testing** — histórias priorizadas (P1, P2, P3), cada uma testável de forma independente, com cenários *Given / When / Then* e casos de borda.

2.  **Requirements** — requisitos funcionais (FR-XXX) e entidades/contratos-chave.

3.  **Success Criteria** — critérios mensuráveis (SC-XXX).

4.  **Assumptions** — premissas e dependências.

Marcações [NEEDS CLARIFICATION: ...] sinalizam decisões pendentes antes da fase de planejamento.

## Índice de features (MVP)

| **#** | **Feature** | **Backend** | **Frontend** |
|:---|:---|:---|:---|
| 001 | Autenticação e Perfil | [backend](./backend/001-autenticacao-e-perfil.md) | [frontend](./frontend/001-autenticacao-e-perfil.md) |
| 002 | Sessões de Estudo | [backend](./backend/002-sessoes-de-estudo.md) | [frontend](./frontend/002-sessoes-de-estudo.md) |
| 003 | Sistema de XP | [backend](./backend/003-sistema-de-xp.md) | [frontend](./frontend/003-sistema-de-xp.md) |
| 004 | Ofensiva Diária (Streak) | [backend](./backend/004-ofensiva-diaria-streak.md) | [frontend](./frontend/004-ofensiva-diaria-streak.md) |
| 005 | Medalhas e Conquistas | [backend](./backend/005-medalhas-e-conquistas.md) | [frontend](./frontend/005-medalhas-e-conquistas.md) |
| 006 | Placar de Líderes | [backend](./backend/006-placar-de-lideres.md) | [frontend](./frontend/006-placar-de-lideres.md) |

## Divisão de responsabilidades por camada

- **Backend** — fonte de verdade e regras de negócio: valida o JWT do Supabase, provisiona/serve o perfil, orquestra sessões e consome a **enem.dev**, calcula XP/níveis, decide a ofensiva (com fuso do servidor), concede medalhas e ranqueia o placar. Persiste tudo em **PostgreSQL (Supabase)** e emite/consome eventos de domínio entre features.

- **Frontend** — experiência mobile-first: usa o **Supabase Auth** para cadastro/login/sessão, protege rotas, consome a API, exibe feedback imediato (acerto/erro, +XP, subida de nível), ofensiva, galeria de medalhas e placar. A UI **reflete** o estado da API; não é a fonte de verdade de XP/ofensiva.

## Glossário rápido

- **Área de conhecimento (ENEM):** Linguagens; Ciências Humanas; Ciências da Natureza; Matemática (e suas Tecnologias).

- **Sessão:** rodada curta com **no máximo 20 questões**.

- **XP:** pontos ganhos ao acertar. **Streak (ofensiva):** dias consecutivos de meta cumprida. **Badge (medalha):** marco conquistado. **Leaderboard (placar):** ranking por XP.

## Ordem de dependência sugerida

001 Autenticação é a base. 002 Sessões (backend) produz os eventos que alimentam 003 XP, 004 Streak e 005 Medalhas. 006 Placar consome o XP consolidado. Em cada feature, comece pelo **backend** (contratos/dados) e então o **frontend** que os consome.
