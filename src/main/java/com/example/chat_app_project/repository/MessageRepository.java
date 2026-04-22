package com.example.chat_app_project.repository;

import com.example.chat_app_project.entity.ChatMessage;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.cassandra.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageRepository extends CassandraRepository<ChatMessage, UUID> {

    @Query("SELECT * FROM messages WHERE conversation_id = ?0 LIMIT ?1")
    List<ChatMessage> findRecentMessages(UUID conversationId, int limit);

    /** Tin cũ hơn {@code beforeMessageId} (infinite scroll: client gửi message_id nhỏ nhất đang hiển thị). */
    @Query("SELECT * FROM messages WHERE conversation_id = ?0 AND message_id < ?1 LIMIT ?2")
    List<ChatMessage> findMessagesBefore(UUID conversationId, UUID beforeMessageId, int limit);

    Optional<ChatMessage> findByConversationIdAndMessageId(UUID conversationId, UUID messageId);
}