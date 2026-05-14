package com.example.chat_app_project.service;

import com.example.chat_app_project.dto.request.AddGroupMembersRequest;
import com.example.chat_app_project.dto.request.CreateGroupRequest;
import com.example.chat_app_project.dto.request.SendGroupMessageRequest;
import com.example.chat_app_project.dto.request.UpdateGroupRequest;
import com.example.chat_app_project.dto.response.GroupConversationPreviewResponse;
import com.example.chat_app_project.dto.response.GroupInfoResponse;
import com.example.chat_app_project.dto.response.GroupMessageResponse;

import java.util.List;
import java.util.UUID;

public interface GroupChatService {
    GroupInfoResponse createGroup(String username, CreateGroupRequest request);

    GroupInfoResponse renameGroup(String username, Long groupId, UpdateGroupRequest request);

    GroupInfoResponse addMembers(String username, Long groupId, AddGroupMembersRequest request);

    GroupInfoResponse getGroup(String username, Long groupId);

    void removeMember(String username, Long groupId, Long memberUserId);

    void leaveGroup(String username, Long groupId);

    List<GroupConversationPreviewResponse> getRecentConversations(String username);

    List<GroupMessageResponse> listMessages(String username, Long groupId, int limit, UUID beforeMessageId);

    GroupMessageResponse send(Long senderUserId, SendGroupMessageRequest request);

    void deleteGroup(String username, Long groupId);
}
