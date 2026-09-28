# Feature Specification (Backend): Painel de Desempenho

**Feature Branch**: backend/007-painel-de-desempenho

**Created**: 2026-09-27

**Status**: Implemented

**Camada**: Backend (API RESTful — Spring Boot 4.x, PostgreSQL/Supabase)

**Contraparte**: [frontend/007-painel-de-desempenho.md](../frontend/007-painel-de-desempenho.md)

**Input**: O backend consolida o histórico de estudo do estudante em um retrato de desempenho: taxa de acerto por área de conhecimento do ENEM, a área que ele deve priorizar e a evolução no tempo (XP, questões respondidas e dias ativos). Tudo é derivado de dados já persistidos pelas features 002 (respostas), 003 (concessões de XP) e 004 (dias de atividade); esta feature só lê e agrega — não cria nova fonte de verdade.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Desempenho por área de conhecimento (Priority: P1)

A API retorna, para cada uma das quatro áreas do ENEM (Linguagens, Ciências Humanas, Ciências da Natureza, Matemática), quantas questões o estudante respondeu, quantas acertou, quantas errou e a taxa de acerto, dentro da janela de tempo pedida.

**Why this priority**: É o dado que responde "como estou indo?" e a base de todo o resto do painel; sem ele não há o que melhorar nem o que mostrar.

**Independent Test**: Com respostas registradas em áreas variadas, pedir o desempenho e conferir contagens e taxas por área contra os dados de `answers`/`study_sessions`.

**Acceptance Scenarios**:

1.  **Given** um estudante com respostas em Matemática e Linguagens, **When** pede o desempenho, **Then** a API retorna as quatro áreas, com contagens corretas nas duas praticadas e zero nas demais.

2.  **Given** uma área sem nenhuma resposta na janela, **When** o desempenho é calculado, **Then** a área aparece com `answered = 0` e taxa de acerto **nula** (não 0%), para não ser confundida com desempenho ruim.

3.  **Given** respostas de uma sessão que expirou antes de ser finalizada, **When** o desempenho é calculado, **Then** essas respostas confirmadas contam normalmente.

### User Story 2 - O que melhorar (Priority: P1)

A API indica a área em que o estudante deve focar, com o motivo, a partir de regras determinísticas sobre o desempenho por área.

**Why this priority**: É a parte "o que devo melhorar" pedida pelo produto; transforma números em ação e leva o estudante de volta a uma sessão.

**Independent Test**: Montar cenários de desempenho (área fraca clara, área nunca praticada, empate, amostra insuficiente) e verificar a recomendação retornada em cada um.

**Acceptance Scenarios**:

1.  **Given** áreas com amostra suficiente e taxas distintas, **When** pede o desempenho, **Then** a recomendação aponta a área de **menor taxa de acerto** com motivo `LOWEST_ACCURACY`.

2.  **Given** uma área sem nenhuma resposta e outras já praticadas, **When** pede o desempenho, **Then** a recomendação aponta a área não praticada com motivo `NOT_PRACTICED`.

3.  **Given** um estudante com menos respostas que a amostra mínima em todas as áreas, **When** pede o desempenho, **Then** a recomendação vem com motivo `INSUFFICIENT_DATA` e sem área, em vez de um palpite.

4.  **Given** duas áreas empatadas na menor taxa, **When** a recomendação é calculada, **Then** o desempate é estável (menos respostas primeiro; persistindo, ordem fixa do enum `Area`).

### User Story 3 - Evolução no tempo (Priority: P2)

A API retorna séries diárias da janela pedida: XP ganho, questões respondidas e acertos por dia, e se o dia contou para a ofensiva — base para gráfico de evolução e calendário de atividade.

**Why this priority**: Mostra progresso e constância, reforça o hábito; secundário ao retrato por área.

**Independent Test**: Com concessões de XP, respostas e dias de atividade em datas variadas (incluindo perto da meia-noite de São Paulo), pedir a série e conferir os valores dia a dia.

**Acceptance Scenarios**:

1.  **Given** uma janela de 30 dias, **When** pede o desempenho, **Then** a série tem exatamente 30 pontos contíguos, terminando no dia corrente do servidor, com zero nos dias sem atividade.

2.  **Given** uma resposta às 23h50 de São Paulo (02h50 UTC do dia seguinte), **When** a série é montada, **Then** ela conta no dia local de São Paulo, alinhado à feature 004.

3.  **Given** um dia marcado como meta cumprida em `activity_days`, **When** a série é montada, **Then** o ponto daquele dia traz `activeDay = true`.

### Edge Cases

- Estudante recém-cadastrado sem nenhuma resposta: todas as áreas zeradas, séries zeradas, recomendação `INSUFFICIENT_DATA` — resposta **200**, nunca 404.

- Questão respondida mais de uma vez em sessões diferentes: cada resposta confirmada conta (reflete tentativas reais).

- Janela inválida (valor fora da lista permitida): **422** com a regra violada.

- Concessões de XP que não vêm de sessão (ex.: bônus de medalha, se existirem): contam no XP do dia, pois a série é de XP ganho, não de acerto.

