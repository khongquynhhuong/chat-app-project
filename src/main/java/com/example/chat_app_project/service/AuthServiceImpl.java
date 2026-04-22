package com.example.chat_app_project.service;

import com.example.chat_app_project.dto.request.LoginRequest;
import com.example.chat_app_project.dto.response.AuthResponse;
import com.example.chat_app_project.entity.Role;
import com.example.chat_app_project.entity.User;
import com.example.chat_app_project.repository.UserRepository;
import com.example.chat_app_project.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Override
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        var userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword())
                .authorities(user.getRoles().stream().map(Role::getName).toArray(String[]::new))
                .build();

        String token = jwtService.generateToken(userDetails);
        var roleNames = user.getRoles().stream().map(Role::getName).collect(Collectors.toSet());

        return new AuthResponse(token, "Bearer", user.getId(), user.getUsername(), roleNames);
    }
}
