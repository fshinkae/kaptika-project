package com.kaptika.api.session.source;

import com.kaptika.api.session.Area;
import java.util.List;

/**
 * Questão consultada ao vivo na enem.dev — valor TRANSITÓRIO, nunca
 * persistido. Carrega o gabarito ({@code correctAlternative}) apenas em
 * memória para a correção server-side; o banco só guarda referência
 * ({@code sourceId}/ano/índice) e o resultado do estudante.
 */
public record SourcedQuestion(
        String sourceId,
        Area area,
        String statement,
        String context,
        String correctAlternative,
        int originYear,
        int index,
        List<Alternative> alternatives) {

    public record Alternative(String letter, String text) {
    }
}
