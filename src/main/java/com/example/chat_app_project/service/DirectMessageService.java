package com.example.chat_app_project.service;

import com.example.chat_app_project.dto.request.SendDirectMessageRequest;
import com.example.chat_app_project.dto.response.ConversationPreviewResponse;
import com.example.chat_app_project.dto.response.DirectMessageResponse;
import com.example.chat_app_project.dto.response.OpenDirectChatResponse;

import java.util.List;
import java.util.UUID;

public interface DirectMessageService {

    OpenDirectChatResponse openConversation(String username, String peerUsername);

    DirectMessageResponse send(Long senderUserId, SendDirectMessageRequest request);

    List<DirectMessageResponse> listMessages(String username, String peerUsername, int limit, UUID beforeMessageId);

    List<ConversationPreviewResponse> getRecentConversations(String username);
}
