package com.example.chat_app_project.websocket;

import com.example.chat_app_project.repository.UserRepository;
import com.example.chat_app_project.security.CustomUserDetailsService;
import com.example.chat_app_project.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Xác thực JWT trên lệnh STOMP CONNECT (sau khi client đã có access token từ REST login).
 * {@code Principal#getName()} = chuỗi user id để khớp {@link org.springframework.messaging.simp.SimpMessagingTemplate#convertAndSendToUser}.
 */
@Component
@RequiredArgsConstructor
public class StompJwtChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String raw = resolveAuthorization(accessor);
            if (raw == null || raw.isBlank()) {
                throw new MessagingException("Thiếu JWT: gửi header Authorization: Bearer <token> hoặc mở SockJS với ?token=<jwt>");
            }
            String token = raw.startsWith("Bearer ") ? raw.substring(7).trim() : raw.trim();
            String username = jwtService.extractUsername(token);
            UserDetails user = userDetailsService.loadUserByUsername(username);
            if (!jwtService.isTokenValid(token, user)) {
                throw new MessagingException("JWT không hợp lệ hoặc đã hết hạn");
            }
            Long userId = jwtService.extractUserId(token);
            if (userId == null) {
                userId = userRepository.findByUsername(username)
                        .orElseThrow(() -> new MessagingException("Không tìm thấy người dùng"))
                        .getId();
            }
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    String.valueOf(userId), null, user.getAuthorities());
            accessor.setUser(auth);
        }
        return message;
    }

    private String resolveAuthorization(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null) {
            for (String h : authHeaders) {
                if (h != null && !h.isBlank()) {
                    return h;
                }
            }
        }
        Map<String, Object> sess = accessor.getSessionAttributes();
        if (sess != null) {
            Object t = sess.get(WsJwtHandshakeInterceptor.SESSION_JWT);
            if (t instanceof String s && !s.isBlank()) {
                return s.startsWith("Bearer ") ? s : "Bearer " + s;
            }
        }
        return null;
    }
}
