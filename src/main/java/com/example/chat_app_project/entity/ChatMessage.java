package com.example.chat_app_project.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.cassandra.core.cql.Ordering;
import org.springframework.data.cassandra.core.cql.PrimaryKeyType;
import org.springframework.data.cassandra.core.mapping.Column;
import org.springframework.data.cassandra.core.mapping.PrimaryKeyColumn;
import org.springframework.data.cassandra.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Table("messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @PrimaryKeyColumn(
            name = "conversation_id",
            ordinal = 0,
            type = PrimaryKeyType.PARTITIONED)
    private UUID conversationId;

    @PrimaryKeyColumn(
            name = "message_id",
            ordinal = 1,
            type = PrimaryKeyType.CLUSTERED,
            ordering = Ordering.DESCENDING)
    private UUID messageId;

    @Column("sender_id")
    private Long senderId;

    @Column("content")
    private String content;

    @Column("message_type")
    private int messageType;

    @Column("created_at")
    private Instant createdAt;

    /** 0=SENT, 1=DELIVERED, 2=READ — {@link com.example.chat_app_project.dm.MessageDeliveryStatus} */
    @Column("delivery_status")
    @Builder.Default
    private int deliveryStatus = 0;
}
