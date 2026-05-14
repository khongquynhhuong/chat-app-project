CREATE TABLE chat_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id BIGINT NOT NULL,
    conversation_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    member_limit INT NOT NULL DEFAULT 100,
    CONSTRAINT fk_group_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE chat_group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMP NOT NULL,
    left_at TIMESTAMP NULL,
    CONSTRAINT uc_group_member UNIQUE(group_id, user_id),
    CONSTRAINT fk_group_member_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_member_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE group_conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    conversation_id UUID NOT NULL,
    last_message_preview VARCHAR(255),
    last_updated TIMESTAMP NOT NULL,
    unread_count INT NOT NULL DEFAULT 0,
    CONSTRAINT uc_group_conv UNIQUE(user_id, group_id),
    CONSTRAINT fk_group_conv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_conv_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE
);

CREATE TABLE group_inbox (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    message_id UUID NOT NULL,
    conversation_id UUID NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    message_type INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    delivery_status INT NOT NULL DEFAULT 0,
    CONSTRAINT uc_group_inbox_message UNIQUE(user_id, group_id, message_id),
    CONSTRAINT fk_group_inbox_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_inbox_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE
);

CREATE TABLE group_message_reads (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    message_id UUID NOT NULL,
    user_id BIGINT NOT NULL,
    read_at TIMESTAMP NOT NULL,
    CONSTRAINT uc_group_message_read UNIQUE(group_id, message_id, user_id),
    CONSTRAINT fk_group_read_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_read_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_group_members_group_active ON chat_group_members(group_id, left_at);
CREATE INDEX idx_group_members_user_active ON chat_group_members(user_id, left_at);
CREATE INDEX idx_group_conversations_user_updated ON group_conversations(user_id, last_updated DESC);
CREATE INDEX idx_group_inbox_lookup ON group_inbox(user_id, group_id, created_at DESC);
CREATE INDEX idx_group_reads_lookup ON group_message_reads(group_id, message_id, read_at ASC);
