# Kit SDD do Kaptika

Kit leve de **Spec-Driven Development** para executar e evoluir as specs com o Claude Code. Três fases: **plan → tasks → implement**. Tudo em markdown puro, versionado no repositório — funciona em **qualquer máquina** com Claude Code, sem instalação nem configuração extra.

## Peças do kit

```
CLAUDE.md                      # Constituição: stack + invariantes + fluxo (lida automaticamente)
.claude/commands/
├── plan.md                    # /plan   <spec>
├── tasks.md                   # /tasks  <spec>
└── implement.md               # /implement <spec>
sdd/
├── README.md                  # Este arquivo
└── templates/
    ├── plan-template.md       # Estrutura do .plan.md
    └── tasks-template.md      # Estrutura do .tasks.md
specs/                         # As specs (o "o quê") — backend/ e frontend/
```

## Pré-requisitos

- [Claude Code](https://claude.com/claude-code) instalado.

- Abrir a **pasta raiz do projeto** no Claude Code (é onde ficam CLAUDE.md e .claude/).

## Como usar (em qualquer máquina)

1.  Copie/clone o repositório e abra a pasta no Claude Code.

2.  Confirme que os comandos aparecem: digite / e veja /plan, /tasks, /implement.

3.  Trabalhe **uma feature por vez, backend primeiro**. Exemplo com a feature 002:

```
/plan specs/backend/002-sessoes-de-estudo.md
/tasks specs/backend/002-sessoes-de-estudo.md
/implement specs/backend/002-sessoes-de-estudo.md
```

Depois repita para a camada frontend:

```
/plan specs/frontend/002-sessoes-de-estudo.md
/tasks specs/frontend/002-sessoes-de-estudo.md
/implement specs/frontend/002-sessoes-de-estudo.md
```

### O que cada fase produz

| **Comando** | **Lê** | **Gera** |
|:---|:---|:---|
| /plan <spec> | spec + CLAUDE.md + template de plano | <spec>.plan.md (o "como") |
| /tasks <spec> | spec + .plan.md + template de tarefas | <spec>.tasks.md (checklist) |
| /implement <spec> | spec + .plan.md + .tasks.md | código + caixas marcadas + Status da spec atualizado |

Os artefatos ficam **ao lado da spec** (ex.: specs/backend/002-sessoes-de-estudo.plan.md), mantendo os três documentos da feature juntos.

## Como documentar a evolução

- O .tasks.md mostra o progresso (caixas - [x]).

- O campo Status de cada spec anda de Draft → Implemented.

- O histórico do **git** (um branch e commits por feature, referenciando FR-XXX) é o registro de evolução. Padrão de commit: tipo(00X): <ID> descrição.

## Como customizar depois

Tudo é markdown editável — não há código escondido:

- **Mudar o comportamento de uma fase:** edite o arquivo em .claude/commands/. O texto do arquivo é literalmente o prompt executado.

- **Mudar a estrutura dos documentos gerados:** edite os arquivos em sdd/templates/.

- **Mudar regras globais (stack, invariantes, convenções):** edite CLAUDE.md.

- **Criar uma nova fase (ex.: /verify):** copie um comando existente em .claude/commands/, renomeie o arquivo (o nome do arquivo vira o nome do comando) e ajuste o conteúdo.

- **Comandos pessoais (fora do repo):** coloque em ~/.claude/commands/ para usá-los em todos os seus projetos.

Sintaxe dos comandos: frontmatter opcional (description, argument-hint) e o argumento passado na chamada fica disponível como $ARGUMENTS no corpo.

## Dica de fluxo

Antes do /plan, resolva os [NEEDS CLARIFICATION] da spec (principalmente os do backend: pontuação de XP, curva de níveis, meta/fuso da ofensiva, desempate do placar, lista de medalhas). Decisões tomadas ficam registradas na seção **Decisões** do .plan.md.
