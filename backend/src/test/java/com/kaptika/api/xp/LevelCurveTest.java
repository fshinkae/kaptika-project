package com.kaptika.api.xp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * FR-005/SC-004 — curva fixada na spec: subir de N para N+1 custa 100×N XP
 * (nível 2 aos 100, 3 aos 300, 4 aos 600, 5 aos 1000...).
 */
class LevelCurveTest {

    @ParameterizedTest(name = "nível {0} exige {1} XP acumulado")
    @CsvSource({"1,0", "2,100", "3,300", "4,600", "5,1000", "6,1500", "10,4500"})
    @DisplayName("limiares acumulados seguem 50·N·(N−1)")
    void thresholds(int level, long expected) {
        assertThat(LevelCurve.thresholdFor(level)).isEqualTo(expected);
    }

    @ParameterizedTest(name = "{0} XP → nível {1}")
    @CsvSource({"0,1", "10,1", "99,1", "100,2", "299,2", "300,3", "599,3", "600,4",
            "999,4", "1000,5", "4500,10", "1000000,141"})
    @DisplayName("nível é o maior cujo limiar é coberto pelo total (bordas exatas incluídas)")
    void levels(long xp, int expected) {
        assertThat(LevelCurve.levelFor(xp)).isEqualTo(expected);
    }

    @Test
    @DisplayName("salto de múltiplos níveis num único total (SC-004)")
    void multiLevelJump() {
        // de 0 direto a 650 XP: cruza os limiares 100, 300 e 600 de uma vez
        assertThat(LevelCurve.levelFor(650)).isEqualTo(4);
        assertThat(LevelCurve.xpToNextLevel(650)).isEqualTo(350); // 1000 − 650
    }

    @ParameterizedTest(name = "{0} XP → faltam {1} para o próximo nível")
    @CsvSource({"0,100", "40,60", "100,200", "250,50", "300,300", "600,400", "1000,500"})
    @DisplayName("XP restante para o próximo nível (FR-006)")
    void xpToNext(long xp, long expected) {
        assertThat(LevelCurve.xpToNextLevel(xp)).isEqualTo(expected);
    }

    @Test
    @DisplayName("entradas inválidas são rejeitadas")
    void invalidInputs() {
        assertThatThrownBy(() -> LevelCurve.thresholdFor(0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> LevelCurve.levelFor(-1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
