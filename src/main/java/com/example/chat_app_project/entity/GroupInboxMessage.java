package com.example.chat_app_project.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "group_inbox",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "group_id", "message_id"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupInboxMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private ChatGroup group;

    @Column(name = "message_id", nullable = false)
    private UUID messageId;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(nullable = false)
    private String content;

    @Column(name = "message_type", nullable = false)
    private int messageType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "delivery_status", nullable = false)
    private int deliveryStatus;
}
