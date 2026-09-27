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

## Identidade visual ("Cartão-resposta")

- **Tokens** em `src/index.css` (`@theme`): `paper`, `surface`, `ink`, `ink-muted`, `line`, `pen-*` (caneta azul), `highlight` (marca-texto), `capy` e `capy-dark` (capivara, só na marca e em ilustração), `success`, `danger`, `rounded-card`, `rounded-control`, `shadow-stamp`. Use os tokens, não as cores padrão do Tailwind; o contraste de cada par está anotado no arquivo.
- **Tipografia**: Bricolage Grotesque para títulos e números (`font-display`), Figtree para texto.
- **Marca**: capivara estudante de perfil, em caramelo (`capy`), com o lápis amarelo (marca-texto) atrás da orelha, só com cores dos tokens. Fonte em `components/Logo.tsx`; cópias em `public/favicon.svg` e `public/apple-touch-icon.png` (180px, sem cantos arredondados porque o iOS aplica a máscara). Ao mudar o desenho, atualize as três.
- **Ícones**: SVG próprios em `components/Icons.tsx`. Emoji na interface é proibido; `src/test/interfaceSemEmoji.test.ts` falha se algum aparecer.
- **Motivo**: bolinhas do cartão-resposta nas alternativas e no progresso da sessão; `highlight-mark` para o traço de marca-texto em números de destaque.

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
