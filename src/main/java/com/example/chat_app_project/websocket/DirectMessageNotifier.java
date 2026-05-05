package com.example.chat_app_project.websocket;

import com.example.chat_app_project.dto.response.DirectMessageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DirectMessageNotifier {

    private static final String INCOMING_DESTINATION = "/queue/dm";
    private static final String SENT_ACK_DESTINATION = "/queue/dm.sent";

    private final SimpMessagingTemplate messagingTemplate;

    /** Đẩy tin mới cho peer nhận (user destination theo id — khớp STOMP principal). */
    public void notifyIncomingMessage(DirectMessageResponse payload, Long recipientId) {
        messagingTemplate.convertAndSendToUser(String.valueOf(recipientId), INCOMING_DESTINATION, payload);
    }

    /** Trả ACK cho chính người gửi (đã lưu Cassandra thành công). */
    public void notifySentAck(DirectMessageResponse payload, Long senderId) {
        messagingTemplate.convertAndSendToUser(String.valueOf(senderId), SENT_ACK_DESTINATION, payload);
    }
}
