package com.example.chat_app_project.repository;

import com.example.chat_app_project.entity.UserConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserConversationRepository extends JpaRepository<UserConversation, Long> {

    Optional<UserConversation> findByUserIdAndPeerId(Long userId, Long peerId);

    List<UserConversation> findByUserIdOrderByLastUpdatedDesc(Long userId);
}
