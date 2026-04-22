package com.example.chat_app_project.controller;

import com.example.chat_app_project.dto.request.MarkDirectMessageReadRequest;
import com.example.chat_app_project.dto.response.DirectMessageResponse;
import com.example.chat_app_project.dto.response.OpenDirectChatResponse;
import com.example.chat_app_project.service.DirectMessageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
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

@RestController
@RequestMapping("/api/dm")
@RequiredArgsConstructor
@Validated
public class DirectMessageController {

    private final DirectMessageService directMessageService;

    @GetMapping("/conversation")
    public ResponseEntity<OpenDirectChatResponse> openConversation(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam @Positive Long peerUserId
    ) {
        return ResponseEntity.ok(directMessageService.openConversation(principal.getUsername(), peerUserId));
    }

    @GetMapping("/messages")
    public ResponseEntity<List<DirectMessageResponse>> list(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam @Positive Long peerUserId,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) UUID beforeMessageId
    ) {
        return ResponseEntity.ok(
                directMessageService.listMessages(principal.getUsername(), peerUserId, limit, beforeMessageId)
        );
    }

    @PostMapping("/messages/read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody MarkDirectMessageReadRequest request
    ) {
        directMessageService.markRead(principal.getUsername(), request);
        return ResponseEntity.noContent().build();
    }
}
