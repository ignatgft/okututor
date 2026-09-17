-- Clamp existing experience_years that violate check constraint (0..80)
UPDATE tutor_profiles SET experience_years = 80 WHERE experience_years > 80;
UPDATE tutor_profiles SET experience_years = 0 WHERE experience_years < 0;
UPDATE tutor_applications SET experience_years = 80 WHERE experience_years > 80;
UPDATE tutor_applications SET experience_years = 0 WHERE experience_years < 0;
UPDATE users SET experience_years = 80 WHERE experience_years > 80;
UPDATE users SET experience_years = 0 WHERE experience_years < 0;
