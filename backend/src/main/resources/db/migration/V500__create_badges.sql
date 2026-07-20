-- Feature 005 — Medalhas e Conquistas
-- Catálogo dirigido a dados, concessões únicas por (perfil, medalha),
-- contadores acumulados próprios (isolamento das features 003/004) e
-- dedupe de eventos consumidos.
-- Invariantes garantidas no banco:
--   * concessão única por (profile_id, badge_id) — FR-003/SC-002
--   * evento processado uma única vez (PK da idempotency_key) — SC-002
--   * um registro de contadores por perfil (PK profile_id)

create table badges (
    id             uuid primary key default gen_random_uuid(),
    slug           varchar(40) not null,
    name           varchar(60) not null,
    description    varchar(200) not null,   -- objetivo exibido nas bloqueadas (FR-004)
    condition_type varchar(30) not null,
    threshold      int not null,
    sort_order     int not null,
    created_at     timestamptz not null default now(),
    constraint uq_badges_slug unique (slug),
    constraint ck_badges_condition check (condition_type in
        ('SESSIONS_COMPLETED', 'STREAK_DAYS', 'CORRECT_ANSWERS', 'AREAS_EXPLORED', 'XP_TOTAL')),
    constraint ck_badges_threshold check (threshold > 0)
);

create table badge_awards (
    id         uuid primary key default gen_random_uuid(),
    profile_id uuid not null references profiles (id),
    badge_id   uuid not null references badges (id),
    awarded_at timestamptz not null default now(),
    -- FR-003/SC-002: concessão única por (estudante, medalha)
    constraint uq_badge_awards_profile_badge unique (profile_id, badge_id)
);

create index idx_badge_awards_profile on badge_awards (profile_id);

-- Contadores acumulados derivados só dos eventos da 002 (isolamento 003/004):
-- xp_total = 10 por acerto (curva 100xN => nível 5 aos 1000 XP);
-- streak derivado de dias locais (America/Sao_Paulo) consecutivos com sessão concluída.
create table badge_counters (
    profile_id         uuid primary key references profiles (id),
    correct_total      bigint not null default 0,
    sessions_completed bigint not null default 0,
    xp_total           bigint not null default 0,
    areas_mask         int not null default 0,   -- 1 bit por área do ENEM
    streak_current     int not null default 0,
    streak_best        int not null default 0,
    last_session_date  date,
    updated_at         timestamptz not null default now()
);

-- Dedupe dos eventos consumidos (answer:<id>, session:<id>) — SC-002
create table processed_badge_events (
    idempotency_key varchar(80) primary key,
    processed_at    timestamptz not null default now()
);

-- FR-008: catálogo inicial do MVP com slugs estáveis (seed via migração)
insert into badges (slug, name, description, condition_type, threshold, sort_order) values
    ('first-session', 'Primeira Sessão',
     'Conclua sua primeira sessão de estudo', 'SESSIONS_COMPLETED', 1, 1),
    ('streak-7', 'Ofensiva de 7 Dias',
     'Estude por 7 dias consecutivos', 'STREAK_DAYS', 7, 2),
    ('correct-100', 'Centurião',
     'Acerte 100 questões', 'CORRECT_ANSWERS', 100, 3),
    ('explorer', 'Explorador',
     'Conclua ao menos uma sessão em cada uma das 4 áreas do ENEM', 'AREAS_EXPLORED', 4, 4),
    ('level-5', 'Nível 5',
     'Alcance o nível 5 de XP', 'XP_TOTAL', 1000, 5);
