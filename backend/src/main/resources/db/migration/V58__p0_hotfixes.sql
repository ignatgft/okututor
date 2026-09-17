-- P0 hotfixes: legacy ACTIVE cleanup, HIDDEN expiry index, performance indexes
-- 1. Legacy ACTIVE -> PUBLISHED (V53 already migrates, keep idempotent)
UPDATE tutor_profiles SET status = 'PUBLISHED' WHERE status = 'ACTIVE';

-- 2. Performance: active resumes by expires_at (used in (expires_at IS NULL OR > now()) filters)
CREATE INDEX IF NOT EXISTS idx_tutor_active_expires
  ON tutor_profiles(expires_at) WHERE status IN ('PUBLISHED','ACTIVE');

-- 3. Published listing sort (publishedAt DESC) with expiry filter (predicate must be IMMUTABLE, no now())
CREATE INDEX IF NOT EXISTS idx_tutor_published_at_cover
  ON tutor_profiles(published_at DESC, id DESC) WHERE status IN ('PUBLISHED','ACTIVE') AND expires_at IS NOT NULL;

-- 4. Users blocked partial (JOIN users ON blocked)
CREATE INDEX IF NOT EXISTS idx_users_blocked
  ON users(blocked) WHERE blocked = true;

-- 5. Price range composite for filtered listing
CREATE INDEX IF NOT EXISTS idx_tutor_price_range
  ON tutor_profiles(price_from, price_to) WHERE status IN ('PUBLISHED','ACTIVE');

-- 6. Notifications dedup (entity_type, entity_id, type)
CREATE INDEX IF NOT EXISTS idx_notifications_entity_type
  ON notifications(entity_type, entity_id, type) WHERE entity_type IS NOT NULL;

-- 7. Booking interval overlap helper
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_start_end
  ON bookings(teacher_id, start_at, end_at) WHERE status IN ('PENDING','CONFIRMED','RESCHEDULED');
CREATE INDEX IF NOT EXISTS idx_bookings_student_start_end
  ON bookings(student_id, start_at, end_at) WHERE status IN ('PENDING','CONFIRMED','RESCHEDULED');
