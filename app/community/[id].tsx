/**
 * 게시물 상세 + 댓글 화면
 *
 * 기능:
 * - 게시물 원본 (보유종목 포함)
 * - 좋아요 토글 (유저당 1회)
 * - 댓글 목록
 * - 댓글 작성 (1,000만원+ 전용, 미만 시 안내 표시)
 * - 작성자 아바타 탭 → 프로필 페이지
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useCommunityPost,
  usePostComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
  useMyCommentLikes,
  useLikePost,
  useMyLikes,
  useLoungeEligibility,
} from '../../src/hooks/useCommunity';
import {
  CommunityComment,
  HoldingSnapshot,
  TIER_COLORS,
  CATEGORY_INFO,
  LOUNGE_COMMENT_THRESHOLD,
} from '../../src/types/community';
import {
  getTierFromAssets,
  getTierIcon,
  HOLDING_TYPE_COLORS,
  getRelativeTime,
} from '../../src/utils/communityUtils';
import CommentItem from '../../src/components/community/CommentItem';
import ReplySection from '../../src/components/community/ReplySection';
import ReportModal from '../../src/components/community/ReportModal';
import { useAuth } from '../../src/context/AuthContext';
import { useMyBookmarks, useToggleBookmark } from '../../src/hooks/useBookmarks';
import { validateContent, getViolationMessage } from '../../src/services/contentFilter';
import { useTheme } from '../../src/hooks/useTheme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);

  // 자격 확인 (댓글 가능 여부)
  const { eligibility } = useLoungeEligibility();

  // 게시물 상세
  const { data: post, isLoading: postLoading, refetch: refetchPost } = useCommunityPost(id || '');

  // 댓글 목록
  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = usePostComments(id || '');

  // 댓글 작성
  const createComment = useCreateComment(id || '');

  // 댓글 수정/삭제
  const updateComment = useUpdateComment(id || '');
  const deleteComment = useDeleteComment(id || '');

  // 댓글 좋아요
  const likeComment = useLikeComment(id || '');
  const { data: myCommentLikes } = useMyCommentLikes();

  // 게시글 좋아요
  const likePost = useLikePost();
  const { data: myLikes } = useMyLikes();
  const isLiked = myLikes?.has(id || '') ?? false;

  // 북마크
  const { data: myBookmarks } = useMyBookmarks();
  const toggleBookmark = useToggleBookmark();
  const isBookmarked = myBookmarks?.has(id || '') ?? false;

  // 새로고침
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPost(), refetchComments()]);
    setRefreshing(false);
  }, [refetchPost, refetchComments]);

  // 작성자 프로필로 이동
  const handleAuthorPress = (userId: string) => {
    router.push(`/community/author/${userId}` as any);
  };

  // 신고 버튼
  const handleReport = (type: 'post' | 'comment', targetId: string) => {
    setReportTarget({ type, id: targetId });
    setReportModalVisible(true);
  };

  // 대댓글 모드로 전환
  const handleReply = (parentId: string) => {
    setReplyToId(parentId);
    const parentComment = comments?.find((c) => c.id === parentId);
    if (parentComment) {
      const tier = getTierFromAssets(parentComment.total_assets_at_comment);
      setCommentText(`@${tier} 회원 `);
    }
  };

  // 대댓글 모드 취소
  const handleCancelReply = () => {
    setReplyToId(null);
    setCommentText('');
  };

  // 댓글 작성 핸들러
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (commentText.length > 300) {
      Alert.alert('알림', '댓글은 300자 이내로 작성해주세요.');
      return;
    }

    // 콘텐츠 필터링
    const filterResult = validateContent(commentText.trim());
    if (!filterResult.isValid) {
      Alert.alert(
        '부적절한 콘텐츠 감지',
        getViolationMessage(filterResult),
      );
      return;
    }

    if (!eligibility.canComment) {
      Alert.alert(
        '댓글 작성 제한',
        `댓글 작성은 자산 1,000만원 이상 회원만 가능합니다.\n\n현재 자산: ${(eligibility.totalAssets / 10000).toFixed(0)}만원`,
      );
      return;
    }

    try {
      const commentTier = getTierFromAssets(eligibility.totalAssets);
      await createComment.mutateAsync({
        content: commentText.trim(),
        displayTag: `${commentTier} 회원`,
        totalAssets: eligibility.totalAssets,
        parentId: replyToId || undefined,
      });
      setCommentText('');
      setReplyToId(null);
    } catch (error: any) {
      console.warn('[Community] 댓글 작성 실패:', error);
      const errorMsg = error?.message || error?.code || '알 수 없는 오류';
      Alert.alert('오류', `댓글 등록에 실패했습니다.\n\n상세: ${errorMsg}`);
    }
  };

  // 댓글 수정 핸들러
  const handleUpdateComment = (commentId: string, content: string) => {
    updateComment.mutate({ commentId, content });
  };

  // 댓글 삭제 핸들러
  const handleDeleteComment = (commentId: string) => {
    deleteComment.mutate(commentId);
  };

  // 댓글 좋아요 핸들러
  const handleLikeComment = (commentId: string) => {
    likeComment.mutate(commentId);
  };

  // ── 댓글 아이템 (최상위 + 답글 섹션) ──
  const renderComment = ({ item }: { item: CommunityComment }) => {
    const replies = comments?.filter((c) => c.parent_id === item.id) || [];

    return (
      <>
        {/* 최상위 댓글 */}
        <CommentItem
          comment={item}
          currentUserId={user?.id}
          isLiked={myCommentLikes?.has(item.id) ?? false}
          onLike={handleLikeComment}
          onDelete={handleDeleteComment}
          onUpdate={handleUpdateComment}
          onReply={handleReply}
          onAuthorPress={handleAuthorPress}
          onReport={(commentId) => handleReport('comment', commentId)}
          isUpdating={updateComment.isPending}
          isDeleting={deleteComment.isPending}
        />

        {/* 답글 섹션 (접기/펼치기 + 초록 바 디자인) */}
        <ReplySection
          replies={replies}
          currentUserId={user?.id}
          myCommentLikes={myCommentLikes ?? new Set()}
          onLike={handleLikeComment}
          onDelete={handleDeleteComment}
          onUpdate={handleUpdateComment}
          onReply={handleReply}
          onAuthorPress={handleAuthorPress}
          onReport={(commentId) => handleReport('comment', commentId)}
          isUpdating={updateComment.isPending}
          isDeleting={deleteComment.isPending}
        />
      </>
    );
  };

  // 로딩
  if (postLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // 게시물 없음
  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>게시물</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>게시물을 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tier = getTierFromAssets(post.total_assets_at_post);
  const tierColor = TIER_COLORS[tier] || '#C0C0C0';
  const tierIcon = getTierIcon(tier);
  const categoryInfo = post.category ? CATEGORY_INFO[post.category] : null;
  const holdings = (post.top_holdings || []).slice(0, 5);

  // ── 게시물 헤더 (FlatList ListHeaderComponent) ──
  const renderHeader = () => (
    <View>
      <View style={[styles.postContainer, { backgroundColor: colors.surface }]}>
        {/* 작성자 정보 */}
        <View style={styles.postHeader}>
          <View style={styles.postUserInfo}>
            <TouchableOpacity
              style={[styles.postTierBadge, { backgroundColor: tierColor }]}
              onPress={() => handleAuthorPress(post.user_id)}
            >
              <Ionicons name={tierIcon} size={16} color="#000000" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={styles.postTagRow}>
                <TouchableOpacity onPress={() => handleAuthorPress(post.user_id)}>
                  <Text style={[styles.postDisplayTag, { color: tierColor }]}>
                    {post.display_tag}
                  </Text>
                </TouchableOpacity>
                {categoryInfo && (
                  <View style={[styles.postCategoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
                    <Ionicons name={categoryInfo.icon as any} size={10} color={categoryInfo.color} />
                    <Text style={[styles.postCategoryLabel, { color: categoryInfo.color }]}>
                      {categoryInfo.label}
                    </Text>
                  </View>
                )}
              </View>
              {post.asset_mix ? (
                <Text style={[styles.postAssetMix, { color: colors.textTertiary }]}>{post.asset_mix}</Text>
              ) : null}
            </View>
          </View>
          <Text style={[styles.postTime, { color: colors.textTertiary }]}>{getRelativeTime(post.created_at)}</Text>
        </View>

        {/* 보유종목 칩 */}
        {holdings.length > 0 && (
          <View style={styles.holdingsSection}>
            <Text style={[styles.holdingsLabel, { color: colors.textTertiary }]}>보유종목</Text>
            <View style={styles.holdingsRow}>
              {holdings.map((h: HoldingSnapshot, idx: number) => (
                <View
                  key={`${h.ticker}-${idx}`}
                  style={[
                    styles.holdingChip,
                    { borderColor: (HOLDING_TYPE_COLORS[h.type] || colors.textTertiary) + '40', backgroundColor: colors.surfaceLight },
                  ]}
                >
                  <View style={[
                    styles.holdingDot,
                    { backgroundColor: HOLDING_TYPE_COLORS[h.type] || colors.textTertiary },
                  ]} />
                  <Text style={[styles.holdingTicker, { color: colors.textSecondary }]}>{h.ticker}</Text>
                  <Text style={[styles.holdingName, { color: colors.textTertiary }]}>{h.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 본문 */}
        <Text style={[styles.postContent, { color: colors.textPrimary }]}>{post.content}</Text>

        {/* 첨부 이미지 갤러리 */}
        {post.image_urls && post.image_urls.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageGallery}
            contentContainerStyle={styles.imageGalleryContent}
          >
            {post.image_urls.map((url, index) => (
              <TouchableOpacity
                key={index}
                style={styles.imageItem}
                onPress={() => {
                  Alert.alert('이미지', `이미지 ${index + 1}/${post.image_urls!.length}`);
                }}
              >
                <Image
                  source={{ uri: url }}
                  style={[styles.postImage, { backgroundColor: colors.surface }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 좋아요 + 댓글 수 */}
        <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.postActionButton}
            onPress={() => likePost.mutate(post.id)}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? colors.error : colors.textTertiary}
            />
            <Text style={[styles.postActionText, { color: colors.textTertiary }, isLiked && { color: colors.error }]}>
              {post.likes_count || 0}
            </Text>
          </TouchableOpacity>

          <View style={styles.postActionButton}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
            <Text style={[styles.postActionText, { color: colors.textTertiary }]}>{post.comments_count || 0}</Text>
          </View>

          {/* 북마크 */}
          <TouchableOpacity
            style={styles.postActionButton}
            onPress={() => toggleBookmark.mutate(post.id)}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isBookmarked ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.postActionText, { color: colors.textTertiary }, isBookmarked && { color: colors.primary }]}>
              {isBookmarked ? '저장됨' : '저장'}
            </Text>
          </TouchableOpacity>

          {/* 프로필 보기 */}
          <TouchableOpacity
            style={styles.postActionButton}
            onPress={() => handleAuthorPress(post.user_id)}
          >
            <Ionicons name="person-outline" size={18} color={colors.textTertiary} />
            <Text style={[styles.postActionText, { color: colors.textTertiary }]}>프로필</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 댓글 섹션 헤더 */}
      <View style={styles.commentsHeader}>
        <Text style={[styles.commentsTitle, { color: colors.textPrimary }]}>
          댓글 {comments?.length || 0}
        </Text>
      </View>

      {commentsLoading && (
        <View style={styles.commentsLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {!commentsLoading && (!comments || comments.length === 0) && (
        <View style={styles.emptyComments}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyCommentsText, { color: colors.textTertiary }]}>첫 번째 댓글을 남겨보세요!</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>게시물</Text>
          {post && (
            <TouchableOpacity onPress={() => handleReport('post', post.id)}>
              <Ionicons name="ellipsis-vertical" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          {!post && <View style={{ width: 28 }} />}
        </View>

        {/* 댓글 목록 (최상위 댓글만 -- 대댓글은 각 아이템 내에서 렌더링) */}
        <FlatList
          data={comments?.filter((c) => !c.parent_id) || []}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}

          windowSize={10}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          initialNumToRender={10}

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />

        {/* 하단: 댓글 입력 or 제한 안내 */}
        {eligibility.canComment ? (
          <View style={[styles.commentInputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            {/* 대댓글 모드 헤더 */}
            {replyToId && (
              <View style={styles.replyModeHeader}>
                <Ionicons name="return-down-forward" size={14} color={colors.primary} />
                <Text style={[styles.replyModeText, { color: colors.primary }]}>답글 작성 중</Text>
                <TouchableOpacity onPress={handleCancelReply} style={styles.replyModeCancel}>
                  <Ionicons name="close" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={[styles.commentInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]}
                placeholder={replyToId ? "답글을 입력하세요..." : "댓글을 입력하세요..."}
                placeholderTextColor={colors.textTertiary}
                maxLength={300}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.commentSendButton,
                  { backgroundColor: colors.primary, opacity: commentText.trim() ? 1 : 0.4 },
                ]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || createComment.isPending}
              >
                {createComment.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.commentLockedBar, { borderTopColor: colors.border, backgroundColor: colors.warning + '10' }]}>
            <Ionicons name="lock-closed" size={16} color={colors.warning} />
            <Text style={[styles.commentLockedText, { color: colors.warning }]}>
              댓글 작성은 자산 1,000만원 이상 회원만 가능합니다
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* 신고 모달 */}
      {reportTarget && (
        <ReportModal
          visible={reportModalVisible}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          onClose={() => {
            setReportModalVisible(false);
            setReportTarget(null);
          }}
          onSuccess={() => {
            // 신고 완료 시 추가 작업 (선택)
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 16,
  },

  // ── 게시물 원본 ──
  postContainer: {
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  postTierBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  postDisplayTag: {
    fontSize: 15,
    fontWeight: '700',
  },
  postCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  postCategoryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  postAssetMix: {
    fontSize: 12,
    marginTop: 2,
  },
  postTime: {
    fontSize: 12,
  },

  // ── 보유종목 ──
  holdingsSection: {
    marginBottom: 12,
  },
  holdingsLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  holdingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  holdingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  holdingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  holdingTicker: {
    fontSize: 12,
    fontWeight: '700',
  },
  holdingName: {
    fontSize: 11,
  },

  // ── 본문 + 푸터 ──
  postContent: {
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 16,
  },
  // ── 이미지 갤러리 ──
  imageGallery: {
    marginBottom: 16,
    marginHorizontal: -16, // 컨테이너 패딩 무시
  },
  imageGalleryContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  imageItem: {
    marginRight: 10,
  },
  postImage: {
    width: Dimensions.get('window').width * 0.7, // 화면 너비의 70%
    height: 240,
    borderRadius: 12,
  },
  postFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  postActionText: {
    fontSize: 14,
  },

  // ── 댓글 섹션 ──
  commentsHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  commentsLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyCommentsText: {
    fontSize: 14,
  },


  // ── 댓글 입력 ──
  commentInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  replyModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  replyModeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  replyModeCancel: {
    padding: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  commentSendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── 댓글 잠금 안내바 ──
  commentLockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  commentLockedText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
