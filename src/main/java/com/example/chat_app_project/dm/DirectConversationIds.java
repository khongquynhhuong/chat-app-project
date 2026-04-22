package com.example.chat_app_project.dm;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Sinh {@code conversation_id} cố định cho hai user (1-1), không cần bảng mapping.
 * Cùng cặp user luôn cho một UUID — phù hợp partition key Cassandra {@code messages}.
 */
public final class DirectConversationIds {

    private DirectConversationIds() {
    }

    /**
     * Hai user luôn được sắp (min, max) để A-B và B-A cùng một cuộc hội thoại.
     */
    public static UUID forPair(long userId1, long userId2) {
        if (userId1 == userId2) {
            throw new IllegalArgumentException("Không có hội thoại 1-1 với chính mình");
        }
        long low = Math.min(userId1, userId2);
        long high = Math.max(userId1, userId2);
        String key = "dm:" + low + ":" + high;
        return UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8));
    }

    public static boolean isParticipant(long userId1, long userId2, UUID conversationId) {
        return forPair(userId1, userId2).equals(conversationId);
    }
}
