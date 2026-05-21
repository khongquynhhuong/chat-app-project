package com.example.chat_app_project.dm;

/**
 * Trạng thái tin nhắn 1-1: Sent → Delivered → Read.
 */
public enum MessageDeliveryStatus {
    SENT(0),
    DELIVERED(1),
    READ(2);

    private final int code;

    MessageDeliveryStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static MessageDeliveryStatus fromCode(int code) {
        for (MessageDeliveryStatus s : values()) {
            if (s.code == code) {
                return s;
            }
        }
        return SENT;
    }
}
