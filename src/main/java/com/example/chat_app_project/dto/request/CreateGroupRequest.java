package com.example.chat_app_project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRequest {
    @NotBlank
    @Size(max = 255)
    private String name;

    @Size(max = 99)
    private List<@NotBlank @Size(max = 100) String> memberUsernames;
}
