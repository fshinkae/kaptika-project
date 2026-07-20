# Feature Specification (Backend): Autenticação e Perfil

**Feature Branch**: backend/001-autenticacao-e-perfil

**Created**: 2026-07-14

**Status**: Implemented

**Camada**: Backend (API RESTful — Spring Boot 4.x, PostgreSQL/Supabase)

**Contraparte**: [frontend/001-autenticacao-e-perfil.md](../frontend/001-autenticacao-e-perfil.md)

**Input**: A API confia no Supabase Auth como emissor de identidade. Ela não gerencia senhas nem faz login/cadastro — isso ocorre no cliente via Supabase. O papel do backend é **validar o token** em toda requisição protegida, **provisionar e servir o perfil interno** do estudante e **garantir que cada estudante só acesse seus próprios dados**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autorizar requisições com token do Supabase (Priority: P1)

O aplicativo cliente envia, em cada chamada a endpoint protegido, o token de acesso emitido pelo Supabase Auth. A API valida a assinatura e a validade do token e identifica o estudante; tokens ausentes, inválidos ou expirados são recusados.

**Why this priority**: Sem validação de token confiável, nenhuma outra funcionalidade pode expor ou alterar dados com segurança. É a fundação de toda a API.

**Independent Test**: Chamar um endpoint protegido com um token válido (200), com token expirado (401), com token adulterado (401) e sem token (401).

**Acceptance Scenarios**:

1.  **Given** um token de acesso válido, **When** o cliente chama um endpoint protegido, **Then** a API resolve o identificador do estudante e processa a requisição.

2.  **Given** um token expirado ou com assinatura inválida, **When** o cliente chama um endpoint protegido, **Then** a API responde 401 sem revelar detalhes internos.

3.  **Given** ausência de token, **When** o cliente chama um endpoint protegido, **Then** a API responde 401.

### User Story 2 - Provisionar e servir o perfil interno (Priority: P1)

No primeiro acesso autenticado de um estudante, a API cria um registro de perfil interno vinculado ao identificador do Supabase. Em acessos seguintes, a API serve esse perfil com os agregados de progresso (XP total, nível, ofensiva, contagem de medalhas).

**Why this priority**: As demais features (XP, ofensiva, medalhas, placar) ancoram-se nesse perfil interno. Sem ele, não há onde acumular progresso.

**Independent Test**: Autenticar um usuário novo e verificar que o perfil é criado uma única vez; chamar GET /me e conferir os agregados; reautenticar e confirmar que nenhum perfil duplicado é criado.

**Acceptance Scenarios**:

1.  **Given** um estudante autenticado sem perfil interno, **When** ele faz a primeira requisição autenticada, **Then** a API cria exatamente um perfil vinculado ao seu identificador do Supabase.

2.  **Given** um estudante com perfil, **When** chama GET /me, **Then** recebe nome de exibição, avatar, XP total, nível, ofensiva atual e nº de medalhas.

3.  **Given** requisições concorrentes do mesmo estudante novo, **When** ambas tentam provisionar, **Then** apenas um perfil é criado (sem duplicação).

### User Story 3 - Atualizar dados do perfil (Priority: P2)

O estudante autenticado atualiza seu nome de exibição e avatar. A API valida os dados e persiste as alterações somente no perfil do próprio estudante.

**Why this priority**: Personalização reforça engajamento, mas não bloqueia o núcleo. Depende do perfil já existir.

**Independent Test**: PATCH /me com nome válido persiste; com nome inválido (vazio/acima do limite) retorna 422; tentar alterar o perfil de outro estudante é impedido.

**Acceptance Scenarios**:

1.  **Given** um estudante autenticado, **When** envia PATCH /me com nome de exibição válido, **Then** a API persiste e retorna o perfil atualizado.

2.  **Given** um nome de exibição inválido, **When** envia PATCH /me, **Then** a API responde 422 com a descrição da regra violada.

3.  **Given** um token do estudante A, **When** a requisição tenta alterar dados do estudante B, **Then** a API impede e responde 403/404 (sem vazar existência).

### Edge Cases

- Como a API se comporta se o token for válido mas o usuário tiver sido removido no Supabase?

