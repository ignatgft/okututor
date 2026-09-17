-- TG recipients for health alerts — SUPER_ADMIN управляет через /admin/telegram
CREATE TABLE IF NOT EXISTS tg_recipients (
    id uuid PRIMARY KEY,
    chat_id varchar(32) NOT NULL UNIQUE,
    username varchar(64),
    display_name varchar(100),
    is_active boolean NOT NULL DEFAULT true,
    notify_critical boolean NOT NULL DEFAULT true,
    notify_warning boolean NOT NULL DEFAULT false,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tg_recipients_active ON tg_recipients(is_active) WHERE is_active = true;
