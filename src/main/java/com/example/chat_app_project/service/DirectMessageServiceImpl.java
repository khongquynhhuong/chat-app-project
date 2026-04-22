package com.example.chat_app_project.service;

import com.example.chat_app_project.dm.DirectConversationIds;
import com.example.chat_app_project.dm.MessageDeliveryStatus;
import com.example.chat_app_project.dto.request.MarkDirectMessageReadRequest;
import com.example.chat_app_project.dto.request.SendDirectMessageRequest;
import com.example.chat_app_project.dto.response.DirectMessageResponse;
import com.example.chat_app_project.dto.response.OpenDirectChatResponse;
import com.example.chat_app_project.entity.ChatMessage;
import com.example.chat_app_project.entity.User;
import com.example.chat_app_project.repository.MessageRepository;
import com.example.chat_app_project.repository.UserRepository;
import com.example.chat_app_project.websocket.DirectMessageNotifier;
import com.datastax.oss.driver.api.core.uuid.Uuids;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DirectMessageServiceImpl implements DirectMessageService {

    private static final int MAX_LIMIT = 100;

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final DirectMessageNotifier directMessageNotifier;

    @Override
    public OpenDirectChatResponse openConversation(String username, long peerUserId) {
        User me = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Người dùng hiện tại không tồn tại"));
        User peer = userRepository.findById(peerUserId)
                .orElseThrow(() -> new RuntimeException("Người nhận không tồn tại"));
        if (me.getId().equals(peer.getId())) {
            throw new RuntimeException("Không thể mở hội thoại với chính mình");
        }
        UUID conversationId = DirectConversationIds.forPair(me.getId(), peer.getId());
        return new OpenDirectChatResponse(conversationId, peer.getId(), peer.getUsername());
    }

    @Override
    public DirectMessageResponse send(String username, SendDirectMessageRequest request) {
        User me = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Người dùng hiện tại không tồn tại"));
        User peer = userRepository.findById(request.getPeerUserId())
                .orElseThrow(() -> new RuntimeException("Người nhận không tồn tại"));
        if (me.getId().equals(peer.getId())) {
            throw new RuntimeException("Không thể gửi tin cho chính mình");
        }

        UUID conversationId = DirectConversationIds.forPair(me.getId(), peer.getId());
        UUID messageId = Uuids.timeBased();
        Instant now = Instant.now();

        ChatMessage msg = ChatMessage.builder()
                .conversationId(conversationId)
                .messageId(messageId)
                .senderId(me.getId())
                .content(request.getContent())
                .messageType(request.getMessageType())
                .createdAt(now)
                .deliveryStatus(MessageDeliveryStatus.SENT.getCode())
                .build();

        messageRepository.save(msg);
        DirectMessageResponse response = toResponse(msg);
        directMessageNotifier.notifyIncomingMessage(response, peer.getUsername());
        return response;
    }

    @Override
    public List<DirectMessageResponse> listMessages(String username, long peerUserId, int limit, UUID beforeMessageId) {
        User me = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Người dùng hiện tại không tồn tại"));
        userRepository.findById(peerUserId)
                .orElseThrow(() -> new RuntimeException("Đối phương không tồn tại"));
        if (me.getId().equals(peerUserId)) {
            throw new RuntimeException("peerUserId không hợp lệ");
        }

        UUID conversationId = DirectConversationIds.forPair(me.getId(), peerUserId);
        int safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

        List<ChatMessage> rows = beforeMessageId == null
                ? messageRepository.findRecentMessages(conversationId, safeLimit)
                : messageRepository.findMessagesBefore(conversationId, beforeMessageId, safeLimit);

        return rows.stream()
                .sorted(Comparator.comparing(ChatMessage::getMessageId))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void markRead(String username, MarkDirectMessageReadRequest request) {
        User me = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Người dùng hiện tại không tồn tại"));
        userRepository.findById(request.getPeerUserId())
                .orElseThrow(() -> new RuntimeException("Đối phương không tồn tại"));

        UUID conversationId = DirectConversationIds.forPair(me.getId(), request.getPeerUserId());
        ChatMessage msg = messageRepository.findByConversationIdAndMessageId(conversationId, request.getMessageId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        if (!msg.getConversationId().equals(conversationId)) {
            throw new RuntimeException("Tin nhắn không thuộc cuộc hội thoại này");
        }
        if (msg.getSenderId().equals(me.getId())) {
            throw new RuntimeException("Chỉ người nhận mới đánh dấu đã đọc");
        }

        msg.setDeliveryStatus(MessageDeliveryStatus.READ.getCode());
        messageRepository.save(msg);
    }

    private DirectMessageResponse toResponse(ChatMessage m) {
        return DirectMessageResponse.builder()
                .conversationId(m.getConversationId())
                .messageId(m.getMessageId())
                .senderId(m.getSenderId())
                .content(m.getContent())
                .messageType(m.getMessageType())
                .createdAt(m.getCreatedAt())
                .deliveryStatus(MessageDeliveryStatus.fromCode(m.getDeliveryStatus()).name())
                .build();
    }
}
