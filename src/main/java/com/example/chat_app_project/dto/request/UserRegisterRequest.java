package com.example.chat_app_project.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UserRegisterRequest {
    @NotBlank(message = "Username không được để trống")
    private String username;

    @NotBlank(message = "Password không được để trống")
    @Size(min=6,message = "Password có ít nhất 6 kí tự")
    private String password;
}
