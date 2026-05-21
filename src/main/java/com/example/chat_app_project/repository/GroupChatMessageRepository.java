package com.example.chat_app_project.repository;

import com.example.chat_app_project.entity.GroupChatMessage;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface GroupChatMessageRepository extends CassandraRepository<GroupChatMessage, UUID> {
    
    // Lấy tin nhắn mới nhất
    Slice<GroupChatMessage> findByUserIdAndGroupId(Long userId, Long groupId, Pageable pageable);
    
    // Keyset pagination (thay vì offset)
    Slice<GroupChatMessage> findByUserIdAndGroupIdAndMessageIdLessThan(Long userId, Long groupId, UUID messageId, Pageable pageable);
    
    void deleteByUserIdAndGroupId(Long userId, Long groupId);
}
