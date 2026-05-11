package com.example.chat_app_project.service;

import com.example.chat_app_project.dto.response.UserSearchResponse;
import com.example.chat_app_project.entity.User;
import com.example.chat_app_project.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    @Override
    public List<UserSearchResponse> searchUsers (String query, String currentUsername)
    {
        List<User> foundUsers = userRepository.findByUsernameContainingIgnoreCase(query);

        return foundUsers.stream()
                .filter (user -> !user.getUsername().equalsIgnoreCase(currentUsername))
                .map (this::mapToResponse)
                .collect(Collectors.toList());
    }
    private UserSearchResponse mapToResponse (User user) {
        return UserSearchResponse.builder()
                .userId (user.getId())
                .username (user.getUsername())
                .build();
    }
}
