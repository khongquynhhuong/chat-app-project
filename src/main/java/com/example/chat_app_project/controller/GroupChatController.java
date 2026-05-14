package com.example.chat_app_project.controller;

import com.example.chat_app_project.dto.request.AddGroupMembersRequest;
import com.example.chat_app_project.dto.request.CreateGroupRequest;
import com.example.chat_app_project.dto.request.UpdateGroupRequest;
import com.example.chat_app_project.dto.response.GroupConversationPreviewResponse;
import com.example.chat_app_project.dto.response.GroupInfoResponse;
import com.example.chat_app_project.dto.response.GroupMessageResponse;
import com.example.chat_app_project.service.GroupChatService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Validated
public class GroupChatController {
    private final GroupChatService groupChatService;

    @PostMapping
    public ResponseEntity<GroupInfoResponse> createGroup(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody CreateGroupRequest request
    ) {
        return ResponseEntity.ok(groupChatService.createGroup(principal.getUsername(), request));
    }

    @PatchMapping("/{groupId}")
    public ResponseEntity<GroupInfoResponse> renameGroup(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId,
            @Valid @RequestBody UpdateGroupRequest request
    ) {
        return ResponseEntity.ok(groupChatService.renameGroup(principal.getUsername(), groupId, request));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId
    ) {
        groupChatService.deleteGroup(principal.getUsername(), groupId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/recent-conversations")
    public ResponseEntity<List<GroupConversationPreviewResponse>> getRecentConversations(
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(groupChatService.getRecentConversations(principal.getUsername()));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupInfoResponse> getGroup(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId
    ) {
        return ResponseEntity.ok(groupChatService.getGroup(principal.getUsername(), groupId));
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupInfoResponse> addMembers(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId,
            @Valid @RequestBody AddGroupMembersRequest request
    ) {
        return ResponseEntity.ok(groupChatService.addMembers(principal.getUsername(), groupId, request));
    }

    @DeleteMapping("/{groupId}/members/{memberUserId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId,
            @PathVariable Long memberUserId
    ) {
        groupChatService.removeMember(principal.getUsername(), groupId, memberUserId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/leave")
    public ResponseEntity<Void> leaveGroup(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId
    ) {
        groupChatService.leaveGroup(principal.getUsername(), groupId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{groupId}/messages")
    public ResponseEntity<List<GroupMessageResponse>> listMessages(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) UUID beforeMessageId
    ) {
        return ResponseEntity.ok(groupChatService.listMessages(principal.getUsername(), groupId, limit, beforeMessageId));
    }
}
