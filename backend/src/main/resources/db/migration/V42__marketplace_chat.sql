-- Marketplace chat: TutorRequest -> Conversation -> Participants -> Messages
-- Isolated from legacy messaging (conversations/messages) to preserve baseline
-- Naming: chat_conversations, chat_participants, chat_messages (snake_case, uuid, timestamptz)

CREATE TABLE chat_conversations (
    id              uuid PRIMARY KEY,
    request_id      uuid NOT NULL UNIQUE REFERENCES tutor_requests(id) ON DELETE CASCADE,
    status          varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED')),
    last_message    text,
    last_message_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_conversations_request ON chat_conversations(request_id);

CREATE TABLE chat_participants (
    id              uuid PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX idx_chat_participants_conversation ON chat_participants(conversation_id);

CREATE TABLE chat_messages (
    id              uuid PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body            text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
    read_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_conversation_created ON chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
-- index for unread count per user (participant)
CREATE INDEX idx_chat_messages_unread ON chat_messages(conversation_id, read_at) WHERE read_at IS NULL;
