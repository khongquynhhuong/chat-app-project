package com.example.chat_app_project.repository;

import com.example.chat_app_project.entity.ChatGroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatGroupMemberRepository extends JpaRepository<ChatGroupMember, Long> {
    Optional<ChatGroupMember> findByGroupIdAndUserId(Long groupId, Long userId);

    List<ChatGroupMember> findByGroupIdAndLeftAtIsNull(Long groupId);

    long countByGroupIdAndLeftAtIsNull(Long groupId);

    void deleteByGroupId(Long groupId);
}
