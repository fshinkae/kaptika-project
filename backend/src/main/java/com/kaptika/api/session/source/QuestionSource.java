package com.kaptika.api.session.source;

import com.kaptika.api.session.Area;
import com.kaptika.api.session.Question;
import java.util.List;

/**
 * Porta para a fonte externa de questões (enem.dev). Isola o domínio do
 * formato/instabilidade da API externa (FR-003, FR-012).
 */
public interface QuestionSource {

    /**
     * Busca até {@code limit} questões normalizadas e válidas da área.
     * Pode retornar menos que o pedido (acervo/paginação da fonte).
     *
     * @throws QuestionSourceUnavailableException se a fonte falhar (timeout/erro)
     */
    List<Question> fetch(Area area, int limit);
}
