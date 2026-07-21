# Kaptika (frontend)

App web mobile-first do Kaptika — microlearning gamificado para o ENEM. React + TypeScript + Vite + Tailwind, autenticação via Supabase, consumindo a API do backend.

## Rodar localmente

Pré-requisitos: Node 20+.

```bash
cp .env.example .env   # preencha com os dados do seu projeto Supabase e a URL da API
npm install
npm run dev
```

Variáveis (`.env`):

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — projeto Supabase (Auth)
- `VITE_API_URL` — base da API do backend (ex.: `http://localhost:8080`)

## Testes e build

```bash
npm test          # Vitest + Testing Library (API mockada com MSW, Supabase mockado)
npm run build     # typecheck (tsc) + build de produção
npm run lint      # oxlint
```

Os testes rodam sem rede nem projeto Supabase real: o SDK do Supabase é substituído por um mock stateful e a API por handlers MSW.

## Estrutura (feature 001 — fundação)

```
src/
├── auth/          # AuthContext (sessão), ProtectedRoute, schemas de validação
├── lib/           # supabase, apiClient (token + 401), profileApi, env
├── components/    # UI transversal: Button, FormField, estados (loading/erro/vazio), Avatar
├── pages/         # Login, Signup, RecoverPassword, Profile, Home
├── test/          # setup, mocks (Supabase/MSW), helper de render
├── App.tsx        # rotas públicas/privadas
└── main.tsx       # provedores (Query + Auth + Router)
```

As features 002–006 reutilizam `apiClient`, `AuthContext`, `ProtectedRoute` e os componentes de estado.
