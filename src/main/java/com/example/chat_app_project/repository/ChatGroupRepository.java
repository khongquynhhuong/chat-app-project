package com.example.chat_app_project.repository;

import com.example.chat_app_project.entity.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {
}
