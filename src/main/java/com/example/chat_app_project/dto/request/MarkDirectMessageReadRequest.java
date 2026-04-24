package com.example.chat_app_project.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class MarkDirectMessageReadRequest {

    @NotBlank
    @Size(max = 100)
    private String peerUsername;

    @NotNull
    private UUID messageId;
}
