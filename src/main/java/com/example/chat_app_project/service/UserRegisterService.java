package com.example.chat_app_project.service;
import com.example.chat_app_project.dto.request.UserRegisterRequest;
import com.example.chat_app_project.dto.response.UserRegisterResponse;

public interface UserRegisterService {
    UserRegisterResponse register (UserRegisterRequest request);
}
