package com.okututor.backend.tutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TutorProfileRepository extends JpaRepository<TutorProfile, UUID> {

    Optional<TutorProfile> findByUserId(UUID userId);
    Optional<TutorProfile> findBySlug(String slug);
    boolean existsBySlug(String slug);
    boolean existsByUserId(UUID userId);
    long countByStatus(TutorProfileStatus status);

    @Query("select t from TutorProfile t left join fetch t.city left join fetch t.district where t.id = :id")
    Optional<TutorProfile> findByIdWithLocation(@Param("id") UUID id);

    @Query("select t from TutorProfile t left join fetch t.city left join fetch t.district where t.slug = :slug")
    Optional<TutorProfile> findBySlugWithLocation(@Param("slug") String slug);

    @Query("""
            select t from TutorProfile t
            left join fetch t.city
            left join fetch t.district
            where t.status = :status
            order by t.publishedAt desc nulls last, t.createdAt desc
            """)
    Page<TutorProfile> findByStatusOrderByPublishedAtDesc(@Param("status") TutorProfileStatus status, Pageable pageable);

    @Query("""
            select t from TutorProfile t
            join t.user u
            left join fetch t.city
            left join fetch t.district
            where t.status = :status and u.blocked = false
            order by t.publishedAt desc nulls last, t.createdAt desc
            """)
    Page<TutorProfile> findPublishedExcludingBlocked(@Param("status") TutorProfileStatus status, Pageable pageable);

    // Filtered listing (published only) with hard filters — excludes blocked tutors
    @Query("""
            select distinct t from TutorProfile t
            left join fetch t.city
            left join fetch t.district
            join t.user u
            where t.status = 'PUBLISHED' and u.blocked = false
              and (:tutorType is null or t.tutorType = :tutorType)
              and (:cityId is null or t.city.id = :cityId)
              and (:districtId is null or t.district.id = :districtId)
              and (:online is null or t.online = :online)
              and (:offline is null or t.offline = :offline)
              and (:priceFrom is null or t.priceFrom >= :priceFrom or t.priceTo >= :priceFrom)
              and (:priceTo is null or t.priceTo <= :priceTo or t.priceFrom <= :priceTo)
            """)
    Page<TutorProfile> findPublishedWithFilters(@Param("tutorType") TutorType tutorType,
                                                @Param("cityId") UUID cityId,
                                                @Param("districtId") UUID districtId,
                                                @Param("online") Boolean online,
                                                @Param("offline") Boolean offline,
                                                @Param("priceFrom") java.math.BigDecimal priceFrom,
                                                @Param("priceTo") java.math.BigDecimal priceTo,
                                                Pageable pageable);

    @Modifying
    @Query("update TutorProfile t set t.viewsCount = t.viewsCount + 1 where t.id = :id")
    int incrementViews(@Param("id") UUID id);

    @Query("select t from TutorProfile t where t.status = 'PUBLISHED' and t.noindex = false order by t.publishedAt desc")
    List<TutorProfile> findPublishedForSitemap();

    @Query("select t from TutorProfile t left join fetch t.city left join fetch t.district where t.id in :ids")
    List<TutorProfile> findAllWithLocationByIdIn(@Param("ids") java.util.Collection<UUID> ids);

    // Candidate search projection (FTS ru/en + trgm + synonym regex) — порта CourseRepository.searchCandidates
    @Query(value = """
            SELECT tp.id AS id,
                   tp.slug AS slug,
                   tp.first_name AS firstName,
                   tp.last_name AS lastName,
                   tp.title AS title,
                   tp.short_description AS shortDescription,
                   tp.about AS about,
                   tp.tutor_type AS tutorType,
                   tp.price_from AS priceFrom,
                   tp.price_to AS priceTo,
                   tp.currency AS currency,
                   tp.online AS online,
                   tp.offline AS offline,
                   tp.views_count AS viewsCount,
                   tp.published_at AS publishedAt,
                   c.slug AS citySlug,
                   c.name_ru AS cityName,
                   GREATEST(
                       COALESCE(ts_rank_cd(tp.search_vector_ru, to_tsquery('russian', :qFts)), 0),
                       COALESCE(ts_rank_cd(tp.search_vector, to_tsquery('english', :qFts)), 0)
                   ) AS textScore,
                   GREATEST(
                       COALESCE(similarity(lower(tp.title), lower(:qTrgm)), 0),
                       COALESCE(word_similarity(lower(:qTrgm), lower(tp.title)), 0),
                       COALESCE(similarity(lower(tp.about), lower(:qTrgm)), 0)
                   ) AS trgmScore,
                   (CASE WHEN lower(tp.title) = lower(:qExact) THEN 1 ELSE 0 END) AS exactMatch
            FROM tutor_profiles tp
             LEFT JOIN cities c ON c.id = tp.city_id
             JOIN users u ON u.id = tp.user_id
             WHERE tp.status = 'PUBLISHED' AND u.blocked = false
               AND (:cityId IS NULL OR tp.city_id = :cityId)
               AND (:tutorType IS NULL OR tp.tutor_type = :tutorType)
               AND (:online IS NULL OR tp.online = :online)
               AND (:offline IS NULL OR tp.offline = :offline)
               AND (
                   :hasText = FALSE
                   OR (:qFts IS NOT NULL AND (tp.search_vector_ru @@ to_tsquery('russian', :qFts) OR tp.search_vector @@ to_tsquery('english', :qFts)))
                   OR (:qTrgm IS NOT NULL AND (lower(tp.title) % lower(:qTrgm) OR lower(:qTrgm) %> lower(tp.title) OR lower(tp.about) % lower(:qTrgm)))
                   OR (:qSyn IS NOT NULL AND (lower(tp.title) ~ :qSyn OR lower(tp.about) ~ :qSyn OR lower(tp.short_description) ~ :qSyn))
               )
             ORDER BY textScore DESC, trgmScore DESC, exactMatch DESC, tp.published_at DESC NULLS LAST, tp.id DESC
             LIMIT :candidateLimit
             """, nativeQuery = true)
     List<TutorSearchProjection> searchCandidates(@Param("qFts") String qFts,
                                                 @Param("qTrgm") String qTrgm,
                                                 @Param("qSyn") String qSyn,
                                                 @Param("qExact") String qExact,
                                                 @Param("hasText") boolean hasText,
                                                 @Param("cityId") UUID cityId,
                                                 @Param("tutorType") String tutorType,
                                                 @Param("online") Boolean online,
                                                 @Param("offline") Boolean offline,
                                                 @Param("candidateLimit") int candidateLimit);

     @Query(value = """
             SELECT count(*)
             FROM tutor_profiles tp
             JOIN users u ON u.id = tp.user_id
             WHERE tp.status = 'PUBLISHED' AND u.blocked = false
               AND (:cityId IS NULL OR tp.city_id = :cityId)
               AND (:tutorType IS NULL OR tp.tutor_type = :tutorType)
               AND (:online IS NULL OR tp.online = :online)
               AND (:offline IS NULL OR tp.offline = :offline)
               AND (
                   :hasText = FALSE
                   OR (:qFts IS NOT NULL AND (tp.search_vector_ru @@ to_tsquery('russian', :qFts) OR tp.search_vector @@ to_tsquery('english', :qFts)))
                   OR (:qTrgm IS NOT NULL AND (lower(tp.title) % lower(:qTrgm) OR lower(:qTrgm) %> lower(tp.title) OR lower(tp.about) % lower(:qTrgm)))
                   OR (:qSyn IS NOT NULL AND (lower(tp.title) ~ :qSyn OR lower(tp.about) ~ :qSyn OR lower(tp.short_description) ~ :qSyn))
               )
            """, nativeQuery = true)
    long countCandidates(@Param("qFts") String qFts,
                         @Param("qTrgm") String qTrgm,
                         @Param("qSyn") String qSyn,
                         @Param("hasText") boolean hasText,
                         @Param("cityId") UUID cityId,
                         @Param("tutorType") String tutorType,
                         @Param("online") Boolean online,
                         @Param("offline") Boolean offline);
}
