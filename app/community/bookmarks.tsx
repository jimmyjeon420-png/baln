/**
 * 내 북마크 목록 화면
 *
 * 비유: "즐겨찾기 서랍 열어보기"
 * - 북마크한 게시글을 최신순으로 표시
 * - 게시글 탭 → 상세 화면 이동
 * - 스와이프 또는 버튼으로 북마크 해제
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarkedPosts, useMyBookmarks, useToggleBookmark } from '../../src/hooks/useBookmarks';
import { useMyLikes, useLikePost } from '../../src/hooks/useCommunity';
import { CommunityPost, TIER_COLORS, CATEGORY_INFO } from '../../src/types/community';
import { getTierFromAssets, getTierIcon, getRelativeTime } from '../../src/utils/communityUtils';
import { useTheme } from '../../src/hooks/useTheme';

export default function BookmarksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: posts, isLoading, isError, refetch } = useBookmarkedPosts();
  const { data: myLikes } = useMyLikes();
  const { data: myBookmarks } = useMyBookmarks();
  const likePost = useLikePost();
  const toggleBookmark = useToggleBookmark();

  // 새로고침
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // 게시글 카드 렌더링
  const renderPost = ({ item }: { item: CommunityPost }) => {
    const tier = getTierFromAssets(item.total_assets_at_post);
    const tierColor = TIER_COLORS[tier] || '#C0C0C0';
    const tierIcon = getTierIcon(tier);
    const isLiked = myLikes?.has(item.id) ?? false;
    const isBookmarked = myBookmarks?.has(item.id) ?? false;
    const categoryInfo = item.category ? CATEGORY_INFO[item.category] : null;

    return (
      <TouchableOpacity
        style={[styles.postCard, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/community/${item.id}` as any)}
        activeOpacity={0.7}
      >
        {/* 헤더: 작성자 + 카테고리 + 시간 */}
        <View style={styles.postHeader}>
          <View style={styles.postUserRow}>
            <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
              <Ionicons name={tierIcon} size={10} color={colors.background} />
            </View>
            <Text style={[styles.displayTag, { color: tierColor }]}>
              {item.display_tag}
            </Text>
            {categoryInfo && (
              <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
                <Text style={[styles.categoryLabel, { color: categoryInfo.color }]}>
                  {categoryInfo.label}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.timeText, { color: colors.textTertiary }]}>{getRelativeTime(item.created_at)}</Text>
        </View>

        {/* 본문 미리보기 */}
        <Text style={[styles.contentPreview, { color: colors.textPrimary }]} numberOfLines={3}>
          {item.content}
        </Text>

        {/* 푸터: 좋아요 + 댓글 + 북마크 */}
        <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => likePost.mutate(item.id)}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={isLiked ? colors.sell : colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: colors.textSecondary }, isLiked && { color: colors.sell }]}>
              {item.likes_count || 0}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>{item.comments_count || 0}</Text>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => toggleBookmark.mutate(item.id)}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isBookmarked ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>내 북마크</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 로딩 */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* 에러 */}
      {!isLoading && isError && (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textQuaternary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>불러오기 실패</Text>
          <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
            네트워크 연결을 확인하고{'\n'}아래로 당겨서 새로고침해주세요
          </Text>
        </View>
      )}

      {/* 목록 */}
      {!isLoading && !isError && (
        <FlatList
          data={posts || []}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bookmark-outline" size={48} color={colors.textQuaternary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>북마크가 없습니다</Text>
              <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
                게시글에서 북마크 아이콘을 탭하면{'\n'}여기에 저장됩니다
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // 게시글 카드
  postCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tierBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
  },
  contentPreview: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 12,
  },

  // 빈 상태
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
