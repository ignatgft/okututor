-- Marketplace unified model: USER + ADMIN (Tutor/Student -> USER)
-- Safe incremental migration: preserve users, IDs, FKs; only role values changed
-- Keep SUPER_ADMIN as ADMIN alias for backward compatibility (admin checks use ADMIN||SUPER_ADMIN)

-- Drop old check to allow transition
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;

-- Log counts for safety (DO NOT fail migration if table empty)
-- Convert legacy marketplace roles to USER
UPDATE users SET role = 'USER' WHERE role IN ('STUDENT', 'TUTOR', 'TEACHER');

-- SUPER_ADMIN preserved as is (admin checks use ADMIN||SUPER_ADMIN); marketplace unified model treats SUPER_ADMIN as ADMIN via Role.normalized()
-- No update for SUPER_ADMIN to keep super admin distinction; final code uses USER/ADMIN but DB allows SUPER_ADMIN for backward compat

-- Recreate constraint for final model: USER, ADMIN (allow legacy aliases for backward JWT compatibility)
-- Include legacy values to avoid breaking old tokens still carrying STUDENT/TUTOR during rolling deploy
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('USER','ADMIN','SUPER_ADMIN','STUDENT','TUTOR','TEACHER'));

-- Data safety checks (informational, not failing)
-- SELECT count(*) as total_users FROM users;
-- SELECT role, count(*) FROM users GROUP BY role;
