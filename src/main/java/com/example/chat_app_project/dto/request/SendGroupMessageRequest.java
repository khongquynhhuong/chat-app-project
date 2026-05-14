package com.example.chat_app_project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendGroupMessageRequest {
    @NotNull
    private Long groupId;

    @NotBlank
    @Size(max = 8000)
    private String content;

    private int messageType;

    @Size(max = 128)
    private String clientMessageId;
}
