package com.example.chat_app_project.controller;

import com.example.chat_app_project.dto.response.ConversationPreviewResponse;
import com.example.chat_app_project.dto.response.DirectMessageResponse;
import com.example.chat_app_project.dto.response.OpenDirectChatResponse;
import com.example.chat_app_project.service.DirectMessageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/dm")
@RequiredArgsConstructor
@Validated
@Tag(name = "Direct Messaging", description = "Endpoints for 1-to-1 direct messaging and conversations")
public class DirectMessageController {

    private final DirectMessageService directMessageService;

    @Operation(summary = "Open Conversation", description = "Open or initialize a 1-to-1 conversation with a peer")
    @GetMapping("/conversation")
    public ResponseEntity<OpenDirectChatResponse> openConversation(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam @NotBlank String peerUsername
    ) {
        return ResponseEntity.ok(directMessageService.openConversation(principal.getUsername(), peerUsername));
    }

    @Operation(summary = "List Messages", description = "Retrieve a list of historical messages with a specific peer")
    @GetMapping("/messages")
    public ResponseEntity<List<DirectMessageResponse>> list(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam @NotBlank String peerUsername,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) UUID beforeMessageId
    ) {
        return ResponseEntity.ok(
                directMessageService.listMessages(principal.getUsername(), peerUsername, limit, beforeMessageId)
        );
    }

    @Operation(summary = "Get Recent Conversations", description = "Retrieve a list of recent direct conversations for the authenticated user")
    @GetMapping("/recent-conversations")
    public ResponseEntity<List<ConversationPreviewResponse>> getRecentConversations(
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(directMessageService.getRecentConversations(principal.getUsername()));
    }
}
