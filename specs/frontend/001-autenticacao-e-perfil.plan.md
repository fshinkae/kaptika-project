# Plano de Implementação: Autenticação e Perfil (Frontend)

**Spec:** specs/frontend/001-autenticacao-e-perfil.md

**Camada:** Frontend

**Data:** 2026-07-20

> Gerado na fase /plan. Descreve o **como**. Não contém código.

## Resumo

App React + TypeScript + Vite (mobile-first) nascendo nesta feature (diretório `frontend/`). Estabelece a **fundação transversal** reusada por 002–006: cliente Supabase Auth, contexto de sessão, guardião de rotas, cliente HTTP que anexa o JWT e trata 401, e os três estados de UI (carregando / erro-com-repetir / vazio). Telas de cadastro, login, recuperação de senha e perfil.

## Decisões

- **Build/stack** → Vite 6 + React 19 + TypeScript + Tailwind CSS 4 + React Router v6 (fixado na spec). Sem framework SSR — SPA pura consumindo a API do backend.
- **Supabase Auth** → `@supabase/supabase-js`; sessão persistida no `localStorage` (padrão do SDK) e restaurada via `onAuthStateChange`. O app **não** implementa lógica de senha (Assumption).
- **Config** → variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (`.env.example` versionado; `.env` no gitignore).
- **Estado de sessão** → `AuthContext` (React Context) expõe `session`, `user`, `loading`, `signIn/signUp/signOut`; único ponto que fala com o Supabase.
- **Cliente HTTP** → wrapper `apiFetch` que injeta `Authorization: Bearer <access_token>` (lido da sessão Supabase) e, em **401**, tenta `refreshSession` uma vez; se falhar, dispara logout e redireciona ao login (FR-006). Erros da API no formato `{code, message, correlationId}` são normalizados para um `ApiError`.
- **Roteamento** → rotas em português (`/cadastro`, `/login`, `/recuperar-senha`, `/perfil`, `/` como raiz privada placeholder de "estudo"); `<ProtectedRoute>` redireciona ao login sem sessão, preservando o destino.
- **Validação de formulário** → `react-hook-form` + `zod` (e-mail, força de senha, nome 2–40) — mensagens por campo, bloqueio antes do envio (FR-002).
- **Perfil** → `GET /me` do backend via React Query (`@tanstack/react-query`) para cache/estados; edição via `PATCH /me` com invalidação do cache (reflete o novo nome em toda a UI — FR-009, SC-004).
- **Data fetching** → React Query padroniza carregando/erro/vazio e o refetch; evita estado manual espalhado.
- **Testes** → Vitest + Testing Library + **MSW** (mock da API) e **mock do `@supabase/supabase-js`** (sessão fake) — sem rede, sem projeto Supabase real. jsdom como ambiente.
- **Erro de login genérico** (FR-007/SC-005) → a UI nunca diferencia "e-mail não existe" de "senha errada"; mostra sempre a mesma mensagem.

## Abordagem técnica

### Frontend (React + TS + Tailwind + Vite, mobile-first)

- **Rotas**: `/login`, `/cadastro`, `/recuperar-senha` (públicas); `/`, `/perfil` (privadas via `ProtectedRoute`). Guardião redireciona a `/login` guardando `from` (FR-004, SC-002).
- **Componentes-chave**:
  - `AuthProvider` / `useAuth` — sessão e ações (fonte única do Supabase).
  - `ProtectedRoute` — barra rotas privadas.
  - `apiClient` (`apiFetch`, `ApiError`) — token + tratamento de 401.
  - `LoginPage`, `SignupPage`, `RecoverPasswordPage`, `ProfilePage`.
  - UI transversal: `Spinner`/`LoadingState`, `ErrorState` (com botão repetir), `EmptyState`, `FormField`, `Button` — mobile-first, acessíveis.
- **Estado**: sessão no `AuthContext`; dados do servidor (perfil) no React Query — o app **reflete** a API, nunca recalcula XP/nível/ofensiva/medalhas (invariante do CLAUDE.md).
- **Chamadas à API**: `GET /me`, `PATCH /me`. Progresso exibido como somente-leitura; 422 do PATCH mapeado para erro no campo.
- **Estados de UI**: toda tela que busca dados trata carregando (spinner), erro (mensagem + repetir) e vazio; avatar com fallback ao falhar (edge case).
- **Acessibilidade/mobile**: labels associadas, foco visível, alvos ≥44px, navegação por teclado, `viewport` responsivo; breakpoints Tailwind.

## Rastreabilidade (spec → plano)

| Requisito (FR) | Como é atendido |
|:---|:---|
| FR-001 | Telas Supabase Auth: cadastro/login/logout/recuperação |
| FR-002 | react-hook-form + zod validam antes do envio |
| FR-003 | Sessão persistida e restaurada via onAuthStateChange |
| FR-004 | `ProtectedRoute` redireciona ao login |
| FR-005 | `apiFetch` injeta o access_token do Supabase |
| FR-006 | 401 → refresh 1×; falhou → logout + redirect |
| FR-007 | Mensagem de login genérica única |
| FR-008 | `ProfilePage` consome `GET /me` (agregados read-only) |
| FR-009 | `PATCH /me` + invalidação do React Query reflete em toda a UI |
| FR-010 | Estados de carregando/erro nas telas de auth e perfil |
| FR-011 | Layout mobile-first, Tailwind, alvos de toque |

## Riscos e pontos de atenção

- Ausência de projeto Supabase real no ambiente → toda a lógica isolada atrás do `AuthContext`; testes mockam o SDK. Integração real fica para o setup de ambiente (documentada no README).
- Renovação de token concorrente (várias chamadas em 401 simultâneo) → refresh serializado por uma única promessa compartilhada no `apiClient`.
- React 19 + Tailwind 4 são recentes → fixar versões no `package.json` e validar o build (`vite build`) na conferência.

## Fora de escopo

- Login social (Assumption).
- Telas de estudo/XP/ofensiva/medalhas/placar (features 002–006).
- Identidade visual final — a spec fixa comportamento, não o design.
