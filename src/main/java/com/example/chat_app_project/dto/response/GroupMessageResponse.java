package com.example.chat_app_project.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class GroupMessageResponse {
    private Long groupId;
    private UUID conversationId;
    private UUID messageId;
    private Long senderId;
    private String senderUsername;
    private String content;
    private int messageType;
    private Instant createdAt;
    private String deliveryStatus;
    private String clientMessageId;
}
