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
     * Client gửi tới /app/dm/send với payload SendDirectMessageRequest.
     * Server lưu Cassandra rồi push:
     * - /user/{peer}/queue/dm      : tin incoming cho peer
     * - /user/{sender}/queue/dm.sent: ACK cho người gửi
     */
    @MessageMapping("/dm/send")
    public void send(@Valid @Payload SendDirectMessageRequest request, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new RuntimeException("WebSocket chưa xác thực");
        }
        String senderUsername = principal.getName();
        DirectMessageResponse sent = directMessageService.send(senderUsername, request);
        directMessageNotifier.notifySentAck(sent, senderUsername);
    }

    @MessageExceptionHandler(RuntimeException.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleRuntime(RuntimeException ex) {
        return Map.of("error", ex.getMessage(), "status", 400);
    }
}
