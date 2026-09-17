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

    @Query("select t from TutorProfile t join fetch t.user left join fetch t.city left join fetch t.district where t.id = :id")
    Optional<TutorProfile> findByIdWithLocation(@Param("id") UUID id);

    @Query("select t from TutorProfile t join fetch t.user left join fetch t.city left join fetch t.district where t.slug = :slug")
    Optional<TutorProfile> findBySlugWithLocation(@Param("slug") String slug);

    @Query("""
            select t from TutorProfile t
            join fetch t.user
            left join fetch t.city
            left join fetch t.district
            where t.status = :status
            order by t.publishedAt desc nulls last, t.createdAt desc
            """)
    Page<TutorProfile> findByStatusOrderByPublishedAtDesc(@Param("status") TutorProfileStatus status, Pageable pageable);

    @Query("""
            select t from TutorProfile t
            join fetch t.user
            left join fetch t.city
            left join fetch t.district
            where t.status in ('PUBLISHED','ACTIVE') and t.user.blocked = false
              and (t.expiresAt is null or t.expiresAt > current_timestamp)
            order by t.publishedAt desc nulls last, t.createdAt desc
            """)
    Page<TutorProfile> findPublishedExcludingBlocked(@Param("status") TutorProfileStatus status, Pageable pageable);

    // Filtered listing (published only) with hard filters — excludes blocked + expired tutors
    // ACTIVE is legacy alias for PUBLISHED (V53) — treat identically
    @Query("""
            select distinct t from TutorProfile t
            join fetch t.user
            left join fetch t.city
            left join fetch t.district
            where t.status in ('PUBLISHED','ACTIVE') and t.user.blocked = false
              and (t.expiresAt is null or t.expiresAt > current_timestamp)
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

    @Query("select t from TutorProfile t where t.status in ('PUBLISHED','ACTIVE') and t.noindex = false and (t.expiresAt is null or t.expiresAt > current_timestamp) order by t.publishedAt desc")
    List<TutorProfile> findPublishedForSitemap();

    @Query("select t from TutorProfile t join fetch t.user left join fetch t.city left join fetch t.district where t.id in :ids")
    List<TutorProfile> findAllWithLocationByIdIn(@Param("ids") java.util.Collection<UUID> ids);

    // Admin search: filters by status + ILIKE on name/title/slug at DB level (fixes in-memory pagination bug)
    @Query(value = """
            select t from TutorProfile t
            join fetch t.user
            left join fetch t.city
            left join fetch t.district
            where (:status is null or t.status = :status)
              and (:q is null or :q = '' or lower(t.firstName) like lower(concat('%', :q, '%'))
                  or lower(t.lastName) like lower(concat('%', :q, '%'))
                  or lower(t.title) like lower(concat('%', :q, '%'))
                  or lower(t.slug) like lower(concat('%', :q, '%')))
            order by t.publishedAt desc nulls last, t.createdAt desc
            """,
           countQuery = """
            select count(t) from TutorProfile t
            where (:status is null or t.status = :status)
              and (:q is null or :q = '' or lower(t.firstName) like lower(concat('%', :q, '%'))
                  or lower(t.lastName) like lower(concat('%', :q, '%'))
                  or lower(t.title) like lower(concat('%', :q, '%'))
                  or lower(t.slug) like lower(concat('%', :q, '%')))
            """)
    Page<TutorProfile> findByAdminFilter(@Param("status") TutorProfileStatus status, @Param("q") String q, Pageable pageable);

    // Expiry handling (Free MVP 30 days) — includes HIDDEN (hidden resumes must also expire) + legacy ACTIVE
    @Query("select t from TutorProfile t where t.status in ('PUBLISHED','HIDDEN','ACTIVE') and t.expiresAt is not null and t.expiresAt <= current_timestamp")
    List<TutorProfile> findExpired();

    // Legacy stacking repair: profiles whose expiry was pushed beyond publishedAt + 30 days by the old stacking renew bug
    @Query(value = """
            select * from tutor_profiles
            where status = 'PUBLISHED'
              and expires_at is not null
              and published_at is not null
              and expires_at > published_at + interval '30 days'
            """, nativeQuery = true)
    List<TutorProfile> findStackedExpiry();

    @Query("select t from TutorProfile t where t.status in ('PUBLISHED','ACTIVE') and t.expiresAt is not null and t.expiresAt > current_timestamp and t.expiresAt <= :threshold")
    List<TutorProfile> findExpiringSoon(@Param("threshold") java.time.Instant threshold);

    @Modifying(clearAutomatically = true)
    @Query("update TutorProfile t set t.status = 'EXPIRED' where t.status in ('PUBLISHED','HIDDEN','ACTIVE') and t.expiresAt is not null and t.expiresAt <= current_timestamp")
    int expireOldProfiles();

    @Query("select count(t) from TutorProfile t where t.status in ('PUBLISHED','ACTIVE') and (t.expiresAt is null or t.expiresAt > current_timestamp)")
    long countActive();

    @Query("select count(t) from TutorProfile t where t.status in ('PUBLISHED','ACTIVE') and t.expiresAt is not null and t.expiresAt > current_timestamp and t.expiresAt <= :threshold")
    long countExpiringSoon(@Param("threshold") java.time.Instant threshold);

    @Query("select count(t) from TutorProfile t where t.status = 'EXPIRED'")
    long countExpired();

    // Популярные репетиторы — для блока "Самые популярные репетиторы" на главной
    // Бизнес-логика: только PUBLISHED/ACTIVE, не заблокирован, не просрочен, не скрыт от индексации
    // Сортировка: просмотры → рейтинг → кол-во отзывов → дата публикации (свежие при равных метриках)
    @Query("""
            select t from TutorProfile t
            join fetch t.user
            left join fetch t.city
            left join fetch t.district
            where t.status in ('PUBLISHED','ACTIVE')
              and t.user.blocked = false
              and (t.expiresAt is null or t.expiresAt > current_timestamp)
              and t.noindex = false
            order by t.viewsCount desc, t.rating desc, t.reviewsCount desc, t.publishedAt desc nulls last
            """)
    List<TutorProfile> findPopular(Pageable pageable);

    // Candidate search projection (FTS ru/en + trgm + synonym regex) — порта CourseRepository.searchCandidates
    // P1: hard filters subject/level/language/district/price перенесены в SQL (recall не падает после LIMIT)
    // P2: sort теперь в SQL (глобальный порядок, не in-memory на 300)
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
              WHERE tp.status in ('PUBLISHED','ACTIVE') AND u.blocked = false
                AND (tp.expires_at IS NULL OR tp.expires_at > now())
                AND (:cityId IS NULL OR tp.city_id = :cityId)
                AND (:tutorType IS NULL OR tp.tutor_type = :tutorType)
                AND (:online IS NULL OR tp.online = :online)
                AND (:offline IS NULL OR tp.offline = :offline)
                AND (:subjectSlug IS NULL OR EXISTS (SELECT 1 FROM tutor_profile_subjects tps JOIN subjects s ON s.id = tps.subject_id WHERE tps.profile_id = tp.id AND lower(s.slug) = lower(:subjectSlug)))
                AND (:levelSlug IS NULL OR EXISTS (SELECT 1 FROM tutor_profile_levels tplv JOIN levels lv ON lv.id = tplv.level_id WHERE tplv.profile_id = tp.id AND lower(lv.slug) = lower(:levelSlug)))
                AND (:language IS NULL OR EXISTS (SELECT 1 FROM tutor_profile_languages tlang WHERE tlang.profile_id = tp.id AND lower(tlang.language) = lower(:language)))
                AND (:districtId IS NULL OR tp.district_id = :districtId)
                AND (:priceFrom IS NULL OR tp.price_to >= :priceFrom OR tp.price_from >= :priceFrom)
                AND (:priceTo IS NULL OR tp.price_from <= :priceTo OR tp.price_to <= :priceTo)
                AND (
                    :hasText = FALSE
                    OR (:qFts IS NOT NULL AND (tp.search_vector_ru @@ to_tsquery('russian', :qFts) OR tp.search_vector @@ to_tsquery('english', :qFts)))
                    OR (:qTrgm IS NOT NULL AND (lower(tp.title) % lower(:qTrgm) OR lower(:qTrgm) %> lower(tp.title) OR lower(tp.about) % lower(:qTrgm)))
                    OR (:qSyn IS NOT NULL AND (lower(tp.title) ~ :qSyn OR lower(tp.about) ~ :qSyn OR lower(tp.short_description) ~ :qSyn))
                )
              ORDER BY
                CASE WHEN :sort = 'price_asc' THEN tp.price_from END ASC NULLS LAST,
                CASE WHEN :sort = 'price_desc' THEN tp.price_from END DESC NULLS LAST,
                CASE WHEN :sort = 'views_desc' THEN tp.views_count END DESC,
                CASE WHEN :sort = 'views_asc' THEN tp.views_count END ASC,
                CASE WHEN :sort = 'published_asc' THEN tp.published_at END ASC NULLS LAST,
                CASE WHEN :sort IN ('published','published_desc') THEN tp.published_at END DESC NULLS LAST,
                textScore DESC, trgmScore DESC, exactMatch DESC, tp.published_at DESC NULLS LAST, tp.id DESC
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
                                                 @Param("subjectSlug") String subjectSlug,
                                                 @Param("levelSlug") String levelSlug,
                                                 @Param("language") String language,
                                                 @Param("districtId") UUID districtId,
                                                 @Param("priceFrom") java.math.BigDecimal priceFrom,
                                                 @Param("priceTo") java.math.BigDecimal priceTo,
                                                 @Param("sort") String sort,
                                                 @Param("candidateLimit") int candidateLimit);

      @Query(value = """
              SELECT count(*)
              FROM tutor_profiles tp
              JOIN users u ON u.id = tp.user_id
              WHERE tp.status in ('PUBLISHED','ACTIVE') AND u.blocked = false
                AND (tp.expires_at IS NULL OR tp.expires_at > now())
                AND (:cityId IS NULL OR tp.city_id = :cityId)
                AND (:tutorType IS NULL OR tp.tutor_type = :tutorType)
                AND (:online IS NULL OR tp.online = :online)
                AND (:offline IS NULL OR tp.offline = :offline)
                AND (:subjectSlug IS NULL OR EXISTS (SELECT 1 FROM tutor_profile_subjects tps JOIN subjects s ON s.id = tps.subject_id WHERE tps.profile_id = tp.id AND lower(s.slug) = lower(:subjectSlug)))
                AND (:levelSlug IS NULL OR EXISTS (SELECT 1 FROM tutor_profile_levels tplv JOIN levels lv ON lv.id = tplv.level_id WHERE tplv.profile_id = tp.id AND lower(lv.slug) = lower(:levelSlug)))
                AND (:language IS NULL OR EXISTS (SELECT 1 FROM tutor_profile_languages tlang WHERE tlang.profile_id = tp.id AND lower(tlang.language) = lower(:language)))
                AND (:districtId IS NULL OR tp.district_id = :districtId)
                AND (:priceFrom IS NULL OR tp.price_to >= :priceFrom OR tp.price_from >= :priceFrom)
                AND (:priceTo IS NULL OR tp.price_from <= :priceTo OR tp.price_to <= :priceTo)
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
                         @Param("offline") Boolean offline,
                         @Param("subjectSlug") String subjectSlug,
                         @Param("levelSlug") String levelSlug,
                         @Param("language") String language,
                         @Param("districtId") UUID districtId,
                         @Param("priceFrom") java.math.BigDecimal priceFrom,
                         @Param("priceTo") java.math.BigDecimal priceTo);
}
