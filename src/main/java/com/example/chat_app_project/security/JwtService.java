package com.example.chat_app_project.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public static final String USER_ID_CLAIM = "uid";

    /**
     * JWT chứa {@code sub} = username (cho HTTP filter) và claim {@code uid} = user id (cho STOMP principal / routing).
     */
    public String generateToken(UserDetails userDetails, Long userId) {
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim(USER_ID_CLAIM, userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(signingKey())
                .compact();
    }

    /** Token cũ không có {@code uid} thì trả {@code null}. */
    public Long extractUserId(String token) {
        try {
            Object raw = extractClaim(token, claims -> claims.get(USER_ID_CLAIM));
            if (raw == null) {
                return null;
            }
            if (raw instanceof Number n) {
                return n.longValue();
            }
            if (raw instanceof String s && !s.isBlank()) {
                return Long.parseLong(s.trim());
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey signingKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
