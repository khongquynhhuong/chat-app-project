package com.example.chat_app_project.controller;

import com.example.chat_app_project.dto.request.LoginRequest;
import com.example.chat_app_project.dto.request.UserRegisterRequest;
import com.example.chat_app_project.dto.response.AuthResponse;
import com.example.chat_app_project.dto.response.UserRegisterResponse;
import com.example.chat_app_project.service.AuthService;
import com.example.chat_app_project.service.UserRegisterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserRegisterService userService;
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<UserRegisterResponse> register(@Valid @RequestBody UserRegisterRequest request) {
        return ResponseEntity.ok(userService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
