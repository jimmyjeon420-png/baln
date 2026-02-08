import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../../styles/theme';
import { useCommunityPosts } from '../../hooks/useCommunity';

/**
 * 커뮤니티 미리보기 (전체 탭 상단)
 *
 * 역할: 뉴스 속보판처럼 라운지 인기글 미리보기 부서
 * - VIP 라운지의 인기글 2개를 상단에 표시
 * - "라운지 전체 보기 →" 버튼으로 lounge.tsx로 이동
 * - 제목 + 좋아요 수만 표시 (간결한 프리뷰)
 *
 * 비유: 건물 1층 안내판 — 중요 소식만 보여주고, 자세한 건 전용 공간(라운지)으로 안내
 */

export default function CommunityPreview() {
  const router = useRouter();

  // 인기순으로 최신 게시물 가져오기 (좋아요 많은 순)
  const { data, isLoading } = useCommunityPosts('all', 'popular');

  // 첫 페이지의 상위 2개만 표시
  const topPosts = data?.pages?.[0]?.slice(0, 2) ?? [];

  // 전체 보기 버튼
  const handleViewAll = () => {
    router.push('/(tabs)/lounge');
  };

  // 게시물 상세 페이지로 이동
  const handlePostPress = (postId: string) => {
    router.push(`/community/${postId}`);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="people" size={20} color={COLORS.primary} />
            <Text style={styles.headerTitle}>VIP 라운지</Text>
          </View>
        </View>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더: 제목 + 전체보기 버튼 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>VIP 라운지</Text>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>HOT</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleViewAll} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>전체 보기</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* 인기글 미리보기 (최대 2개) */}
      {topPosts.length > 0 ? (
        <View style={styles.postsContainer}>
          {topPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postItem}
              onPress={() => handlePostPress(post.id)}
              activeOpacity={0.7}
            >
              <View style={styles.postContent}>
                <Text style={styles.postTitle} numberOfLines={1}>
                  {post.content.substring(0, 50)}
                  {post.content.length > 50 ? '...' : ''}
                </Text>
                <View style={styles.postMeta}>
                  <Text style={styles.authorTag} numberOfLines={1}>
                    {post.display_tag}
                  </Text>
                  <View style={styles.metaDivider} />
                  <View style={styles.likesWrap}>
                    <Ionicons name="heart" size={12} color={COLORS.error} />
                    <Text style={styles.likesCount}>{post.likes_count || 0}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.commentsWrap}>
                    <Ionicons name="chatbubble" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.commentsCount}>{post.comments_count || 0}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>아직 게시물이 없습니다</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  newBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  postsContainer: {
    gap: SIZES.sm,
  },
  postItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.rMd,
    padding: SIZES.md,
    gap: SIZES.sm,
  },
  postContent: {
    flex: 1,
    gap: 6,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorTag: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: COLORS.border,
    opacity: 0.3,
  },
  likesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesCount: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.error,
  },
  commentsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentsCount: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
