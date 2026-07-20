-- Feature 006 — Placar de Líderes
-- Índice de apoio ao agregado semanal (soma de grants por perfil no período).
-- O ranking geral usa xp_balances (O(1) por estudante) + profiles.

create index idx_xp_grants_period on xp_grants (granted_at, profile_id);
