/**
 * 게시물 상세 + 댓글 화면
 *
 * 기능:
 * - 게시물 원본 (보유종목 포함)
 * - 좋아요 토글 (유저당 1회)
 * - 댓글 목록
 * - 댓글 작성 (자산 기준 미달 시 안내 표시)
 * - 작성자 아바타 탭 → 프로필 페이지
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  useDeletePost,
  useLikeComment,
  useMyCommentLikes,
  useLikePost,
  useMyLikes,
  useLoungeEligibility,
  useBestAnswer,
  useSelectBestAnswer,
} from '../../src/hooks/useCommunity';
import {
  CommunityComment,
  HoldingSnapshot,
  TIER_COLORS,
  CATEGORY_INFO,
  LOUNGE_COMMENT_THRESHOLD,
} from '../../src/types/community';
import {
  formatAssetAmount,
  getTierFromAssets,
  getTierIcon,
  HOLDING_TYPE_COLORS,
  getRelativeTime,
  isBeginnerQuestion,
  stripBeginnerQuestionPrefix,
  formatCommunityDisplayTag,
  buildCommunityAssetMixFromHoldings,
  getCommunityHoldingLabel,
  getCommunityHoldingRatio,
  formatPortfolioRatio,
} from '../../src/utils/communityUtils';
import CommentItem from '../../src/components/community/CommentItem';
import ReplySection from '../../src/components/community/ReplySection';
import ReportModal from '../../src/components/community/ReportModal';
import GuruCommentBubble from '../../src/components/community/GuruCommentBubble';
import type { GuruComment } from '../../src/types/guruComment';
import { useAuth } from '../../src/context/AuthContext';
import { useMyBookmarks, useToggleBookmark } from '../../src/hooks/useBookmarks';
import { useGuruComments } from '../../src/hooks/useGuruComments';
import { generateGuruCommentsForPost } from '../../src/services/guruCommentService';
import { validateContent, getViolationMessage } from '../../src/services/contentFilter';
import { useTheme } from '../../src/hooks/useTheme';
import { t } from '../../src/locales';

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
  const commentRequirementLabel = formatAssetAmount(LOUNGE_COMMENT_THRESHOLD);

  // 게시물 상세
  const { data: post, isLoading: postLoading, refetch: refetchPost } = useCommunityPost(id || '');

  // 댓글 목록
  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = usePostComments(id || '');

  // 베스트 답변
  const { data: bestAnswer } = useBestAnswer(id || '');
  const selectBestAnswer = useSelectBestAnswer(id || '');

  // 댓글 작성
  const createComment = useCreateComment(id || '');

  // 댓글 수정/삭제
  const updateComment = useUpdateComment(id || '');
  const deleteComment = useDeleteComment(id || '');

  // 게시글 삭제
  const deletePost = useDeletePost();

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

  // 구루 AI 댓글
  const { data: guruComments, isLoading: guruCommentsLoading, refetch: refetchGuruComments } = useGuruComments(id || '');

  // 기존 게시글에 구루 댓글이 없으면 자동 생성 (1회만, 10~30초 딜레이)
  const guruGenAttempted = useRef(false);
  useEffect(() => {
    if (
      !guruGenAttempted.current &&
      !guruCommentsLoading &&
      guruComments !== undefined &&
      guruComments.length === 0 &&
      post?.id &&
      post.content &&
      post.category
    ) {
      guruGenAttempted.current = true;
      const delayMs = 10000 + Math.random() * 20000; // 10~30초
      const timer = setTimeout(() => {
        generateGuruCommentsForPost(post.id, post.content, post.category)
          .then(() => setTimeout(() => refetchGuruComments(), 4000))
          .catch(() => {});
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [guruComments, guruCommentsLoading, post, refetchGuruComments]);

  // 삭제 중인 댓글 ID 추적 (개별 로딩 상태)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // ── 통합 피드: 유저 댓글 + 구루 댓글을 시간순 정렬 ──
  type FeedItem =
    | { type: 'user_comment'; data: CommunityComment }
    | { type: 'guru_comment'; data: GuruComment };

  const integratedFeed = useMemo<FeedItem[]>(() => {
    const topLevelComments = (comments?.filter(c => !c.parent_id) || [])
      .map(c => ({ type: 'user_comment' as const, data: c }));

    // 구루 댓글: reply_to_guru_id가 없는 것들은 독립, 있는 것들은 부모 뒤에 삽입
    const independentGuru: FeedItem[] = [];
    const replyGuru: FeedItem[] = [];
    (guruComments || []).forEach(gc => {
      if (gc.reply_to_guru_id) {
        replyGuru.push({ type: 'guru_comment', data: gc });
      } else {
        independentGuru.push({ type: 'guru_comment', data: gc });
      }
    });

    // 시간순 통합 정렬
    const allItems: FeedItem[] = [...topLevelComments, ...independentGuru];
    allItems.sort((a, b) => {
      const aTime = new Date(a.data.created_at).getTime();
      const bTime = new Date(b.data.created_at).getTime();
      return aTime - bTime;
    });

    // reply_to_guru_id가 있는 댓글은 부모 구루 댓글 바로 뒤에 삽입
    const result: FeedItem[] = [];
    for (const item of allItems) {
      result.push(item);
      if (item.type === 'guru_comment') {
        const parentGuruId = (item.data as GuruComment).guru_id;
        const replies = replyGuru.filter(
          r => (r.data as GuruComment).reply_to_guru_id === parentGuruId
        );
        result.push(...replies);
      }
    }

    return result;
  }, [comments, guruComments]);

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

  // 게시글 삭제 확인
  const handleDeletePost = () => {
    Alert.alert(t('community.detail.delete_post_title'), t('community.detail.confirm_delete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost.mutateAsync(post!.id);
            // 삭제 성공 → 즉시 라운지로 이동 후 알림
            router.replace('/(tabs)/lounge');
            Alert.alert(t('community.detail.delete_complete'), t('community.detail.post_deleted'));
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('community.detail.delete_failed'));
          }
        },
      },
    ]);
  };

  // 게시물 메뉴 (삭제 + 신고)
  const handlePostMenu = () => {
    if (!post) return;
    const isOwner = post.user_id === user?.id;
    const buttons: any[] = [];
    if (isOwner) {
      buttons.push({ text: t('common.delete'), style: 'destructive', onPress: handleDeletePost });
    }
    buttons.push({ text: t('community.detail.report'), onPress: () => handleReport('post', post.id) });
    buttons.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(t('community.detail.post_menu'), undefined, buttons);
  };

  // 대댓글 모드로 전환
  const handleReply = (parentId: string) => {
    setReplyToId(parentId);
    const parentComment = comments?.find((c) => c.id === parentId);
    if (parentComment) {
      const tier = getTierFromAssets(parentComment.total_assets_at_comment);
      setCommentText(`@${tier} ${t('community.detail.member')} `);
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
      Alert.alert(t('common.notice'), t('community.detail.comment_max_length'));
      return;
    }

    // 콘텐츠 필터링
    const filterResult = validateContent(commentText.trim());
    if (!filterResult.isValid) {
      Alert.alert(
        t('community.detail.inappropriate_content'),
        getViolationMessage(filterResult),
      );
      return;
    }

    if (!eligibility.canComment) {
      Alert.alert(
        t('community.detail.comment_restricted_title'),
        t('community.detail.comment_restricted_msg', { requirement: commentRequirementLabel, current: formatAssetAmount(eligibility.totalAssets) }),
      );
      return;
    }

    try {
      const commentTier = getTierFromAssets(eligibility.totalAssets);
      await createComment.mutateAsync({
        content: commentText.trim(),
        displayTag: `${commentTier} ${t('community.detail.member')}`,
        totalAssets: eligibility.totalAssets,
        parentId: replyToId || undefined,
      });
      setCommentText('');
      setReplyToId(null);
    } catch (error: any) {
      console.warn('[Community] 댓글 작성 실패:', error);
      const errorMsg = error?.message || error?.code || t('common.unknown_error');
      Alert.alert(t('common.error'), t('community.detail.comment_submit_failed', { detail: errorMsg }));
    }
  };

  // 댓글 수정 핸들러
  const handleUpdateComment = (commentId: string, content: string) => {
    updateComment.mutate({ commentId, content });
  };

  // 댓글 삭제 핸들러 (개별 로딩 상태 추적)
  const handleDeleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      await deleteComment.mutateAsync(commentId);
    } catch (error: any) {
      const errorMsg = error?.message || t('community.detail.comment_delete_failed');
      Alert.alert(t('common.error'), errorMsg);
    } finally {
      setDeletingCommentId(null);
    }
  };

  // 댓글 좋아요 핸들러
  const handleLikeComment = (commentId: string) => {
    likeComment.mutate(commentId);
  };

  const handleSelectBestAnswer = (commentId: string) => {
    if (!post || post.user_id !== user?.id) return;
    Alert.alert(
      t('community.detail.best_answer_title'),
      t('community.detail.best_answer_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('community.detail.select'),
          onPress: () => {
            selectBestAnswer.mutate(commentId, {
              onSuccess: () => Alert.alert(t('common.complete'), t('community.detail.best_answer_selected')),
              onError: (err: any) => Alert.alert(t('common.error'), err?.message || t('community.detail.best_answer_failed')),
            });
          },
        },
      ],
    );
  };

  // ── 통합 피드 아이템 렌더 (유저 댓글 + 구루 댓글) ──
  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'guru_comment') {
      const gc = item.data as GuruComment;
      return (
        <GuruCommentBubble
          key={gc.id}
          guruId={gc.guru_id}
          content={gc.content}
          contentEn={gc.content_en}
          sentiment={gc.sentiment}
          createdAt={gc.created_at}
          replyToGuruId={gc.reply_to_guru_id}
        />
      );
    }

    // 유저 댓글
    const comment = item.data as CommunityComment;
    const replies = comments?.filter((c) => c.parent_id === comment.id) || [];

    return (
      <>
        <CommentItem
          comment={comment}
          currentUserId={user?.id}
          isLiked={myCommentLikes?.has(comment.id) ?? false}
          isBestAnswer={bestAnswer?.comment_id === comment.id}
          canSelectBest={post?.user_id === user?.id}
          onSelectBest={handleSelectBestAnswer}
          isSelectingBest={selectBestAnswer.isPending}
          onLike={handleLikeComment}
          onDelete={handleDeleteComment}
          onUpdate={handleUpdateComment}
          onReply={handleReply}
          onAuthorPress={handleAuthorPress}
          onReport={(commentId) => handleReport('comment', commentId)}
          isUpdating={updateComment.isPending}
          isDeleting={deletingCommentId === comment.id}
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
          deletingCommentId={deletingCommentId}
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('community.detail.post')}</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{t('community.detail.post_not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tier = getTierFromAssets(post.total_assets_at_post);
  const tierColor = TIER_COLORS[tier] || '#C0C0C0';
  const tierIcon = getTierIcon(tier);
  const categoryInfo = post.category ? CATEGORY_INFO[post.category] : null;
  const allHoldings = post.top_holdings || [];
  const holdings = allHoldings.slice(0, 5);
  const displayTag = formatCommunityDisplayTag(post.total_assets_at_post);
  const assetMixText = buildCommunityAssetMixFromHoldings(allHoldings, post.total_assets_at_post);
  const beginnerQuestion = isBeginnerQuestion(post.content);
  const displayPostContent = stripBeginnerQuestionPrefix(post.content);
  const bestAnswerComment = comments?.find((comment) => comment.id === bestAnswer?.comment_id) ?? null;

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
                    {displayTag}
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
                {beginnerQuestion && (
                  <View style={[styles.beginnerBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="help-circle" size={10} color={colors.primary} />
                    <Text style={[styles.beginnerBadgeText, { color: colors.primary }]}>{t('community.detail.beginner_question')}</Text>
                  </View>
                )}
                {/* 자산 인증 뱃지 */}
                {(post as any).is_author_verified && (
                  <Text style={{ fontSize: 12 }}>✅</Text>
                )}
              </View>
              {assetMixText ? (
                <Text style={[styles.postAssetMix, { color: colors.textTertiary }]}>{assetMixText}</Text>
              ) : null}
            </View>
          </View>
          <Text style={[styles.postTime, { color: colors.textTertiary }]}>{getRelativeTime(post.created_at)}</Text>
        </View>

        {/* 보유종목 칩 */}
        {holdings.length > 0 && (
          <View style={styles.holdingsSection}>
            <Text style={[styles.holdingsLabel, { color: colors.textTertiary }]}>{t('community.detail.holdings')}</Text>
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
                  <Text style={[styles.holdingTicker, { color: colors.textSecondary }]}>
                    {getCommunityHoldingLabel(h)}
                  </Text>
                  <Text style={[styles.holdingRatio, { color: colors.textTertiary }]}>
                    {formatPortfolioRatio(getCommunityHoldingRatio(h.value, post.total_assets_at_post, allHoldings))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 본문 */}
        <Text style={[styles.postContent, { color: colors.textPrimary }]}>{displayPostContent}</Text>

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
                  Alert.alert(t('community.detail.image'), `${t('community.detail.image')} ${index + 1}/${post.image_urls!.length}`);
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
              {isBookmarked ? t('community.detail.saved') : t('community.detail.save')}
            </Text>
          </TouchableOpacity>

          {/* 프로필 보기 */}
          <TouchableOpacity
            style={styles.postActionButton}
            onPress={() => handleAuthorPress(post.user_id)}
          >
            <Ionicons name="person-outline" size={18} color={colors.textTertiary} />
            <Text style={[styles.postActionText, { color: colors.textTertiary }]}>{t('community.detail.profile')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 댓글 섹션 헤더 + 구루 로딩 인라인 표시 */}
      <View style={styles.commentsHeader}>
        <Text style={[styles.commentsTitle, { color: colors.textPrimary }]}>
          {t('community.detail.comments')} {(comments?.length || 0) + (guruComments?.length || 0)}
        </Text>
        {guruCommentsLoading && (
          <View style={styles.guruThinkingInline}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.guruThinkingText, { color: colors.textTertiary }]}>
              {t('community.detail.guru_thinking')}
            </Text>
          </View>
        )}
      </View>

      {bestAnswerComment && (
        <View style={[styles.bestAnswerHighlight, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <View style={styles.bestAnswerTitleRow}>
            <Ionicons name="ribbon" size={14} color={colors.primary} />
            <Text style={[styles.bestAnswerTitle, { color: colors.primary }]}>{t('community.detail.best_answer')}</Text>
          </View>
          <Text style={[styles.bestAnswerPreview, { color: colors.textPrimary }]} numberOfLines={2}>
            {bestAnswerComment.content}
          </Text>
        </View>
      )}

      {commentsLoading && (
        <View style={styles.commentsLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {!commentsLoading && (!comments || comments.length === 0) && (
        <View style={styles.emptyComments}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyCommentsText, { color: colors.textTertiary }]}>{t('community.detail.first_comment')}</Text>
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('community.detail.post')}</Text>
          {post && (
            <TouchableOpacity onPress={handlePostMenu} disabled={deletePost.isPending}>
              {deletePost.isPending ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Ionicons name="ellipsis-vertical" size={24} color={colors.textTertiary} />
              )}
            </TouchableOpacity>
          )}
          {!post && <View style={{ width: 28 }} />}
        </View>

        {/* 댓글 목록 (유저 댓글 + 구루 댓글 시간순 통합) */}
        <FlatList
          data={integratedFeed}
          keyExtractor={(item) => item.data.id}
          renderItem={renderFeedItem}
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
                <Text style={[styles.replyModeText, { color: colors.primary }]}>{t('community.detail.replying')}</Text>
                <TouchableOpacity onPress={handleCancelReply} style={styles.replyModeCancel}>
                  <Ionicons name="close" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={[styles.commentInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]}
                placeholder={replyToId ? t('community.detail.reply_placeholder') : t('community.detail.comment_placeholder')}
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
              {t('community.detail.comment_locked', { requirement: commentRequirementLabel })}
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
  beginnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  beginnerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
  holdingRatio: {
    fontSize: 11,
    fontWeight: '700',
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

  // ── 구루 로딩 인라인 (댓글 헤더 옆) ──
  guruThinkingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  guruThinkingText: {
    fontSize: 12,
  },

  // ── 댓글 섹션 ──
  commentsHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bestAnswerHighlight: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  bestAnswerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bestAnswerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  bestAnswerPreview: {
    fontSize: 14,
    lineHeight: 20,
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
