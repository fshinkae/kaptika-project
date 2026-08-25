-- Hardening — RLS como defesa em profundidade (FR-011)
-- O Supabase expõe o schema `public` via PostgREST para os papéis `anon` e
-- `authenticated` (a anon key é pública, embarcada no frontend). Sem RLS,
-- qualquer portador da anon key lê/escreve todas as linhas diretamente,
-- contornando o backend.
--
-- Aqui habilitamos RLS SEM políticas: isso NEGA todo acesso via PostgREST
-- (anon/authenticated) enquanto o backend — que conecta como o papel dono da
-- tabela (`postgres`) — CONTORNA RLS e mantém acesso total. O frontend usa o
-- Supabase apenas para Auth; os dados sempre vêm da API. Logo, nada quebra.
--
-- Se no futuro alguma tabela precisar ser lida direto pelo cliente Supabase,
-- adicione políticas explícitas (ex.: dono lê o próprio perfil via auth.uid()).

alter table profiles               enable row level security;
alter table questions              enable row level security;
alter table question_alternatives  enable row level security;
alter table study_sessions         enable row level security;
alter table session_questions      enable row level security;
alter table answers                enable row level security;
alter table xp_grants              enable row level security;
alter table xp_balances            enable row level security;
alter table streaks                enable row level security;
alter table activity_days          enable row level security;
alter table streak_event_dedupe    enable row level security;
alter table badges                 enable row level security;
alter table badge_awards           enable row level security;
alter table badge_counters         enable row level security;
alter table processed_badge_events enable row level security;
