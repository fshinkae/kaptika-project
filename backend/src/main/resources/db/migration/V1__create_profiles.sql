-- Feature 001 — Autenticação e Perfil
-- Perfil interno do estudante, vinculado 1:1 ao usuário do Supabase Auth.
-- A unicidade de supabase_id garante no banco a idempotência do
-- provisionamento sob concorrência (FR-004, SC-003).
-- Posse é aplicada na aplicação (token -> supabase_id); políticas RLS do
-- Supabase ficam como defesa em profundidade quando a tabela for exposta
-- por outros canais (FR-011).

create table profiles (
    id             uuid primary key default gen_random_uuid(),
    supabase_id    uuid not null,
    display_name   varchar(40) not null,
    avatar_url     varchar(500),
    created_at     timestamptz not null default now(),
    last_access_at timestamptz not null default now(),
    constraint uq_profiles_supabase_id unique (supabase_id)
);

comment on table profiles is 'Perfil interno do estudante (feature 001); agregados de progresso vêm das features 003-005';
comment on column profiles.supabase_id is 'sub do JWT emitido pelo Supabase Auth (único por estudante)';
