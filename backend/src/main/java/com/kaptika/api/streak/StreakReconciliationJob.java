package com.kaptika.api.streak;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Verificação temporal periódica (FR-006/SC-002): logo após a virada do dia
 * no fuso da ofensiva, marca quebras (ou consome freezes) de estudantes
 * inativos — a quebra não depende de o estudante voltar a acessar.
 */
@Component
public class StreakReconciliationJob {

    private final StreakReconciliationService reconciliation;

    public StreakReconciliationJob(StreakReconciliationService reconciliation) {
        this.reconciliation = reconciliation;
    }

    @Scheduled(cron = "${kaptika.streak.reconcile-cron:0 10 0 * * *}",
            zone = "${kaptika.streak.zone:America/Sao_Paulo}")
    public void run() {
        reconciliation.reconcileAll();
    }
}
