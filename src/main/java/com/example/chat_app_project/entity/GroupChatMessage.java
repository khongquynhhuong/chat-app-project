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

@Table("group_chat_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupChatMessage {

    @PrimaryKeyColumn(
            name = "user_id",
            ordinal = 0,
            type = PrimaryKeyType.PARTITIONED)
    private Long userId;

    @PrimaryKeyColumn(
            name = "group_id",
            ordinal = 1,
            type = PrimaryKeyType.PARTITIONED)
    private Long groupId;

    @PrimaryKeyColumn(
            name = "message_id",
            ordinal = 2,
            type = PrimaryKeyType.CLUSTERED,
            ordering = Ordering.DESCENDING)
    private UUID messageId; // Sử dụng TimeUUID

    @Column("sender_id")
    private Long senderId;

    @Column("content")
    private String content;

    @Column("message_type")
    private int messageType;

    @Column("created_at")
    private Instant createdAt;
    
    @Column("delivery_status")
    private int deliveryStatus;
}
