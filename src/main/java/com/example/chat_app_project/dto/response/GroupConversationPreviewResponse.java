package com.example.chat_app_project.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupConversationPreviewResponse {
    private Long groupId;
    private String title;
    private String lastMessage;
    private Instant lastAt;
    private int unread;
    private int memberCount;
}
