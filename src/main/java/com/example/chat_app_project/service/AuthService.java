package com.example.chat_app_project.service;

import com.example.chat_app_project.dto.request.LoginRequest;
import com.example.chat_app_project.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);
}