- Como tratar relógio dessincronizado que faça um token parecer não-válido-ainda (nbf)?

- O que acontece se o provisionamento do perfil falhar após a validação do token?

- Como lidar com a rotação de chaves de assinatura (JWKS) do Supabase?

- Nomes de exibição duplicados entre estudantes: permitido, com desambiguação por identificador interno.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A API DEVE validar, em todo endpoint protegido, a assinatura e a validade temporal do token de acesso emitido pelo Supabase Auth.

- **FR-002**: A API DEVE extrair do token o identificador do estudante e usá-lo como sujeito autenticado da requisição.

- **FR-003**: A API DEVE recusar (401) requisições sem token, com token expirado, malformado ou de assinatura inválida, sem expor detalhes internos.

- **FR-004**: A API DEVE provisionar, de forma idempotente, um perfil interno na primeira requisição autenticada de um estudante, vinculado ao seu identificador do Supabase.

- **FR-005**: A API DEVE expor um endpoint que retorne o perfil do estudante autenticado com nome de exibição, avatar, XP total, nível, ofensiva atual e contagem de medalhas.

- **FR-006**: A API DEVE permitir atualizar nome de exibição e avatar do próprio estudante, validando os dados de entrada.

- **FR-007**: A API DEVE impedir que um estudante leia ou altere dados de outro, aplicando verificação de posse em todos os recursos.

- **FR-008**: A API DEVE permitir nomes de exibição repetidos entre estudantes, mantendo um identificador interno único por perfil para desambiguação.

- **FR-009**: A API DEVE registrar a data de criação do perfil e atualizar a data do último acesso a cada requisição autenticada.

- **FR-010**: A API DEVE obter e cachear as chaves públicas de verificação (JWKS) do Supabase e lidar com sua rotação sem indisponibilidade.

- **FR-011**: A API DEVE aplicar as regras de proteção de dados por linha/posse de forma consistente com as políticas do banco (Supabase/PostgreSQL).

- **FR-012**: A API DEVE responder erros em formato padronizado (código, mensagem, identificador de correlação) sem vazar dados sensíveis.

### Key Entities & Contratos *(nível de comportamento, não de implementação)*

- **Perfil**: representação interna do estudante. Campos: id interno, id do Supabase (único), nome de exibição, avatar, data de criação, data do último acesso. Agregados de progresso (XP, nível, ofensiva, medalhas) são derivados das features 003–005.

- **Endpoints (esboço de contrato)**:

  - GET /me → perfil + agregados do estudante autenticado.

  - PATCH /me → atualiza nome de exibição/avatar; valida entrada.

  - (Todos exigem token válido do Supabase no cabeçalho de autorização.)

- **Cadastro, login, logout e recuperação de senha**: responsabilidade do Supabase Auth (cliente) — fora do escopo do backend, que apenas confia no token.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das requisições a endpoints protegidos sem token válido são recusadas com 401.

- **SC-002**: Nenhum estudante consegue ler ou alterar dados de outro (0 acessos cruzados em teste de autorização).

- **SC-003**: No máximo 1 perfil por estudante, mesmo sob requisições concorrentes (0 duplicações).

- **SC-004**: GET /me responde em até 300 ms no p95 sob carga nominal.

- **SC-005**: A rotação de chaves do Supabase não causa indisponibilidade (0 janelas de erro atribuíveis à rotação).

- **SC-006**: Mensagens de erro de autenticação não revelam existência de usuário nem detalhes internos (verificável por inspeção das respostas).

## Assumptions

- **Supabase Auth** é a fonte de identidade e credenciais; o backend valida o JWT (via JWKS) e não armazena senhas.

- Banco **PostgreSQL no Supabase**; políticas de segurança em nível de linha (RLS) podem complementar a verificação de posse na aplicação.

- A API é stateless quanto à sessão: cada requisição carrega seu próprio token.

- Verificação de e-mail e políticas de senha são configuradas no Supabase, não no backend. **Decidido**: a API **não exige e-mail verificado** no MVP — qualquer JWT válido do Supabase é aceito (menos atrito no cadastro). A exigência pode ser ativada depois via configuração do Supabase, sem mudança na API.
