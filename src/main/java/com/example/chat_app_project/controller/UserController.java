package com.example.chat_app_project.controller;

import com.example.chat_app_project.dto.response.UserSearchResponse;
import com.example.chat_app_project.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Endpoints for user search and management")
public class UserController {
    private final UserService userService;

    @Operation(summary = "Search Users", description = "Search for users by username or name")
    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResponse>> searchUsers (
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam String q
    )
    {
        List <UserSearchResponse> responses = userService.searchUsers(q, principal.getUsername());
        return ResponseEntity.ok (responses);
    }

}
