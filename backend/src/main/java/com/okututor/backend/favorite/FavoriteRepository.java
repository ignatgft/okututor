package com.okututor.backend.favorite;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {
    Optional<Favorite> findByUserIdAndTutorProfileId(UUID userId, UUID tutorProfileId);
    List<Favorite> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("select f from Favorite f join fetch f.tutorProfile tp join fetch tp.user left join fetch tp.city left join fetch tp.district where f.user.id = :userId order by f.createdAt desc")
    List<Favorite> findByUserIdWithDetails(@Param("userId") UUID userId);

    boolean existsByUserIdAndTutorProfileId(UUID userId, UUID tutorProfileId);
    long countByTutorProfileId(UUID tutorProfileId);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserIdAndTutorProfileId(UUID userId, UUID tutorProfileId);

    @Query("select f.tutorProfile.id from Favorite f where f.user.id = :userId")
    List<UUID> findTutorProfileIdsByUserId(UUID userId);
}
