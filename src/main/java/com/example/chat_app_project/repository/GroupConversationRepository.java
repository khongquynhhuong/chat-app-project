package com.example.chat_app_project.repository;

import com.example.chat_app_project.entity.GroupConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupConversationRepository extends JpaRepository<GroupConversation, Long> {
    Optional<GroupConversation> findByUserIdAndGroupId(Long userId, Long groupId);

    List<GroupConversation> findByUserIdOrderByLastUpdatedDesc(Long userId);

    void deleteByGroupId(Long groupId);
}
