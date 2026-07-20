-- Feature 003 — Sistema de XP e Níveis
-- Trilha de concessões (auditoria + dedupe) e saldo consolidado por estudante.
-- Invariantes garantidas no banco:
--   * uma concessão por evento de origem (UNIQUE idempotency_key — FR-003, SC-002)
--   * saldo mantido por incremento atômico na mesma transação da concessão
--     ⇒ xp_balances.xp_total = soma de xp_grants.amount (FR-004, SC-001)

create table xp_grants (
    id              uuid primary key default gen_random_uuid(),
    profile_id      uuid not null references profiles (id),
    amount          int not null,
    source          varchar(120) not null,   -- ex.: session:<uuid>:question:<uuid>
    granted_at      timestamptz not null,    -- instante do fato gerador (answeredAt)
    idempotency_key varchar(120) not null,
    constraint uq_xp_grants_idempotency unique (idempotency_key),
    constraint ck_xp_grants_amount check (amount > 0)
);

-- Soma do período semanal por estudante (FR-007, SC-005)
create index idx_xp_grants_profile_granted_at on xp_grants (profile_id, granted_at);

create table xp_balances (
    profile_id uuid primary key references profiles (id),
    xp_total   bigint not null default 0,
    updated_at timestamptz not null default now(),
    constraint ck_xp_balances_total check (xp_total >= 0)
);