- Janela que começa antes do cadastro do estudante: dias anteriores aparecem zerados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A API DEVE expor o desempenho do **estudante autenticado** (sujeito do JWT); não há parâmetro de perfil — acesso cruzado é impossível por construção.

- **FR-002**: A API DEVE retornar as quatro áreas do ENEM sempre, cada uma com `answered`, `correct`, `wrong` e `accuracy` (0–1, **nula** quando `answered = 0`).

- **FR-003**: O desempenho por área DEVE ser derivado das respostas confirmadas (`answers` juntada a `study_sessions` pela área), dentro da janela pedida, pela data `answered_at`.

- **FR-004**: A API DEVE retornar uma recomendação com `area` (opcional) e `reason` ∈ {`NOT_PRACTICED`, `LOWEST_ACCURACY`, `INSUFFICIENT_DATA`}, seguindo a precedência: (1) se nenhuma área atinge a amostra mínima → `INSUFFICIENT_DATA`; (2) se existe área com `answered = 0` → `NOT_PRACTICED`; (3) senão → `LOWEST_ACCURACY` entre as áreas com amostra mínima.

- **FR-005**: A amostra mínima para uma área entrar em `LOWEST_ACCURACY` é **decidido: 10 respostas** na janela (equivale a duas sessões completas).

- **FR-006**: O desempate da recomendação DEVE ser estável: menor taxa → menos respostas → ordem do enum `Area`.

- **FR-007**: A API DEVE retornar uma série diária com um ponto por dia da janela: `date`, `xp` (soma de `xp_grants.amount`), `answered`, `correct` e `activeDay` (meta cumprida em `activity_days`).

- **FR-008**: Os dias DEVEM ser calculados no fuso do servidor definido na feature 004 (America/Sao_Paulo), nunca no do cliente.

- **FR-009**: A janela DEVE aceitar apenas valores de uma lista fechada, **decidido: 7, 30 e 90 dias, padrão 30** (parâmetro ausente → 30); valor fora da lista → **422**.

- **FR-010**: A consulta DEVE ser somente leitura, sem efeitos colaterais em XP, ofensiva ou medalhas (ex.: usar leitura sem efeitos da ofensiva, como `peekCurrent`).

- **FR-011**: Token ausente/expirado/adulterado → **401**; erros no formato padrão `{ código, mensagem, correlationId }`.

- **FR-012**: Fora do MVP: desempenho por assunto/tópico dentro da área (a enem.dev não fornece essa classificação e hoje só persistimos `source_id`), comparação com outros estudantes e metas personalizadas.

### Key Entities & Contratos

- **Desempenho por área**: área, respondidas, acertos, erros, taxa de acerto (nula sem respostas).

- **Recomendação**: área (opcional), motivo.

- **Ponto diário**: data local, XP ganho, respondidas, acertos, dia ativo.

- **Endpoint (esboço)**: `GET /me/performance?days=30` →

```json
{
  "windowDays": 30,
  "from": "2026-08-29",
  "to": "2026-09-27",
  "totals": { "answered": 42, "correct": 29, "wrong": 13, "accuracy": 0.69 },
  "areas": [
    { "area": "matematica", "answered": 15, "correct": 7, "wrong": 8, "accuracy": 0.47 },
    { "area": "linguagens", "answered": 20, "correct": 16, "wrong": 4, "accuracy": 0.80 },
    { "area": "ciencias-humanas", "answered": 7, "correct": 6, "wrong": 1, "accuracy": 0.86 },
    { "area": "ciencias-natureza", "answered": 0, "correct": 0, "wrong": 0, "accuracy": null }
  ],
  "recommendation": { "area": "ciencias-natureza", "reason": "NOT_PRACTICED" },
  "daily": [
    { "date": "2026-09-27", "xp": 40, "answered": 5, "correct": 4, "activeDay": true }
  ]
}
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Contagens e taxas por área batem com a base em 100% dos cenários de teste.

- **SC-002**: A recomendação segue a precedência e o desempate definidos em 100% dos cenários (incluindo empate e amostra insuficiente).

- **SC-003**: A série tem exatamente `windowDays` pontos contíguos, com dias atribuídos no fuso de São Paulo, em 100% dos casos (incluindo virada perto da meia-noite).

- **SC-004**: O endpoint responde em até 500 ms no p95 para um estudante com 90 dias de histórico ativo.

- **SC-005**: 0 casos de um estudante obter dados de outro (teste de autorização com dois perfis).

## Assumptions

- Fontes: `answers` + `study_sessions` (002), `xp_grants` (003), `activity_days` (004). Nenhuma tabela nova é necessária; índices adicionais, se o plano medir necessidade, vão em migração própria.

- Faixa de migração: as faixas `V7xx` e `V8xx` já estão ocupadas (`V700__enable_rls`, `V800__enem_consult_only`); a 007 usa **`V9xx__`** — a confirmar no `/plan`.

- O cálculo é sob demanda, sem cache: volume por estudante é pequeno (sessões de até 5 questões). Cache/materialização só se o SC-004 não for atingido.

- A recomendação é regra determinística e explicável, não modelo estatístico; refinar (ex.: ponderar por recência) é trabalho futuro.
