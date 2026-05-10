CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE
);

CREATE TABLE "user-roles" (
    user_id BIGINT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE user_conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    peer_id BIGINT NOT NULL,
    conversation_id UUID NOT NULL,
    last_message_preview VARCHAR(255),
    last_updated TIMESTAMP NOT NULL,
    unread_count INT DEFAULT 0,
    CONSTRAINT uc_user_peer UNIQUE(user_id, peer_id),
    CONSTRAINT fk_uc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uc_peer FOREIGN KEY (peer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_last_updated ON user_conversations(user_id, last_updated DESC);
