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

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for user registration and login")
public class AuthController {
    private final UserRegisterService userService;
    private final AuthService authService;

    @Operation(summary = "User Registration", description = "Register a new user")
    @PostMapping("/register")
    public ResponseEntity<UserRegisterResponse> register(@Valid @RequestBody UserRegisterRequest request) {
        return ResponseEntity.ok(userService.register(request));
    }

    @Operation(summary = "User Login", description = "Authenticate a user and return JWT token")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
