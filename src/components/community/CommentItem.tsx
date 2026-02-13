/**
 * CommentItem - 댓글/대댓글 아이템 컴포넌트
 *
 * 기능:
 * - 댓글 표시 (티어 배지 + 내용)
 * - 대댓글 들여쓰기
 * - 댓글 좋아요
 * - 수정/삭제 (본인 것만)
 * - 답글 버튼 (대댓글 작성)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommunityComment, TIER_COLORS } from '../../types/community';
import { getTierFromAssets, getTierIcon, getRelativeTime } from '../../utils/communityUtils';
import { useTheme } from '../../hooks/useTheme';

interface CommentItemProps {
  comment: CommunityComment;
  currentUserId: string | undefined;
  isLiked: boolean;
  onLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onUpdate: (commentId: string, content: string) => void;
  onReply: (parentId: string) => void;
  onAuthorPress: (userId: string) => void;
  onReport?: (commentId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export default function CommentItem({
  comment,
  currentUserId,
  isLiked,
  onLike,
  onDelete,
  onUpdate,
  onReply,
  onAuthorPress,
  onReport,
  isUpdating = false,
  isDeleting = false,
}: CommentItemProps) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isMyComment = currentUserId === comment.user_id;
  const isReply = !!comment.parent_id;

  const tier = getTierFromAssets(comment.total_assets_at_comment);
  const tierColor = TIER_COLORS[tier] || '#C0C0C0';
  const tierIcon = getTierIcon(tier);

  // 수정 완료
  const handleSaveEdit = () => {
    if (!editContent.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }
    if (editContent.trim() === comment.content) {
      setIsEditing(false);
      return;
    }
    onUpdate(comment.id, editContent.trim());
    setIsEditing(false);
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  // 삭제 확인
  const handleDelete = () => {
    Alert.alert(
      '댓글 삭제',
      '정말 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }, isReply && [styles.containerReply, { backgroundColor: colors.background + '80' }]]}>
      {/* 대댓글 인디케이터 */}
      {isReply && (
        <View style={styles.replyIndicator}>
          <Ionicons name="return-down-forward" size={14} color={colors.textSecondary} />
        </View>
      )}

      {/* 티어 배지 */}
      <TouchableOpacity
        style={[styles.tierBadge, { backgroundColor: tierColor }]}
        onPress={() => onAuthorPress(comment.user_id)}
      >
        <Ionicons name={tierIcon} size={10} color="#000000" />
      </TouchableOpacity>

      {/* 댓글 내용 */}
      <View style={styles.content}>
        {/* 헤더: 작성자 + 시간 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onAuthorPress(comment.user_id)}>
            <Text style={[styles.displayTag, { color: tierColor }]}>
              {comment.display_tag}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.time, { color: colors.textSecondary }]}>{getRelativeTime(comment.created_at)}</Text>
          {comment.updated_at && (
            <Text style={[styles.edited, { color: colors.textSecondary }]}>(수정됨)</Text>
          )}
        </View>

        {/* 본문 (수정 모드 / 일반 모드) */}
        {isEditing ? (
          <View style={styles.editBox}>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              maxLength={300}
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.surface }]}
                onPress={handleCancelEdit}
              >
                <Text style={[styles.editButtonTextCancel, { color: colors.textPrimary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.editButtonTextSave}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={[styles.text, { color: colors.textPrimary }]}>{comment.content}</Text>
        )}

        {/* 액션 버튼 */}
        {!isEditing && (
          <View style={styles.actions}>
            {/* 좋아요 */}
            <TouchableOpacity style={styles.actionButton} onPress={() => onLike(comment.id)}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={16}
                color={isLiked ? '#CF6679' : colors.textSecondary}
              />
              <Text style={[styles.actionText, { color: colors.textSecondary }, isLiked && { color: '#CF6679' }]}>
                {comment.likes_count || 0}
              </Text>
            </TouchableOpacity>

            {/* 답글 (최상위 댓글에만) */}
            {!isReply && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onReply(comment.id)}
              >
                <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>답글</Text>
              </TouchableOpacity>
            )}

            {/* 수정 (본인 것만) */}
            {isMyComment && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>수정</Text>
              </TouchableOpacity>
            )}

            {/* 삭제 (본인 것만) */}
            {isMyComment && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={[styles.actionText, { color: colors.error }]}>삭제</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* 신고 (다른 사람 댓글에만) */}
            {!isMyComment && onReport && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onReport(comment.id)}
              >
                <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>신고</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  containerReply: {
    paddingLeft: 46,
  },
  replyIndicator: {
    position: 'absolute',
    left: 26,
    top: 14,
  },
  tierBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  displayTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  time: {
    fontSize: 10,
  },
  edited: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },

  // ── 수정 모드 ──
  editBox: {
    marginBottom: 8,
    gap: 8,
  },
  editInput: {
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 60,
    lineHeight: 20,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonTextCancel: {
    fontSize: 13,
    fontWeight: '600',
  },
  editButtonTextSave: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },

  // ── 액션 버튼 ──
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 12,
  },
});
