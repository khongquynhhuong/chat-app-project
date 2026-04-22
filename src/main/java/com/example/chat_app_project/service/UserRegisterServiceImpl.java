package com.example.chat_app_project.service;

import com.example.chat_app_project.dto.request.UserRegisterRequest;
import com.example.chat_app_project.dto.response.UserRegisterResponse;
import com.example.chat_app_project.entity.Role;
import com.example.chat_app_project.entity.User;
import com.example.chat_app_project.repository.RoleRepository;
import com.example.chat_app_project.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserRegisterServiceImpl implements UserRegisterService
{
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UserRegisterResponse register(UserRegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại!");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("Lỗi: Role không tồn tại. Hãy INSERT vào DB!"));
        user.setRoles(Collections.singleton(userRole));

        User savedUser = userRepository.save(user);

        return new UserRegisterResponse(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getRoles().stream().map(Role::getName).collect(Collectors.toSet())
        );
    }

}
