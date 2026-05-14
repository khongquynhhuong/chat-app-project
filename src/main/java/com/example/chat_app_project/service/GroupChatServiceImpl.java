package com.example.chat_app_project.service;

import com.datastax.oss.driver.api.core.uuid.Uuids;
import com.example.chat_app_project.dm.MessageDeliveryStatus;
import com.example.chat_app_project.dto.request.AddGroupMembersRequest;
import com.example.chat_app_project.dto.request.CreateGroupRequest;
import com.example.chat_app_project.dto.request.SendGroupMessageRequest;
import com.example.chat_app_project.dto.request.UpdateGroupRequest;
import com.example.chat_app_project.dto.response.GroupConversationPreviewResponse;
import com.example.chat_app_project.dto.response.GroupInfoResponse;
import com.example.chat_app_project.dto.response.GroupMessageResponse;
import com.example.chat_app_project.entity.ChatGroup;
import com.example.chat_app_project.entity.ChatGroupMember;
import com.example.chat_app_project.entity.GroupConversation;
import com.example.chat_app_project.entity.GroupInboxMessage;
import com.example.chat_app_project.entity.User;
import com.example.chat_app_project.repository.ChatGroupMemberRepository;
import com.example.chat_app_project.repository.ChatGroupRepository;
import com.example.chat_app_project.repository.GroupConversationRepository;
import com.example.chat_app_project.repository.GroupInboxMessageRepository;
import com.example.chat_app_project.repository.UserRepository;
import com.example.chat_app_project.websocket.GroupMessageNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupChatServiceImpl implements GroupChatService {
    private static final int MAX_LIMIT = 100;
    private static final int MAX_MEMBERS = 100;

    private final UserRepository userRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final GroupConversationRepository groupConversationRepository;
    private final GroupInboxMessageRepository groupInboxMessageRepository;
    private final GroupMessageNotifier groupMessageNotifier;

    @Override
    @Transactional
    public GroupInfoResponse createGroup(String username, CreateGroupRequest request) {
        User owner = requireUser(username);
        Set<String> uniqueUsernames = new LinkedHashSet<>();
        uniqueUsernames.add(owner.getUsername());
        if (request.getMemberUsernames() != null) {
            uniqueUsernames.addAll(request.getMemberUsernames().stream().map(String::trim).collect(Collectors.toSet()));
        }
        if (uniqueUsernames.size() > MAX_MEMBERS) {
            throw new RuntimeException("Nhóm chỉ hỗ trợ tối đa 100 thành viên");
        }

        List<User> users = uniqueUsernames.stream()
                .map(this::requireUser)
                .toList();

        Instant now = Instant.now();
        ChatGroup group = chatGroupRepository.save(ChatGroup.builder()
                .name(request.getName().trim())
                .owner(owner)
                .conversationId(Uuids.timeBased())
                .createdAt(now)
                .updatedAt(now)
                .memberLimit(MAX_MEMBERS)
                .build());

        List<ChatGroupMember> members = new ArrayList<>();
        for (User user : users) {
            members.add(ChatGroupMember.builder()
                    .group(group)
                    .user(user)
                    .role(user.getId().equals(owner.getId()) ? "OWNER" : "MEMBER")
                    .joinedAt(now)
                    .build());

            groupConversationRepository.save(GroupConversation.builder()
                    .user(user)
                    .group(group)
                    .conversationId(group.getConversationId())
                    .lastMessagePreview("")
                    .lastUpdated(now)
                    .unreadCount(0)
                    .build());
        }
        chatGroupMemberRepository.saveAll(members);

        return toGroupInfo(group, members);
    }

    @Override
    @Transactional
    public GroupInfoResponse renameGroup(String username, Long groupId, UpdateGroupRequest request) {
        User me = requireUser(username);
        ChatGroup group = requireGroup(groupId);
        requireOwner(me, group);
        group.setName(request.getName().trim());
        group.setUpdatedAt(Instant.now());
        chatGroupRepository.save(group);
        return toGroupInfo(group, chatGroupMemberRepository.findByGroupIdAndLeftAtIsNull(groupId));
    }

    @Override
    @Transactional
    public GroupInfoResponse addMembers(String username, Long groupId, AddGroupMembersRequest request) {
        User me = requireUser(username);
        ChatGroup group = requireGroup(groupId);
        requireOwner(me, group);

        List<ChatGroupMember> activeMembers = chatGroupMemberRepository.findByGroupIdAndLeftAtIsNull(groupId);
        Set<Long> activeMemberIds = activeMembers.stream().map(m -> m.getUser().getId()).collect(Collectors.toSet());
        Instant now = Instant.now();

        for (String memberUsername : request.getMemberUsernames()) {
            User user = requireUser(memberUsername.trim());
            if (activeMemberIds.contains(user.getId())) {
                continue;
            }
            if (activeMemberIds.size() >= MAX_MEMBERS) {
                throw new RuntimeException("Nhóm đã đạt giới hạn 100 thành viên");
            }
            ChatGroupMember member = chatGroupMemberRepository.findByGroupIdAndUserId(groupId, user.getId())
                    .orElse(ChatGroupMember.builder()
                            .group(group)
                            .user(user)
                            .role("MEMBER")
                            .joinedAt(now)
                            .build());
            member.setLeftAt(null);
            member.setJoinedAt(now);
            chatGroupMemberRepository.save(member);
            activeMemberIds.add(user.getId());
            groupConversationRepository.findByUserIdAndGroupId(user.getId(), groupId)
                    .orElseGet(() -> groupConversationRepository.save(GroupConversation.builder()
                            .user(user)
                            .group(group)
                            .conversationId(group.getConversationId())
                            .lastMessagePreview("")
                            .lastUpdated(now)
                            .unreadCount(0)
                            .build()));
        }

        return toGroupInfo(group, chatGroupMemberRepository.findByGroupIdAndLeftAtIsNull(groupId));
    }

    @Override
    public GroupInfoResponse getGroup(String username, Long groupId) {
        User me = requireUser(username);
        ChatGroup group = requireGroup(groupId);
        requireActiveMember(groupId, me.getId());
        return toGroupInfo(group, chatGroupMemberRepository.findByGroupIdAndLeftAtIsNull(groupId));
    }

    @Override
    @Transactional
    public void removeMember(String username, Long groupId, Long memberUserId) {
        User me = requireUser(username);
        ChatGroup group = requireGroup(groupId);
        requireOwner(me, group);
        if (group.getOwner().getId().equals(memberUserId)) {
            throw new RuntimeException("Không thể xóa chủ nhóm");
        }
        ChatGroupMember member = chatGroupMemberRepository.findByGroupIdAndUserId(groupId, memberUserId)
                .orElseThrow(() -> new RuntimeException("Thành viên không tồn tại trong nhóm"));
        member.setLeftAt(Instant.now());
        chatGroupMemberRepository.save(member);
        groupConversationRepository.findByUserIdAndGroupId(memberUserId, groupId)
                .ifPresent(groupConversationRepository::delete);
    }

    @Override
    @Transactional
    public void leaveGroup(String username, Long groupId) {
        User me = requireUser(username);
        ChatGroup group = requireGroup(groupId);
        if (group.getOwner().getId().equals(me.getId())) {
            throw new RuntimeException("Chủ nhóm chưa thể rời nhóm");
        }
        ChatGroupMember member = requireActiveMember(groupId, me.getId());
        member.setLeftAt(Instant.now());
        chatGroupMemberRepository.save(member);
        groupConversationRepository.findByUserIdAndGroupId(me.getId(), groupId)
                .ifPresent(groupConversationRepository::delete);
    }

    @Override
    public List<GroupConversationPreviewResponse> getRecentConversations(String username) {
        User me = requireUser(username);
        return groupConversationRepository.findByUserIdOrderByLastUpdatedDesc(me.getId()).stream()
                .map(conv -> GroupConversationPreviewResponse.builder()
                        .groupId(conv.getGroup().getId())
                        .title(conv.getGroup().getName())
                        .lastMessage(conv.getLastMessagePreview())
                        .lastAt(conv.getLastUpdated())
                        .unread(conv.getUnreadCount())
                        .memberCount((int) chatGroupMemberRepository.countByGroupIdAndLeftAtIsNull(conv.getGroup().getId()))
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public List<GroupMessageResponse> listMessages(String username, Long groupId, int limit, UUID beforeMessageId) {
        User me = requireUser(username);
        requireActiveMember(groupId, me.getId());
        int safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

        List<GroupInboxMessage> messages;
        if (beforeMessageId == null) {
            messages = groupInboxMessageRepository.findByUserIdAndGroupIdOrderByCreatedAtDesc(
                    me.getId(),
                    groupId,
                    PageRequest.of(0, safeLimit)
            );
            groupConversationRepository.findByUserIdAndGroupId(me.getId(), groupId).ifPresent(conv -> {
                conv.setUnreadCount(0);
                groupConversationRepository.save(conv);
            });
        } else {
            GroupInboxMessage before = groupInboxMessageRepository
                    .findByUserIdAndGroupIdAndMessageId(me.getId(), groupId, beforeMessageId)
                    .orElseThrow(() -> new RuntimeException("beforeMessageId không hợp lệ"));
            messages = groupInboxMessageRepository.findByUserIdAndGroupIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                    me.getId(),
                    groupId,
                    before.getCreatedAt(),
                    PageRequest.of(0, safeLimit)
            );
        }

        messages.sort(Comparator.comparing(GroupInboxMessage::getCreatedAt));
        return messages.stream().map(this::toMessageResponse).toList();
    }

    @Override
    @Transactional
    public GroupMessageResponse send(Long senderUserId, SendGroupMessageRequest request) {
        User sender = userRepository.findById(senderUserId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        ChatGroup group = requireGroup(request.getGroupId());
        requireActiveMember(group.getId(), sender.getId());
        List<ChatGroupMember> members = chatGroupMemberRepository.findByGroupIdAndLeftAtIsNull(group.getId());
        if (members.size() > MAX_MEMBERS) {
            throw new RuntimeException("Nhóm vượt giới hạn thành viên");
        }

        Instant now = Instant.now();
        UUID messageId = Uuids.timeBased();
        String preview = request.getMessageType() == 0 ? request.getContent() : "[Hình ảnh/File]";
        if (preview.length() > 250) {
            preview = preview.substring(0, 250) + "...";
        }

        for (ChatGroupMember member : members) {
            GroupInboxMessage inbox = GroupInboxMessage.builder()
                    .user(member.getUser())
                    .group(group)
                    .messageId(messageId)
                    .conversationId(group.getConversationId())
                    .senderId(sender.getId())
                    .content(request.getContent())
                    .messageType(request.getMessageType())
                    .createdAt(now)
                    .deliveryStatus(MessageDeliveryStatus.SENT.getCode())
                    .build();
            groupInboxMessageRepository.save(inbox);

            GroupConversation conv = groupConversationRepository.findByUserIdAndGroupId(member.getUser().getId(), group.getId())
                    .orElseGet(() -> GroupConversation.builder()
                            .user(member.getUser())
                            .group(group)
                            .conversationId(group.getConversationId())
                            .lastUpdated(now)
                            .unreadCount(0)
                            .build());
            conv.setLastUpdated(now);
            conv.setLastMessagePreview(sender.getId().equals(member.getUser().getId()) ? "Bạn: " + preview : preview);
            if (!sender.getId().equals(member.getUser().getId())) {
                conv.setUnreadCount(conv.getUnreadCount() + 1);
            }
            groupConversationRepository.save(conv);
        }

        GroupMessageResponse response = GroupMessageResponse.builder()
                .groupId(group.getId())
                .conversationId(group.getConversationId())
                .messageId(messageId)
                .senderId(sender.getId())
                .senderUsername(sender.getUsername())
                .content(request.getContent())
                .messageType(request.getMessageType())
                .createdAt(now)
                .deliveryStatus(MessageDeliveryStatus.SENT.name())
                .clientMessageId(request.getClientMessageId())
                .build();

        for (ChatGroupMember member : members) {
            if (!sender.getId().equals(member.getUser().getId())) {
                groupMessageNotifier.notifyIncomingMessage(response, member.getUser().getId());
            }
        }
        return response;
    }

    @Override
    @Transactional
    public void deleteGroup(String username, Long groupId) {
        User me = requireUser(username);
        ChatGroup group = requireGroup(groupId);
        requireOwner(me, group);

        List<ChatGroupMember> members = chatGroupMemberRepository.findByGroupIdAndLeftAtIsNull(groupId);

        groupInboxMessageRepository.deleteByGroupId(groupId);
        groupConversationRepository.deleteByGroupId(groupId);
        chatGroupMemberRepository.deleteByGroupId(groupId);
        chatGroupRepository.delete(group);

        for (ChatGroupMember member : members) {
            groupMessageNotifier.notifyGroupDeleted(groupId, member.getUser().getId());
        }
    }

    private GroupMessageResponse toMessageResponse(GroupInboxMessage message) {
        User sender = userRepository.findById(message.getSenderId())
                .orElseThrow(() -> new RuntimeException("Người gửi không tồn tại"));
        return GroupMessageResponse.builder()
                .groupId(message.getGroup().getId())
                .conversationId(message.getConversationId())
                .messageId(message.getMessageId())
                .senderId(message.getSenderId())
                .senderUsername(sender.getUsername())
                .content(message.getContent())
                .messageType(message.getMessageType())
                .createdAt(message.getCreatedAt())
                .deliveryStatus(MessageDeliveryStatus.fromCode(message.getDeliveryStatus()).name())
                .clientMessageId(null)
                .build();
    }

    private GroupInfoResponse toGroupInfo(ChatGroup group, List<ChatGroupMember> members) {
        return GroupInfoResponse.builder()
                .groupId(group.getId())
                .conversationId(group.getConversationId())
                .name(group.getName())
                .ownerUsername(group.getOwner().getUsername())
                .memberCount(members.size())
                .members(members.stream().map(m -> m.getUser().getUsername()).sorted().toList())
                .build();
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại: " + username));
    }

    private ChatGroup requireGroup(Long groupId) {
        return chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));
    }

    private ChatGroupMember requireActiveMember(Long groupId, Long userId) {
        ChatGroupMember member = chatGroupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new RuntimeException("Bạn không thuộc nhóm này"));
        if (member.getLeftAt() != null) {
            throw new RuntimeException("Bạn đã rời nhóm");
        }
        return member;
    }

    private void requireOwner(User me, ChatGroup group) {
        if (!group.getOwner().getId().equals(me.getId())) {
            throw new RuntimeException("Chỉ chủ nhóm mới được thao tác");
        }
    }
}
