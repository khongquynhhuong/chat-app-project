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

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Validated
@Tag(name = "Group Chat", description = "Endpoints for managing group chats and messages")
public class GroupChatController {
    private final GroupChatService groupChatService;

    @Operation(summary = "Create Group", description = "Create a new group chat")
    @PostMapping
    public ResponseEntity<GroupInfoResponse> createGroup(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody CreateGroupRequest request
    ) {
        return ResponseEntity.ok(groupChatService.createGroup(principal.getUsername(), request));
    }

    @Operation(summary = "Rename Group", description = "Rename an existing group chat")
    @PatchMapping("/{groupId}")
    public ResponseEntity<GroupInfoResponse> renameGroup(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId,
            @Valid @RequestBody UpdateGroupRequest request
    ) {
        return ResponseEntity.ok(groupChatService.renameGroup(principal.getUsername(), groupId, request));
    }

    @Operation(summary = "Delete Group", description = "Delete a group chat (admin only)")
    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId
    ) {
        groupChatService.deleteGroup(principal.getUsername(), groupId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get Recent Group Conversations", description = "Retrieve a list of recent group conversations for the authenticated user")
    @GetMapping("/recent-conversations")
    public ResponseEntity<List<GroupConversationPreviewResponse>> getRecentConversations(
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(groupChatService.getRecentConversations(principal.getUsername()));
    }

    @Operation(summary = "Get Group Info", description = "Retrieve information about a specific group chat")
    @GetMapping("/{groupId}")
    public ResponseEntity<GroupInfoResponse> getGroup(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId
    ) {
        return ResponseEntity.ok(groupChatService.getGroup(principal.getUsername(), groupId));
    }

    @Operation(summary = "Add Members", description = "Add new members to an existing group chat")
    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupInfoResponse> addMembers(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId,
            @Valid @RequestBody AddGroupMembersRequest request
    ) {
        return ResponseEntity.ok(groupChatService.addMembers(principal.getUsername(), groupId, request));
    }

    @Operation(summary = "Remove Member", description = "Remove a member from a group chat")
    @DeleteMapping("/{groupId}/members/{memberUsername}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId,
            @PathVariable String memberUsername
    ) {
        groupChatService.removeMember(principal.getUsername(), groupId, memberUsername);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Leave Group", description = "Leave a group chat")
    @PostMapping("/{groupId}/leave")
    public ResponseEntity<Void> leaveGroup(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long groupId
    ) {
        groupChatService.leaveGroup(principal.getUsername(), groupId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "List Group Messages", description = "Retrieve a list of historical messages in a group chat")
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
