package com.example.chat_app_project.websocket;

import com.example.chat_app_project.dto.response.GroupMessageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GroupMessageNotifier {
    private static final String INCOMING_DESTINATION = "/queue/dm";
    private static final String SENT_ACK_DESTINATION = "/queue/dm.sent";
    private static final String GROUP_DELETED_DESTINATION = "/queue/group.deleted";

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyIncomingMessage(GroupMessageResponse payload, Long recipientId) {
        messagingTemplate.convertAndSendToUser(String.valueOf(recipientId), INCOMING_DESTINATION, payload);
    }

    public void notifySentAck(GroupMessageResponse payload, Long senderId) {
        messagingTemplate.convertAndSendToUser(String.valueOf(senderId), SENT_ACK_DESTINATION, payload);
    }

    public void notifyGroupDeleted(Long groupId, Long recipientId) {
        messagingTemplate.convertAndSendToUser(String.valueOf(recipientId), GROUP_DELETED_DESTINATION, groupId);
    }
}
