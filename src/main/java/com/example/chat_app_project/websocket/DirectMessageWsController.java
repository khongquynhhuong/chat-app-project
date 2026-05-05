package com.example.chat_app_project.websocket;

import com.example.chat_app_project.dto.request.SendDirectMessageRequest;
import com.example.chat_app_project.dto.response.DirectMessageResponse;
import com.example.chat_app_project.service.DirectMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

import java.security.Principal;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Validated
public class DirectMessageWsController {

    private final DirectMessageService directMessageService;
    private final DirectMessageNotifier directMessageNotifier;

    /**
     * Client gửi tới /app/dm/send với payload {@code {"peerUsername":"bob","content":"...","messageType":0}}.
     * {@link Principal#getName()} là chuỗi user id (STOMP). Server lưu Cassandra rồi push:
     * - /user/{recipientId}/queue/dm
     * - /user/{senderId}/queue/dm.sent
     */
    @MessageMapping("/dm/send")
    public void send(@Valid @Payload SendDirectMessageRequest request, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new RuntimeException("WebSocket chưa xác thực");
        }
        long senderId;
        try {
            senderId = Long.parseLong(principal.getName());
        } catch (NumberFormatException e) {
            throw new RuntimeException("Principal STOMP không hợp lệ (cần user id)");
        }
        DirectMessageResponse sent = directMessageService.send(senderId, request);
        directMessageNotifier.notifySentAck(sent, senderId);
    }

    @MessageExceptionHandler(RuntimeException.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleRuntime(RuntimeException ex) {
        return Map.of("error", ex.getMessage(), "status", 400);
    }
}
