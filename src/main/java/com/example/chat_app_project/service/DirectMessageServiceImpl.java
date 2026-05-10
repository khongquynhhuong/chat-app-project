package com.example.chat_app_project.service;

import com.example.chat_app_project.dm.DirectConversationIds;
import com.example.chat_app_project.dm.MessageDeliveryStatus;
import com.example.chat_app_project.dto.request.MarkDirectMessageReadRequest;
import com.example.chat_app_project.dto.request.SendDirectMessageRequest;
import com.example.chat_app_project.dto.response.ConversationPreviewResponse;
import com.example.chat_app_project.dto.response.DirectMessageResponse;
import com.example.chat_app_project.dto.response.OpenDirectChatResponse;
import com.example.chat_app_project.entity.ChatMessage;
import com.example.chat_app_project.entity.User;
import com.example.chat_app_project.entity.UserConversation;
import com.example.chat_app_project.repository.MessageRepository;
import com.example.chat_app_project.repository.UserConversationRepository;
import com.example.chat_app_project.repository.UserRepository;
import com.example.chat_app_project.websocket.DirectMessageNotifier;
import com.datastax.oss.driver.api.core.uuid.Uuids;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    private final UserConversationRepository userConversationRepository;
    private final DirectMessageNotifier directMessageNotifier;

    @Override
    @Transactional
    public OpenDirectChatResponse openConversation(String username, String peerUsername) {
        User me = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Người dùng hiện tại không tồn tại"));
        User peer = userRepository.findByUsername(requirePeerUsername(peerUsername))
                .orElseThrow(() -> new RuntimeException("Người nhận không tồn tại"));
        if (me.getId().equals(peer.getId())) {
            throw new RuntimeException("Không thể mở hội thoại với chính mình");
        }
        UUID conversationId = DirectConversationIds.forPair(me.getId(), peer.getId());
        
        userConversationRepository.findByUserIdAndPeerId(me.getId(), peer.getId())
                .ifPresent(conv -> {
                    conv.setUnreadCount(0);
                    userConversationRepository.save(conv);
                });

        return new OpenDirectChatResponse(conversationId, peer.getUsername());
    }

    @Override
    @Transactional
    public DirectMessageResponse send(Long senderUserId, SendDirectMessageRequest request) {
        User me = userRepository.findById(senderUserId)
                .orElseThrow(() -> new RuntimeException("Người dùng hiện tại không tồn tại"));
        User peer = userRepository.findByUsername(requirePeerUsername(request.getPeerUsername()))
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

        String preview = request.getMessageType() == 0 ? request.getContent() : "[Hình ảnh/File]";
        if (preview != null && preview.length() > 250) {
            preview = preview.substring(0, 250) + "...";
        }
        
        UserConversation myConv = userConversationRepository.findByUserIdAndPeerId(me.getId(), peer.getId())
                .orElseGet(() -> UserConversation.builder()
                        .user(me)
                        .peer(peer)
                        .conversationId(conversationId)
                        .build());
        myConv.setLastUpdated(now);
        myConv.setLastMessagePreview("Bạn: " + preview);
        userConversationRepository.save(myConv);

        UserConversation peerConv = userConversationRepository.findByUserIdAndPeerId(peer.getId(), me.getId())
                .orElseGet(() -> UserConversation.builder()
                        .user(peer)
                        .peer(me)
                        .conversationId(conversationId)
                        .build());
        peerConv.setLastUpdated(now);
        peerConv.setLastMessagePreview(preview);
        peerConv.setUnreadCount(peerConv.getUnreadCount() + 1);
        userConversationRepository.save(peerConv);

        DirectMessageResponse response = toResponse(
                msg,
                me.getUsername(),
                peer.getUsername(),
                request.getClientMessageId()
        );
        directMessageNotifier.notifyIncomingMessage(response, peer.getId());
        return response;
    }

    @Override
    public List<DirectMessageResponse> listMessages(String username, String peerUsername, int limit, UUID beforeMessageId) {
        User me = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Người dùng hiện tại không tồn tại"));
        User peer = userRepository.findByUsername(requirePeerUsername(peerUsername))
                .orElseThrow(() -> new RuntimeException("Đối phương không tồn tại"));
        if (me.getId().equals(peer.getId())) {
            throw new RuntimeException("peerUsername không hợp lệ");
        }

        UUID conversationId = DirectConversationIds.forPair(me.getId(), peer.getId());
        int safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

        // Reset unread count since the user is viewing the chat history
        if (beforeMessageId == null) {
            userConversationRepository.findByUserIdAndPeerId(me.getId(), peer.getId())
                    .ifPresent(conv -> {
                        conv.setUnreadCount(0);
                        userConversationRepository.save(conv);
                    });
        }

        List<ChatMessage> rows = beforeMessageId == null
                ? messageRepository.findRecentMessages(conversationId, safeLimit)
                : messageRepository.findMessagesBefore(conversationId, beforeMessageId, safeLimit);

        return rows.stream()
                .sorted(Comparator.comparing(ChatMessage::getMessageId))
                .map(message -> toResponse(
                        message,
                        message.getSenderId().equals(me.getId()) ? me.getUsername() : peer.getUsername(),
                        null,
                        null
                ))
                .collect(Collectors.toList());
    }

    @Override
    public void markRead(String username, MarkDirectMessageReadRequest request) {
        User me = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Người dùng hiện tại không tồn tại"));
        User peer = userRepository.findByUsername(requirePeerUsername(request.getPeerUsername()))
                .orElseThrow(() -> new RuntimeException("Đối phương không tồn tại"));

        UUID conversationId = DirectConversationIds.forPair(me.getId(), peer.getId());
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

    @Override
    public List<ConversationPreviewResponse> getRecentConversations(String username) {
        User me = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Người dùng hiện tại không tồn tại"));
        
        List<UserConversation> conversations = userConversationRepository.findByUserIdOrderByLastUpdatedDesc(me.getId());
        return conversations.stream()
                .map(conv -> ConversationPreviewResponse.builder()
                        .peerUsername(conv.getPeer().getUsername())
                        .title(conv.getPeer().getUsername())
                        .lastMessage(conv.getLastMessagePreview())
                        .lastAt(conv.getLastUpdated())
                        .unread(conv.getUnreadCount())
                        .build())
                .collect(Collectors.toList());
    }

    private String requirePeerUsername(String peerUsername) {
        if (peerUsername == null || peerUsername.isBlank()) {
            throw new RuntimeException("peerUsername không được để trống");
        }
        return peerUsername.trim();
    }

    private DirectMessageResponse toResponse(ChatMessage m, String senderUsername) {
        return toResponse(m, senderUsername, null, null);
    }

    private DirectMessageResponse toResponse(
            ChatMessage m,
            String senderUsername,
            String peerUsername,
            String clientMessageId
    ) {
        return DirectMessageResponse.builder()
                .conversationId(m.getConversationId())
                .messageId(m.getMessageId())
                .senderId(m.getSenderId())
                .senderUsername(senderUsername)
                .content(m.getContent())
                .messageType(m.getMessageType())
                .createdAt(m.getCreatedAt())
                .deliveryStatus(MessageDeliveryStatus.fromCode(m.getDeliveryStatus()).name())
                .peerUsername(peerUsername)
                .clientMessageId(clientMessageId)
                .build();
    }
}
