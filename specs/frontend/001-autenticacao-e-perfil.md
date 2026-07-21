# Feature Specification (Frontend): Autenticação e Perfil

**Feature Branch**: frontend/001-autenticacao-e-perfil

**Created**: 2026-07-14

**Status**: Implemented

**Camada**: Frontend (React + TypeScript + Tailwind + Vite + React Router v6, Mobile-First)

**Contraparte**: [backend/001-autenticacao-e-perfil.md](../backend/001-autenticacao-e-perfil.md)

**Input**: O frontend usa o SDK do **Supabase Auth** para cadastro, login, logout e recuperação de senha, mantém a sessão entre reaberturas, protege as rotas privadas e anexa o token às chamadas da API. A tela de perfil consome os agregados de progresso servidos pelo backend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar e entrar pelo celular (Priority: P1)

Um estudante cria conta (e-mail, senha, nome de exibição) e entra usando as telas mobile-first. Após autenticar, é levado à tela inicial de estudo. A sessão persiste ao reabrir o app.

**Why this priority**: É a porta de entrada; sem ela nenhuma tela protegida é acessível.

**Independent Test**: Cadastrar, sair, entrar novamente e confirmar que a sessão é recuperada e o app abre autenticado; verificar validações de formulário.

**Acceptance Scenarios**:

1.  **Given** um visitante na tela de cadastro, **When** informa dados válidos, **Then** a conta é criada via Supabase e ele é redirecionado autenticado à tela inicial.

2.  **Given** a tela de login, **When** informa credenciais corretas, **Then** entra e vê a tela inicial; **When** incorretas, **Then** vê mensagem de erro genérica.

3.  **Given** um estudante autenticado, **When** reabre o app dentro da validade da sessão, **Then** permanece logado sem reinformar credenciais.

4.  **Given** campos inválidos (e-mail malformado, senha fraca, nome vazio), **When** tenta enviar, **Then** o formulário bloqueia e explica cada erro.

### User Story 2 - Rotas protegidas e logout (Priority: P1)

Rotas privadas exigem sessão ativa; sem ela, o estudante é redirecionado ao login. O logout encerra a sessão e limpa o estado local.

**Why this priority**: Garante que a navegação respeite o estado de autenticação — base de segurança da experiência.

**Independent Test**: Tentar acessar uma rota privada sem sessão (redireciona ao login); fazer logout e confirmar que rotas privadas ficam inacessíveis.

**Acceptance Scenarios**:

1.  **Given** nenhum usuário autenticado, **When** acessa uma rota privada, **Then** é redirecionado ao login.

2.  **Given** um estudante autenticado, **When** faz logout, **Then** a sessão é encerrada, o estado local é limpo e ele volta à tela pública.

3.  **Given** o token expira durante o uso, **When** uma chamada à API retorna 401, **Then** o app trata a expiração (renova ou redireciona ao login) sem travar.

### User Story 3 - Ver e editar o perfil (Priority: P2)

A tela de perfil exibe nome de exibição, avatar, XP total, nível, ofensiva e medalhas (dados vindos da API) e permite editar nome e avatar.

**Why this priority**: Consolida a sensação de progresso; depende do núcleo de auth.

**Independent Test**: Abrir o perfil de uma conta com progresso e conferir os indicadores; alterar o nome e verificar persistência após recarregar.

**Acceptance Scenarios**:

1.  **Given** um estudante autenticado, **When** abre o perfil, **Then** vê nome, avatar, XP, nível, ofensiva e medalhas obtidos da API.

2.  **Given** a edição de perfil, **When** salva um nome válido, **Then** o novo nome aparece em todo o app (inclusive no placar).

3.  **Given** um nome inválido, **When** tenta salvar, **Then** a UI mostra o erro retornado e não persiste.

### Edge Cases

- Perda de conexão durante cadastro/login — feedback e reentrada.

- Token expira no meio de uma sessão de estudo (coordenar com a feature 002).

- Recuperação de senha: link expirado/ inválido — mensagem clara.

- Estado de carregamento enquanto os agregados do perfil são buscados.

- Avatar que falha ao carregar — estado de fallback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app DEVE oferecer telas mobile-first de cadastro, login, logout e recuperação de senha usando o Supabase Auth.

- **FR-002**: O app DEVE validar os formulários no cliente (formato de e-mail, regras de senha, nome de exibição) antes de enviar.

- **FR-003**: O app DEVE persistir a sessão do Supabase entre reaberturas e restaurá-la ao iniciar.

- **FR-004**: O app DEVE proteger rotas privadas, redirecionando ao login quando não houver sessão ativa.

- **FR-005**: O app DEVE anexar o token de acesso do Supabase às chamadas à API.

- **FR-006**: O app DEVE tratar respostas 401 da API (renovar sessão ou redirecionar ao login) sem travar a navegação.

- **FR-007**: O app DEVE exibir mensagens de erro de login genéricas, sem revelar se o e-mail existe.

- **FR-008**: O app DEVE exibir a tela de perfil com nome, avatar, XP, nível, ofensiva e medalhas obtidos da API.

- **FR-009**: O app DEVE permitir editar nome de exibição e avatar e refletir a mudança em toda a interface.

- **FR-010**: O app DEVE apresentar estados de carregamento e erro nas telas de autenticação e perfil.

- **FR-011**: O app DEVE ser mobile-first, com toque confortável e layout responsivo.

### Key Entities & UI *(nível de comportamento)*

- **Telas/Rotas**: /cadastro, /login, /recuperar-senha, /perfil, e um guardião de rota para áreas privadas.

- **Estado de sessão**: derivado do Supabase Auth (usuário, token, expiração).

- **Modelo de perfil (view)**: nome, avatar, XP, nível, ofensiva, medalhas — somente leitura para os agregados; edição para nome/avatar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um estudante novo cadastra e chega à tela de estudo em menos de 90 segundos no celular.

- **SC-002**: Rotas privadas são 100% inacessíveis sem sessão ativa.

- **SC-003**: A sessão é restaurada automaticamente em 100% das reaberturas dentro da validade.

- **SC-004**: Alterações de nome refletem em toda a UI em até 5 segundos.

- **SC-005**: 100% das mensagens de erro de login são genéricas (verificável em QA).

- **SC-006**: As telas passam em verificação de responsividade mobile (sem quebras) nos breakpoints-alvo.

## Assumptions

- Autenticação e sessão são gerenciadas pelo **Supabase Auth** no cliente; o app não implementa lógica de senha própria.

- O backend fornece os agregados do perfil (feature 001 backend).

- Login social está fora do escopo do MVP.

- Design visual/identidade detalhada será definida à parte; a spec fixa comportamento e conteúdo, não o layout final.
