/**
 * ReplySection - 댓글 답글 섹션 컴포넌트
 *
 * 기능:
 * - 대댓글 목록을 접기/펼치기로 표시
 * - 왼쪽 2px 초록 바 + 들여쓰기 디자인
 * - "답글 N개 보기" 토글
 * - depth 1만 허용 (대대댓글 없음)
 *
 * 비유: 게시판의 "답글 묶음 영역"
 * - 부모 댓글 아래에 들여쓰기된 답글들을 보여줌
 * - 처음에는 접힌 상태, 탭하면 펼쳐짐
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../styles/theme';
import { CommunityComment } from '../../types/community';
import CommentItem from './CommentItem';

interface ReplySectionProps {
  /** 답글 목록 (parent_id가 같은 댓글들) */
  replies: CommunityComment[];
  /** 현재 로그인한 사용자 ID */
  currentUserId: string | undefined;
  /** 내가 좋아요한 댓글 ID 집합 */
  myCommentLikes: Set<string>;
  /** 좋아요 핸들러 */
  onLike: (commentId: string) => void;
  /** 삭제 핸들러 */
  onDelete: (commentId: string) => void;
  /** 수정 핸들러 */
  onUpdate: (commentId: string, content: string) => void;
  /** 답글 핸들러 (부모 댓글에 대한 답글 — depth 1이므로 추가 답글 불가) */
  onReply: (parentId: string) => void;
  /** 작성자 프로필 이동 */
  onAuthorPress: (userId: string) => void;
  /** 신고 핸들러 */
  onReport?: (commentId: string) => void;
  /** 수정 중 로딩 */
  isUpdating?: boolean;
  /** 삭제 중 로딩 */
  isDeleting?: boolean;
}

export default function ReplySection({
  replies,
  currentUserId,
  myCommentLikes,
  onLike,
  onDelete,
  onUpdate,
  onReply,
  onAuthorPress,
  onReport,
  isUpdating,
  isDeleting,
}: ReplySectionProps) {
  // 접기/펼치기 상태
  const [expanded, setExpanded] = useState(false);

  // 답글이 없으면 아무것도 렌더링 안 함
  if (replies.length === 0) return null;

  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  return (
    <View style={styles.container}>
      {/* 왼쪽 초록 바 (디자인 인디케이터) */}
      <View style={styles.greenBar} />

      <View style={styles.content}>
        {/* 접기/펼치기 토글 버튼 */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={COLORS.primary}
          />
          <Text style={styles.toggleText}>
            {expanded ? '답글 접기' : `답글 ${replies.length}개 보기`}
          </Text>
        </TouchableOpacity>

        {/* 답글 목록 (펼쳐졌을 때만) */}
        {expanded && (
          <View style={styles.repliesList}>
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isLiked={myCommentLikes?.has(reply.id) ?? false}
                onLike={onLike}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onReply={onReply}
                onAuthorPress={onAuthorPress}
                onReport={onReport}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginLeft: 16,
  },
  // 왼쪽 초록색 인디케이터 바
  greenBar: {
    width: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
    marginRight: 0,
  },
  content: {
    flex: 1,
  },
  // 토글 버튼
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // 답글 목록 영역
  repliesList: {
    // CommentItem 자체에 패딩이 있으므로 추가 패딩 없음
  },
});
