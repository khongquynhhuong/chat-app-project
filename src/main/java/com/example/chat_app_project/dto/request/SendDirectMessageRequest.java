package com.example.chat_app_project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendDirectMessageRequest {

    @Size(max = 100)
    private String peerUsername;

    private Long groupId;

    @NotBlank
    @Size(max = 8000)
    private String content;

    /** 0=text, mở rộng sau (image, video...) */
    private int messageType;

    /** Id phía client để khớp tin optimistic với ACK WebSocket (tùy chọn). */
    @Size(max = 128)
    private String clientMessageId;
}
