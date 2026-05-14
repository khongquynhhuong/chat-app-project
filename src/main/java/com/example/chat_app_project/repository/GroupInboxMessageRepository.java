package com.example.chat_app_project.repository;

import com.example.chat_app_project.entity.GroupInboxMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupInboxMessageRepository extends JpaRepository<GroupInboxMessage, Long> {
    List<GroupInboxMessage> findByUserIdAndGroupIdOrderByCreatedAtDesc(Long userId, Long groupId, Pageable pageable);

    List<GroupInboxMessage> findByUserIdAndGroupIdAndCreatedAtBeforeOrderByCreatedAtDesc(
            Long userId,
            Long groupId,
            Instant createdAt,
            Pageable pageable
    );

    Optional<GroupInboxMessage> findByUserIdAndGroupIdAndMessageId(Long userId, Long groupId, UUID messageId);

    void deleteByGroupId(Long groupId);
}
