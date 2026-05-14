package com.example.chat_app_project.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class GroupInfoResponse {
    private Long groupId;
    private UUID conversationId;
    private String name;
    private String ownerUsername;
    private int memberCount;
    private List<String> members;
}
