package com.kaptika.api.profile;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    Optional<Profile> findBySupabaseId(UUID supabaseId);

    /**
     * Provisionamento idempotente + último acesso em uma única instrução
     * atômica (FR-004, FR-009, SC-003): cria o perfil no primeiro acesso;
     * nos demais, apenas atualiza last_access_at. A chave única
     * uq_profiles_supabase_id impede duplicação sob concorrência.
     */
    @Modifying
    @Query(value = """
            insert into profiles (supabase_id, display_name)
            values (:supabaseId, :displayName)
            on conflict (supabase_id) do update set last_access_at = now()
            """, nativeQuery = true)
    void upsertProvisioning(@Param("supabaseId") UUID supabaseId,
            @Param("displayName") String displayName);
}
