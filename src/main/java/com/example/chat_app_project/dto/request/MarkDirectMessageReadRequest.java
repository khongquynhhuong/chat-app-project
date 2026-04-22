package com.example.chat_app_project.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.UUID;

@Data
public class MarkDirectMessageReadRequest {

    @NotNull
    @Positive
    private Long peerUserId;

    @NotNull
    private UUID messageId;
}
