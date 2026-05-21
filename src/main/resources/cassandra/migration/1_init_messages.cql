-- Bảng 1: ChatMessage (1-to-1)
CREATE TABLE IF NOT EXISTS messages (
    conversation_id UUID,
    message_id TIMEUUID,
    sender_id BIGINT,
    content TEXT,
    message_type INT,
    created_at TIMESTAMP,
    delivery_status INT,
    PRIMARY KEY ((conversation_id), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- Bảng 2: GroupChatMessage (Group - Fan-out)
CREATE TABLE IF NOT EXISTS group_chat_messages (
    user_id BIGINT,
    group_id BIGINT,
    message_id TIMEUUID,
    sender_id BIGINT,
    content TEXT,
    message_type INT,
    created_at TIMESTAMP,
    delivery_status INT,
    PRIMARY KEY ((user_id, group_id), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);
