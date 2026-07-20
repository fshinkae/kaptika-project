-- Feature 004 — Ofensiva Diária (Streak)
-- Estado agregado por estudante + dias de atividade + dedupe de eventos.
-- Invariantes garantidas no banco:
--   * no máximo um cumprimento de meta por (estudante, dia local) — PK de
--     activity_days (FR-003/FR-009, SC-001)
--   * evento consumido no máximo uma vez — PK de streak_event_dedupe (FR-009)

create table streaks (
    profile_id         uuid primary key references profiles (id),
    current_streak     int not null default 0,
    record_streak      int not null default 0,
    last_met_date      date,                                -- último dia (fuso do servidor) com meta cumprida
    freezes            int not null default 2,              -- FR-008: estoque inicial 2, teto 2
    broken_at          timestamptz,                         -- momento da última quebra (FR-007)
    break_acknowledged boolean not null default true,       -- false = quebra ainda não reportada no GET
    updated_at         timestamptz not null default now(),
    constraint ck_streaks_non_negative
        check (current_streak >= 0 and record_streak >= 0 and freezes >= 0)
);

create table activity_days (
    profile_id uuid not null references profiles (id),
    local_date date not null,                               -- dia no fuso kaptika.streak.zone
    met        boolean not null default true,
    primary key (profile_id, local_date)
);

create table streak_event_dedupe (
    idempotency_key varchar(120) primary key,               -- ex.: "session:<uuid>"
    profile_id      uuid not null,
    processed_at    timestamptz not null default now()
);

-- Varredura do job de reconciliação: ofensivas ativas com meta vencida
create index idx_streaks_active_last_met
    on streaks (last_met_date) where current_streak > 0;
