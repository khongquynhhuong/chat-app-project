package com.example.chat_app_project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateGroupRequest {
    @NotBlank
    @Size(max = 255)
    private String name;
}
