package com.example.chat_app_project.service;

import com.example.chat_app_project.dto.response.UserSearchResponse;

import java.util.List;

public interface UserService {
    List<UserSearchResponse> searchUsers (String query, String currentUsername);
}
