package com.example.chat_app_project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendDirectMessageRequest {

    @NotNull
    @Positive
    private Long peerUserId;

    @NotBlank
    @Size(max = 8000)
    private String content;

    /** 0=text, mở rộng sau (image, video...) */
    private int messageType;
}
