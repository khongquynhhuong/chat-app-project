package com.example.chat_app_project.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Set;

@Data
@AllArgsConstructor
public class UserRegisterResponse {
    private Long id;
    private String username;
    private Set<String> roles;
}
