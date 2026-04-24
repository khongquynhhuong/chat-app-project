package com.example.chat_app_project.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class OpenDirectChatResponse {
    private UUID conversationId;
    private String peerUsername;
}
