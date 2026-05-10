package com.example.chat_app_project.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_conversations", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "peer_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "peer_id", nullable = false)
    private User peer;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "last_message_preview")
    private String lastMessagePreview;

    @Column(name = "last_updated", nullable = false)
    private Instant lastUpdated;

    @Column(name = "unread_count")
    private int unreadCount;
}
