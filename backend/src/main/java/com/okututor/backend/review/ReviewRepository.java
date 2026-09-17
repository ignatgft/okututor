package com.okututor.backend.review;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    @Query(value = """
            select r from Review r
            join fetch r.student
            where r.courseId = :courseId and r.hidden = false
            order by r.createdAt desc
            """,
            countQuery = "select count(r) from Review r where r.courseId = :courseId and r.hidden = false")
    Page<Review> findByCourseIdAndHiddenFalseOrderByCreatedAtDesc(@Param("courseId") UUID courseId,
                                                                   Pageable pageable);

    @Query(value = """
            select r from Review r
            join fetch r.student
            order by r.createdAt desc
            """,
            countQuery = "select count(r) from Review r")
    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<Review> findByCourseIdAndStudentId(UUID courseId, UUID studentId);

    Optional<Review> findByIdAndStudentId(UUID id, UUID studentId);

    interface ReviewAggregate {
        Double getAvgRating();
        Long getCount();
    }

    @Query("""
            select avg(r.rating) as avgRating, count(r) as count
            from Review r where r.courseId = :courseId and r.hidden = false
            """)
    ReviewAggregate aggregateForCourse(@Param("courseId") UUID courseId);

    /** средняя оценка, поставленная студентом. */
    @Query("select coalesce(avg(r.rating), 0.0) from Review r where r.student.id = :studentId")
    double averageRatingGiven(@Param("studentId") UUID studentId);

    // legacy: отзывы привязывались к Course.teacher; после удаления Course метод оставлен как no-op
    default double averageRatingForTutor(UUID teacherId) {
        return 0.0;
    }
}
