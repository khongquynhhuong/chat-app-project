package com.example.chat_app_project.websocket;

import com.example.chat_app_project.dto.request.SendGroupMessageRequest;
import com.example.chat_app_project.dto.response.GroupMessageResponse;
import com.example.chat_app_project.service.GroupChatService;
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
public class GroupMessageWsController {

    private final GroupChatService groupChatService;
    private final GroupMessageNotifier groupMessageNotifier;

    @MessageMapping("/group/send")
    public void send(@Valid @Payload SendGroupMessageRequest request, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new RuntimeException("WebSocket chưa xác thực");
        }
        long senderId;
        try {
            senderId = Long.parseLong(principal.getName());
        } catch (NumberFormatException e) {
            throw new RuntimeException("Principal STOMP không hợp lệ (cần user id)");
        }
        GroupMessageResponse sent = groupChatService.send(senderId, request);
        groupMessageNotifier.notifySentAck(sent, senderId);
    }

    @MessageExceptionHandler(RuntimeException.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleRuntime(RuntimeException ex) {
        return Map.of("error", ex.getMessage(), "status", 400);
    }
}
