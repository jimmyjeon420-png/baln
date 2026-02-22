import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SIZES } from '../../styles/theme';
import { useCommunityPosts } from '../../hooks/useCommunity';
import { useTheme } from '../../hooks/useTheme';
import { formatCommunityDisplayTag } from '../../utils/communityUtils';

/**
 * 커뮤니티 미리보기 (전체 탭 상단)
 *
 * 역할: 뉴스 속보판처럼 라운지 인기글 미리보기 부서
 * - VIP 라운지의 인기글 2개를 상단에 표시 (모든 사용자에게 공개)
 * - "전체 보기 →" 버튼으로 community/index.tsx로 이동
 *   (전체 커뮤니티 페이지에서 자산 자격 확인은 그대로 유지)
 * - 제목 + 좋아요 수만 표시 (간결한 프리뷰)
 * - 게시글 탭 시 개별 이동 없이 읽기 전용 미리보기만 제공
 *
 * 비유: 건물 1층 안내판 — 중요 소식만 보여주고, 자세한 건 전용 공간(라운지)으로 안내
 */

interface CommunityPreviewProps {
  /**
   * 사용자가 VIP 라운지 열람 자격을 갖추었는지 여부.
   * - true: "전체 보기" 버튼 → /community 로 바로 이동
   * - false: "전체 보기" 버튼 → /community 로 이동하되, 해당 페이지에서 자체 잠금 화면 표시
   * 미리보기(post 2개)는 자격과 무관하게 항상 표시됩니다.
   */
  isEligible?: boolean;
}

export default function CommunityPreview({ isEligible = true }: CommunityPreviewProps) {
  const router = useRouter();
  const { colors } = useTheme();

  // 인기순으로 최신 게시물 가져오기 (좋아요 많은 순)
  const { data, isLoading } = useCommunityPosts('all', 'popular');

  // 첫 페이지의 상위 2개만 표시
  const topPosts = data?.pages?.[0]?.slice(0, 2) ?? [];

  // 전체 보기 버튼 — 자격 여부와 무관하게 /community 로 이동
  // community/index.tsx 내부에서 자격 확인 후 잠금 화면 또는 전체 목록 표시
  const handleViewAll = () => {
    router.push('/community');
  };

  const styles = createStyles(colors);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={styles.headerTitle}>VIP 라운지</Text>
          </View>
        </View>
        <View style={styles.loadingBox}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더: 제목 + 전체보기 버튼 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>VIP 라운지</Text>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>HOT</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleViewAll} style={styles.viewAllBtn}>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>전체 보기</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 소셜 프루프 문구 — 자격 여부와 무관하게 항상 표시 */}
      <Text style={[styles.tagline, { color: colors.textSecondary }]}>
        투자 커뮤니티에서 같은 고민을 나누는 투자자들을 만나보세요
      </Text>

      {/* 인기글 미리보기 (최대 2개) — 읽기 전용, 개별 상세 이동 없음 */}
      {topPosts.length > 0 ? (
        <View style={styles.postsContainer}>
          {topPosts.map((post) => (
            <View
              key={post.id}
              style={[styles.postItem, { backgroundColor: colors.background }]}
            >
              <View style={styles.postContent}>
                <Text style={[styles.postTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {post.content.substring(0, 50)}
                  {post.content.length > 50 ? '...' : ''}
                </Text>
                <View style={styles.postMeta}>
                  <Text style={[styles.authorTag, { color: colors.textSecondary }]} numberOfLines={1}>
                    {formatCommunityDisplayTag(post.total_assets_at_post)}
                  </Text>
                  <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.likesWrap}>
                    <Ionicons name="heart" size={12} color={colors.error} />
                    <Text style={[styles.likesCount, { color: colors.error }]}>{post.likes_count || 0}</Text>
                  </View>
                  <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.commentsWrap}>
                    <Ionicons name="chatbubble" size={12} color={colors.textSecondary} />
                    <Text style={[styles.commentsCount, { color: colors.textSecondary }]}>{post.comments_count || 0}</Text>
                  </View>
                </View>
              </View>
              {/* 자격 있으면 잠금 해제 아이콘, 없으면 자물쇠 아이콘 */}
              <Ionicons
                name={isEligible ? 'chevron-forward' : 'lock-closed-outline'}
                size={16}
                color={colors.textTertiary}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>아직 게시물이 없습니다</Text>
        </View>
      )}

      {/* 자격 미달일 때 — 전체 보기 유도 문구 */}
      {!isEligible && topPosts.length > 0 && (
        <TouchableOpacity style={styles.unlockRow} onPress={handleViewAll} activeOpacity={0.7}>
          <Ionicons name="lock-open-outline" size={14} color={colors.primary} />
          <Text style={[styles.unlockText, { color: colors.primary }]}>
            자산 100만원 이상이면 참여할 수 있어요
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: SIZES.rXl,
      padding: SIZES.lg,
      marginBottom: SIZES.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SIZES.xs,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
    },
    newBadge: {
      backgroundColor: '#CF6679',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    newBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    viewAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewAllText: {
      fontSize: 14,
      fontWeight: '600',
    },
    tagline: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: SIZES.md,
    },
    postsContainer: {
      gap: SIZES.sm,
    },
    postItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: SIZES.rMd,
      padding: SIZES.md,
      gap: SIZES.sm,
    },
    postContent: {
      flex: 1,
      gap: 6,
    },
    postTitle: {
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 21,
    },
    postMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    authorTag: {
      fontSize: 12,
      flex: 1,
    },
    metaDivider: {
      width: 1,
      height: 10,
      opacity: 0.3,
    },
    likesWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    likesCount: {
      fontSize: 12,
      fontWeight: '600',
    },
    commentsWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    commentsCount: {
      fontSize: 12,
      fontWeight: '600',
    },
    loadingBox: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
    },
    emptyBox: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
    },
    unlockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: SIZES.sm,
    },
    unlockText: {
      fontSize: 13,
      fontWeight: '500',
    },
  });
}
