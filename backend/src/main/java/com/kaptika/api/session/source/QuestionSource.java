package com.kaptika.api.session.source;

import com.kaptika.api.session.Area;
import java.util.List;
import java.util.Optional;

/**
 * Porta para a fonte externa de questões (enem.dev), usada APENAS como
 * consulta — nada é persistido. Isola o domínio do formato/instabilidade da
 * API externa (FR-003, FR-012).
 */
public interface QuestionSource {

    /**
     * Busca até {@code limit} questões válidas da área (paginando a prova).
     * Pode retornar menos que o pedido (acervo/paginação da fonte).
     *
     * @throws QuestionSourceUnavailableException se a fonte falhar (timeout/erro)
     */
    List<SourcedQuestion> fetch(Area area, int limit);

    /**
     * Consulta uma questão específica (ano + índice) para correção/retomada.
     * Vazio se a fonte não a encontrar (4xx); lança se a fonte falhar (5xx).
     */
    Optional<SourcedQuestion> find(int year, int index);
}
