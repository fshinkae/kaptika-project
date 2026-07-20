package com.kaptika.api.session;

import com.kaptika.api.common.InvalidRequestDataException;

/** Áreas de conhecimento do ENEM, com o slug usado pela enem.dev. */
public enum Area {

    LINGUAGENS("linguagens"),
    CIENCIAS_HUMANAS("ciencias-humanas"),
    CIENCIAS_NATUREZA("ciencias-natureza"),
    MATEMATICA("matematica");

    private final String slug;

    Area(String slug) {
        this.slug = slug;
    }

    public String slug() {
        return slug;
    }

    /** Aceita o slug (preferido) ou o nome do enum; inválido → 422. */
    public static Area parse(String raw) {
        if (raw != null) {
            for (Area area : values()) {
                if (area.slug.equalsIgnoreCase(raw) || area.name().equalsIgnoreCase(raw)) {
                    return area;
                }
            }
        }
        throw new InvalidRequestDataException(
                "area: valor inválido — use linguagens, ciencias-humanas, ciencias-natureza ou matematica");
    }
}
