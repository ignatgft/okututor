-- Cleanup mock/demo data seeded by old SeedData/MarketplaceMockSeeder
-- Use simple deletes from users with CASCADE handling for dependent tables.
-- Idempotent and safe if columns/tables missing.

DO $$
BEGIN
    -- Delete mock tutors and students (CASCADE will clean tutor_profiles, courses, bookings, etc.)
    DELETE FROM users WHERE email LIKE 'mock.tutor%@test.com';
    DELETE FROM users WHERE email LIKE 'mock.student%@test.com';
    DELETE FROM users WHERE email IN (
        'tutor@test.com',
        'test@test.com',
        'dev.tutor@test.com',
        'dev.student@test.com',
        'dev.super@test.com',
        'dev.admin@test.com'
    );
EXCEPTION WHEN OTHERS THEN
    -- If any FK prevents delete, log and continue (don't fail migration)
    RAISE NOTICE 'V51 cleanup: %', SQLERRM;
END $$;
