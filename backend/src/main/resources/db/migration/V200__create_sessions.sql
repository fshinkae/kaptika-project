-- Feature 002 — Sessões de Estudo
-- Cache local de questões normalizadas da enem.dev + ciclo de vida da sessão.
-- Invariantes garantidas no banco:
--   * uma sessão ATIVA por estudante (índice único parcial — FR-011)
--   * uma resposta por (sessão, questão) — idempotência (FR-006, SC-002)
--   * questão única por sessão (sem repetição interna)

create table questions (
    id                  uuid primary key default gen_random_uuid(),
    source_id           varchar(80) not null,   -- ex.: enem.dev "2019-42"
    area                varchar(30) not null,   -- LINGUAGENS | CIENCIAS_HUMANAS | CIENCIAS_NATUREZA | MATEMATICA
    statement           text not null,
    context             text,
    correct_alternative varchar(1) not null,       -- A..E (uso interno; nunca exposto antes da resposta)
    origin_year         int not null,
    created_at          timestamptz not null default now(),
    constraint uq_questions_source_id unique (source_id),
    constraint ck_questions_correct check (correct_alternative in ('A','B','C','D','E'))
);

create index idx_questions_area on questions (area);

create table question_alternatives (
    question_id uuid not null references questions (id) on delete cascade,
    letter      varchar(1) not null,
    text        text not null,
    primary key (question_id, letter),
    constraint ck_alternatives_letter check (letter in ('A','B','C','D','E'))
);

create table study_sessions (
    id            uuid primary key default gen_random_uuid(),
    profile_id    uuid not null references profiles (id),
    area          varchar(30) not null,
    status        varchar(15) not null default 'ACTIVE',  -- ACTIVE | COMPLETED | EXPIRED
    correct_count int not null default 0,
    wrong_count   int not null default 0,
    created_at    timestamptz not null default now(),
    finished_at   timestamptz,
    constraint ck_sessions_status check (status in ('ACTIVE', 'COMPLETED', 'EXPIRED'))
);

-- FR-011: no máximo uma sessão ativa por estudante, garantido no banco
create unique index uq_sessions_active_per_profile
    on study_sessions (profile_id) where status = 'ACTIVE';

create index idx_sessions_profile on study_sessions (profile_id);

create table session_questions (
    session_id  uuid not null references study_sessions (id) on delete cascade,
    position    int not null,
    question_id uuid not null references questions (id),
    primary key (session_id, position),
    constraint uq_session_question unique (session_id, question_id)
);

create table answers (
    id          uuid primary key default gen_random_uuid(),
    session_id  uuid not null references study_sessions (id) on delete cascade,
    question_id uuid not null references questions (id),
    chosen      varchar(1) not null,
    correct     boolean not null,
    answered_at timestamptz not null default now(),
    -- FR-006/SC-002: contabilização única por questão da sessão
    constraint uq_answers_session_question unique (session_id, question_id),
    constraint ck_answers_chosen check (chosen in ('A','B','C','D','E'))
);

-- Não-repetição 30d: respostas corretas recentes do estudante
create index idx_answers_session on answers (session_id);
