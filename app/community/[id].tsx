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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useCommunityPost,
  usePostComments,
  useCreateComment,
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

// ── 유틸 함수 ──

const getTierFromAssets = (assets: number): string => {
  if (assets >= 1000000000) return 'DIAMOND';
  if (assets >= 500000000) return 'PLATINUM';
  if (assets >= 150000000) return 'GOLD';
  if (assets >= 10000000) return 'SILVER';
  return 'SILVER';
};

const getTierIcon = (tier: string): keyof typeof Ionicons.glyphMap => {
  switch (tier) {
    case 'DIAMOND': return 'diamond';
    case 'PLATINUM': return 'star';
    case 'GOLD': return 'trophy';
    case 'SILVER': return 'medal';
    default: return 'ribbon';
  }
};

const HOLDING_TYPE_COLORS: Record<string, string> = {
  stock: '#4CAF50',
  crypto: '#F7931A',
  realestate: '#2196F3',
  other: '#888888',
};

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [commentText, setCommentText] = useState('');

  // 자격 확인 (댓글 가능 여부)
  const { eligibility } = useLoungeEligibility();

  // 게시물 상세
  const { data: post, isLoading: postLoading, refetch: refetchPost } = useCommunityPost(id || '');

  // 댓글 목록
  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = usePostComments(id || '');

  // 댓글 작성
  const createComment = useCreateComment(id || '');

  // 좋아요
  const likePost = useLikePost();
  const { data: myLikes } = useMyLikes();
  const isLiked = myLikes?.has(id || '') ?? false;

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

  // 댓글 작성 핸들러
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (commentText.length > 300) {
      Alert.alert('알림', '댓글은 300자 이내로 작성해주세요.');
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
      });
      setCommentText('');
    } catch (error) {
      console.error('Comment creation error:', error);
      Alert.alert('오류', '댓글 등록에 실패했습니다.');
    }
  };

  // ── 댓글 아이템 ──
  const renderComment = ({ item }: { item: CommunityComment }) => {
    const tier = getTierFromAssets(item.total_assets_at_comment);
    const tierColor = TIER_COLORS[tier] || '#C0C0C0';
    const tierIcon = getTierIcon(tier);

    return (
      <View style={styles.commentItem}>
        <TouchableOpacity
          style={[styles.commentTierBadge, { backgroundColor: tierColor }]}
          onPress={() => handleAuthorPress(item.user_id)}
        >
          <Ionicons name={tierIcon} size={10} color="#000000" />
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <TouchableOpacity onPress={() => handleAuthorPress(item.user_id)}>
              <Text style={[styles.commentDisplayTag, { color: tierColor }]}>
                {item.display_tag}
              </Text>
            </TouchableOpacity>
            <Text style={styles.commentTime}>{getRelativeTime(item.created_at)}</Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  // 로딩
  if (postLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  // 게시물 없음
  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시물</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#666666" />
          <Text style={styles.emptyText}>게시물을 찾을 수 없습니다</Text>
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
      <View style={styles.postContainer}>
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
                <Text style={styles.postAssetMix}>{post.asset_mix}</Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.postTime}>{getRelativeTime(post.created_at)}</Text>
        </View>

        {/* 보유종목 칩 */}
        {holdings.length > 0 && (
          <View style={styles.holdingsSection}>
            <Text style={styles.holdingsLabel}>보유종목</Text>
            <View style={styles.holdingsRow}>
              {holdings.map((h: HoldingSnapshot, idx: number) => (
                <View
                  key={`${h.ticker}-${idx}`}
                  style={[
                    styles.holdingChip,
                    { borderColor: (HOLDING_TYPE_COLORS[h.type] || '#888') + '40' },
                  ]}
                >
                  <View style={[
                    styles.holdingDot,
                    { backgroundColor: HOLDING_TYPE_COLORS[h.type] || '#888' },
                  ]} />
                  <Text style={styles.holdingTicker}>{h.ticker}</Text>
                  <Text style={styles.holdingName}>{h.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 본문 */}
        <Text style={styles.postContent}>{post.content}</Text>

        {/* 좋아요 + 댓글 수 */}
        <View style={styles.postFooter}>
          <TouchableOpacity
            style={styles.postActionButton}
            onPress={() => likePost.mutate(post.id)}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? '#CF6679' : '#888888'}
            />
            <Text style={[styles.postActionText, isLiked && { color: '#CF6679' }]}>
              {post.likes_count || 0}
            </Text>
          </TouchableOpacity>

          <View style={styles.postActionButton}>
            <Ionicons name="chatbubble-outline" size={18} color="#888888" />
            <Text style={styles.postActionText}>{post.comments_count || 0}</Text>
          </View>

          {/* 프로필 보기 */}
          <TouchableOpacity
            style={styles.postActionButton}
            onPress={() => handleAuthorPress(post.user_id)}
          >
            <Ionicons name="person-outline" size={18} color="#888888" />
            <Text style={styles.postActionText}>프로필</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 댓글 섹션 헤더 */}
      <View style={styles.commentsHeader}>
        <Text style={styles.commentsTitle}>
          댓글 {comments?.length || 0}
        </Text>
      </View>

      {commentsLoading && (
        <View style={styles.commentsLoading}>
          <ActivityIndicator size="small" color="#4CAF50" />
        </View>
      )}

      {!commentsLoading && (!comments || comments.length === 0) && (
        <View style={styles.emptyComments}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#444444" />
          <Text style={styles.emptyCommentsText}>첫 번째 댓글을 남겨보세요!</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시물</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* 댓글 목록 */}
        <FlatList
          data={comments || []}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4CAF50"
            />
          }
        />

        {/* 하단: 댓글 입력 or 제한 안내 */}
        {eligibility.canComment ? (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="댓글을 입력하세요..."
              placeholderTextColor="#666666"
              maxLength={300}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.commentSendButton,
                { opacity: commentText.trim() ? 1 : 0.4 },
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
        ) : (
          <View style={styles.commentLockedBar}>
            <Ionicons name="lock-closed" size={16} color="#FFC107" />
            <Text style={styles.commentLockedText}>
              댓글 작성은 자산 1,000만원 이상 회원만 가능합니다
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 16,
  },

  // ── 게시물 원본 ──
  postContainer: {
    backgroundColor: '#1E1E1E',
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
    fontSize: 14,
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
    fontSize: 10,
    fontWeight: '600',
  },
  postAssetMix: {
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
  postTime: {
    fontSize: 11,
    color: '#666666',
  },

  // ── 보유종목 ──
  holdingsSection: {
    marginBottom: 12,
  },
  holdingsLabel: {
    fontSize: 11,
    color: '#777',
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
    backgroundColor: '#161616',
  },
  holdingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  holdingTicker: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CCC',
  },
  holdingName: {
    fontSize: 10,
    color: '#888',
  },

  // ── 본문 + 푸터 ──
  postContent: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 16,
  },
  postFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  postActionText: {
    fontSize: 13,
    color: '#888888',
  },

  // ── 댓글 섹션 ──
  commentsHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  commentsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontSize: 13,
    color: '#666666',
  },

  // ── 댓글 아이템 ──
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  commentTierBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentDisplayTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 10,
    color: '#666666',
  },
  commentText: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 20,
  },

  // ── 댓글 입력 ──
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    backgroundColor: '#1E1E1E',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  commentSendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4CAF50',
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
    borderTopColor: '#2A2A2A',
    backgroundColor: '#1A1A0E',
  },
  commentLockedText: {
    fontSize: 13,
    color: '#FFC107',
    fontWeight: '500',
  },
});
