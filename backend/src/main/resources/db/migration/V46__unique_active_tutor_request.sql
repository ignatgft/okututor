-- Защита от дублей при concurrent POST /conversations/direct (два запроса A+B одновременно)
-- Один студент → один активный запрос к одному профилю
CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_request_active
    ON tutor_requests (tutor_profile_id, student_user_id)
    WHERE student_user_id IS NOT NULL
      AND status IN ('NEW','VIEWED','CONTACTED');
