package com.kaptika.api.profile.progress;

import java.util.UUID;

/**
 * Ponto de extensão para os agregados do perfil (FR-005): as features
 * 003 (XP/nível), 004 (ofensiva) e 005 (medalhas) fornecem a implementação
 * real sem alterar o contrato de GET /me.
 */
public interface ProgressSummaryProvider {

    ProgressSummary summaryFor(UUID profileId);
}
