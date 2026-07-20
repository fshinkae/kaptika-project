package com.kaptika.api.xp;

/**
 * Curva de níveis fixada na spec (FR-005): subir do nível N para o N+1
 * custa {@code 100 × N} XP. Logo o XP acumulado para atingir o nível N é
 * {@code 100 × (1 + 2 + ... + (N−1)) = 50 × N × (N−1)}:
 * nível 2 aos 100, 3 aos 300, 4 aos 600, 5 aos 1000...
 * Matemática pura, sem estado — o nível é sempre derivado do total (FR-008).
 */
public final class LevelCurve {

    private LevelCurve() {
    }

    /** XP acumulado necessário para atingir o nível informado (nível 1 = 0). */
    public static long thresholdFor(int level) {
        if (level < 1) {
            throw new IllegalArgumentException("Nível mínimo é 1");
        }
        return 50L * level * (level - 1);
    }

    /** Maior nível cujo limiar é coberto pelo XP total (saltos múltiplos inclusos — SC-004). */
    public static int levelFor(long xpTotal) {
        if (xpTotal < 0) {
            throw new IllegalArgumentException("XP não pode ser negativo");
        }
        // estimativa fechada de 50n(n−1) ≤ xp, ajustada nas bordas
        int level = Math.max(1, (int) ((1 + Math.sqrt(1 + xpTotal / 12.5)) / 2));
        while (thresholdFor(level + 1) <= xpTotal) {
            level++;
        }
        while (level > 1 && thresholdFor(level) > xpTotal) {
            level--;
        }
        return level;
    }

    /** XP restante para o próximo nível a partir do total atual (FR-006). */
    public static long xpToNextLevel(long xpTotal) {
        return thresholdFor(levelFor(xpTotal) + 1) - xpTotal;
    }
}
